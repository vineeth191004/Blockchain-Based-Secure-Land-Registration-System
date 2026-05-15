const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fabricClient = require('./fabricClient');
const { isValidUser, getOrgForUser } = require('./userOrgMap');
const nodemailer = require("nodemailer");

const router = express.Router();

/* ======================================================
   CONFIG
====================================================== */

const JWT_SECRET = process.env.JWT_SECRET || 'land-registration-jwt-secret';

// Temporary OTP Store (For Academic Use)
const otpStore = {};

// Email Transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ======================================================
   MOCK USERS
====================================================== */

const users = {
  'admin-registration': { password: 'adminpw', role: 'admin', org: 'org1', email: 'admin@gmail.com' },
  'user_portal': { password: 'portal123', role: 'user', org: 'org1', email: 'user@gmail.com' },
  'clerk1': { password: 'clerk123', role: 'clerk', org: 'org1', email: 'clerk@gmail.com' },

  'mro1': { password: 'mro123', role: 'mro', org: 'org2', email: 'mro@gmail.com' },
  'survey1': { password: 'survey123', role: 'surveyor', org: 'org2', email: 'survey@gmail.com' },

  'collector1': { password: 'collector123', role: 'collector', org: 'org3', email: 'collector@gmail.com' }
};

/* ======================================================
   JWT AUTH MIDDLEWARE
====================================================== */

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

/* ======================================================
   LOGIN → SEND OTP
====================================================== */

router.post('/login', async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (!isValidUser(username)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = users[username];

  if (password !== user.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Save OTP
  otpStore[username] = otp;

  console.log(`OTP for ${username}:`, otp);

  // Send OTP Mail
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Land Registration OTP",
    text: `Your OTP is: ${otp}`
  });

  res.json({
    success: true,
    otpRequired: true,
    message: "OTP sent to registered email"
  });

});

/* ======================================================
   VERIFY OTP
====================================================== */

router.post('/verify-otp', async (req, res) => {

  const { username, otp } = req.body;

  if (otpStore[username] != otp) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  delete otpStore[username];

  const user = users[username];

  try {
    await fabricClient.connect(username);
  } catch (err) {
    return res.status(500).json({ error: "Blockchain connection failed" });
  }

  const token = jwt.sign(
    {
      username,
      role: user.role,
      org: user.org,
      orgNumber: user.org.replace("org", "")
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    success: true,
    token,
    user: {
      username,
      role: user.role,
      org: user.org,
      orgNumber: user.org.replace("org", "")
    }
  });

});

/* ======================================================
   CURRENT USER
====================================================== */

router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/* ======================================================
   LOGOUT
====================================================== */

router.post('/logout', authenticateToken, async (req, res) => {

  await fabricClient.disconnect(req.user.username);

  res.json({
    success: true,
    message: "Logged out successfully"
  });

});

module.exports = {
  router,
  authenticateToken
};
