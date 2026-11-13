require("dotenv").config();

const requiredEnvironment = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "FRONTEND_ORIGIN"];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
if (missingEnvironment.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const feeRoutes = require("./routes/feeRoutes");
const reportRoutes = require("./routes/reportRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: "20kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && origin !== process.env.FRONTEND_ORIGIN) {
      return res.status(403).json({ error: "Request origin is not allowed." });
    }
  }
  return next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/students", studentRoutes);

app.use((error, _req, res, _next) => {
  console.error("API request failed:", error.message);
  if (error.rollbackError) console.error("Transaction rollback failed:", error.rollbackError.message);
  if (res.headersSent) return;
  res.status(500).json({ error: "The request could not be completed. Please try again." });
});

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST;
let server;

async function startServer() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    const errorCode = typeof error.code === "string" ? ` (${error.code})` : "";
    console.error(`Database connection failed${errorCode}. Check the database environment settings.`);
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const onListening = () => {
    console.log(`Arts fee management API listening on port ${port}`);
  };
  server = host ? app.listen(port, host, onListening) : app.listen(port, onListening);

  server.on("error", (error) => {
    console.error("Could not start API server:", error.message);
    process.exitCode = 1;
  });
}

startServer().catch(() => {
  console.error("Could not start API server.");
  process.exitCode = 1;
});

async function shutdown() {
  if (!server) {
    await pool.end();
    process.exit(0);
    return;
  }
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
