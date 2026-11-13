const Admin = require("../models/Admin");

async function getSummary(_req, res, next) {
  try {
    return res.json({ summary: await Admin.getDashboardSummary() });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getSummary };
