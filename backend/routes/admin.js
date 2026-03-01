const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Thống kê tổng quan
router.get('/stats', authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();

  res.json({
    totalPlaces: db.prepare("SELECT COUNT(*) as c FROM places WHERE is_active = 1").get().c,
    totalReviews: db.prepare("SELECT COUNT(*) as c FROM reviews").get().c,
    totalUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get().c,
    avgRating: Math.round((db.prepare("SELECT AVG(avg_rating) as a FROM places WHERE is_active = 1 AND total_reviews > 0").get().a || 0) * 10) / 10,
    recentPlaces: db.prepare(`
      SELECT p.*, pt.name as type_name, pt.color as type_color
      FROM places p LEFT JOIN place_types pt ON p.type_id = pt.id
      ORDER BY p.created_at DESC LIMIT 5
    `).all(),
    recentReviews: db.prepare(`
      SELECT r.*, u.name as user_name, p.name as place_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN places p ON r.place_id = p.id
      ORDER BY r.created_at DESC LIMIT 5
    `).all(),
    placesByType: db.prepare(`
      SELECT pt.name, pt.color, COUNT(p.id) as count
      FROM place_types pt
      LEFT JOIN places p ON p.type_id = pt.id AND p.is_active = 1
      GROUP BY pt.id ORDER BY count DESC
    `).all(),
  });
});

// Tất cả địa điểm (kể cả đã ẩn)
router.get('/places', authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  res.json(db.prepare(`
    SELECT p.*, pt.name as type_name, pt.color as type_color
    FROM places p LEFT JOIN place_types pt ON p.type_id = pt.id
    ORDER BY p.created_at DESC
  `).all());
});

// Tất cả review
router.get('/reviews', authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, p.name as place_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    JOIN places p ON r.place_id = p.id
    ORDER BY r.created_at DESC
  `).all();
  res.json(reviews.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
});

// Tất cả người dùng
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  res.json(db.prepare(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all());
});

module.exports = router;
