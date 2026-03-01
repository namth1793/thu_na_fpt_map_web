const express = require('express');
const { getDB, updatePlaceRating } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Lấy review của một địa điểm
router.get('/place/:placeId', optionalAuth, (req, res) => {
  const { sort = 'recent', page = 1, limit = 10 } = req.query;
  const db = getDB();

  const sortMap = {
    recent: 'r.created_at DESC',
    helpful: 'r.helpful_votes DESC',
    rating_high: 'r.rating DESC',
    rating_low: 'r.rating ASC',
  };

  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.place_id = ?
    ORDER BY ${sortMap[sort] || sortMap.recent}
    LIMIT ? OFFSET ?
  `).all(req.params.placeId, parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const getImages = db.prepare('SELECT image_url FROM review_images WHERE review_id = ?');

  const result = reviews.map(r => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    images: getImages.all(r.id).map(i => i.image_url),
    user_voted: req.user
      ? !!db.prepare('SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?').get(r.id, req.user.id)
      : false,
  }));

  const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE place_id = ?').get(req.params.placeId);
  res.json({ reviews: result, total: total.count });
});

// Thống kê rating của địa điểm
router.get('/place/:placeId/stats', (req, res) => {
  const db = getDB();

  const stats = db.prepare(`
    SELECT rating, COUNT(*) as count
    FROM reviews WHERE place_id = ?
    GROUP BY rating ORDER BY rating DESC
  `).all(req.params.placeId);

  const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE place_id = ?').get(req.params.placeId);
  const avg = db.prepare('SELECT AVG(rating) as avg FROM reviews WHERE place_id = ?').get(req.params.placeId);

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  stats.forEach(s => { distribution[s.rating] = s.count; });

  res.json({ distribution, total: total.count, average: Math.round((avg.avg || 0) * 10) / 10 });
});

// Viết review
router.post('/', authenticateToken, upload.array('images', 5), (req, res) => {
  const { place_id, rating, title, content, tags } = req.body;

  if (!place_id || !rating) {
    return res.status(400).json({ error: 'Cần có địa điểm và số sao đánh giá' });
  }
  if (parseInt(rating) < 1 || parseInt(rating) > 5) {
    return res.status(400).json({ error: 'Số sao phải từ 1 đến 5' });
  }

  const db = getDB();

  const place = db.prepare('SELECT id FROM places WHERE id = ? AND is_active = 1').get(place_id);
  if (!place) return res.status(404).json({ error: 'Không tìm thấy địa điểm' });

  const existing = db.prepare('SELECT id FROM reviews WHERE place_id = ? AND user_id = ?').get(place_id, req.user.id);
  if (existing) {
    return res.status(400).json({ error: 'Bạn đã đánh giá địa điểm này rồi!' });
  }

  let tagsJson = '[]';
  try {
    tagsJson = typeof tags === 'string' ? tags : JSON.stringify(tags || []);
    JSON.parse(tagsJson);
  } catch {
    tagsJson = '[]';
  }

  const result = db.prepare(`
    INSERT INTO reviews (place_id, user_id, rating, title, content, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(place_id, req.user.id, parseInt(rating), title || null, content || null, tagsJson);

  const reviewId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertImg = db.prepare('INSERT INTO review_images (review_id, image_url) VALUES (?, ?)');
    req.files.forEach(f => insertImg.run(reviewId, `/uploads/${f.filename}`));
  }

  updatePlaceRating(db, place_id);

  const review = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?
  `).get(reviewId);

  const images = db.prepare('SELECT image_url FROM review_images WHERE review_id = ?').all(reviewId);

  res.status(201).json({
    ...review,
    tags: JSON.parse(review.tags || '[]'),
    images: images.map(i => i.image_url),
  });
});

// Vote hữu ích
router.post('/:id/vote', authenticateToken, (req, res) => {
  const db = getDB();
  const reviewId = req.params.id;

  const existing = db.prepare(
    'SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?'
  ).get(reviewId, req.user.id);

  if (existing) {
    db.prepare('DELETE FROM review_votes WHERE review_id = ? AND user_id = ?').run(reviewId, req.user.id);
    db.prepare('UPDATE reviews SET helpful_votes = MAX(0, helpful_votes - 1) WHERE id = ?').run(reviewId);
    res.json({ voted: false });
  } else {
    db.prepare('INSERT INTO review_votes (review_id, user_id) VALUES (?, ?)').run(reviewId, req.user.id);
    db.prepare('UPDATE reviews SET helpful_votes = helpful_votes + 1 WHERE id = ?').run(reviewId);
    res.json({ voted: true });
  }
});

// Xoá review
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Không tìm thấy review' });

  if (review.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền xoá review này' });
  }

  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  updatePlaceRating(db, review.place_id);
  res.json({ message: 'Đã xoá review' });
});

module.exports = router;
