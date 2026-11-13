const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authorization = req.get("authorization");
  const cookieToken = req.cookies?.admin_session;
  let token = cookieToken;

  if (authorization !== undefined) {
    const bearerMatch = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!bearerMatch) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }
    token = bearerMatch[1];
  }

  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== "string" || secret.length < 32) {
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }

  try {
    req.user = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      issuer: "arts-coaching-fees",
      audience: "arts-coaching-admin",
    });
    return next();
  } catch {
    if (authorization === undefined) res.clearCookie("admin_session", cookieOptions());
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

module.exports = { requireAuth, cookieOptions };
