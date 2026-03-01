const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Đăng ký
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu cần ít nhất 6 ký tự' });
  }

  const db = getDB();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email này đã được đăng ký rồi' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')"
  ).run(name, email, hashedPassword);

  const token = jwt.sign(
    { id: result.lastInsertRowid, email, role: 'user', name },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, name, email, role: 'user' },
  });
});

// Đăng nhập
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
  }

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
  });
});

// Lấy thông tin user hiện tại
router.get('/me', authenticateToken, (req, res) => {
  const db = getDB();
  const user = db.prepare(
    'SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json(user);
});

module.exports = router;
