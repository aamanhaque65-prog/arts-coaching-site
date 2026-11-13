require("dotenv").config();

const bcrypt = require("bcryptjs");
const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const pool = require("../config/db");

function promptHiddenPassword(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("Run admin setup in an interactive terminal so the password is not echoed."));
  }
  const { emitKeypressEvents } = require("node:readline");
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(prompt);

  return new Promise((resolve, reject) => {
    let password = "";
    const finish = (error) => {
      stdin.removeListener("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };
    const onKeypress = (character, key) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Admin setup cancelled."));
      } else if (key.name === "return") {
        finish();
      } else if (key.name === "backspace") {
        password = Array.from(password).slice(0, -1).join("");
        stdout.write("\b \b");
      } else if (!key.ctrl && character) {
        password += character;
        stdout.write("*");
      }
    };
    stdin.on("keypress", onKeypress);
  });
}

async function main() {
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const email = (await terminal.question("Administrator email: ")).trim().toLowerCase();
    terminal.close();
    const password = await promptHiddenPassword("Password (minimum 12 characters): ");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 200) {
      throw new Error("Use a valid email address and a password between 12 and 200 characters.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
      `INSERT INTO admins (email, password_hash, active) VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), active = TRUE`,
      [email, passwordHash],
    );
    console.log(`Administrator account is ready for ${email}.`);
  } finally {
    terminal.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
