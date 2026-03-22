const express = require('express');
const { getDB } = require('../config/database');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedUrl } = require('../middleware/upload');

const router = express.Router();

const FPT_LAT = 15.9765;
const FPT_LNG = 108.2634;
const MAX_RADIUS_KM = 7;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Lấy danh sách địa điểm với bộ lọc
router.get('/', optionalAuth, (req, res) => {
  const { search, type_ids, min_rating, max_distance, sorts = 'distance' } = req.query;
  const db = getDB();

  let query = `
    SELECT p.*,
      pt.name as type_name, pt.color as type_color, pt.icon as type_icon, pt.slug as type_slug,
      CASE WHEN p.avg_rating >= 4.5 AND p.total_reviews >= 15 THEN 1 ELSE 0 END as is_popular
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.address LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (type_ids) {
    const ids = type_ids.split(',').map(Number).filter(Boolean);
    if (ids.length > 0) {
      query += ` AND p.type_id IN (${ids.map(() => '?').join(',')})`;
      params.push(...ids);
    }
  }
  if (min_rating) {
    query += ' AND p.avg_rating >= ?';
    params.push(parseFloat(min_rating));
  }
  if (max_distance) {
    query += ' AND p.distance_from_fpt <= ?';
    params.push(parseFloat(max_distance));
  }

  const sortMap = {
    rating: 'p.avg_rating DESC',
    popular: 'p.total_reviews DESC',
    distance: 'p.distance_from_fpt ASC',
  };
  const sortClauses = sorts.split(',').map(s => sortMap[s.trim()]).filter(Boolean);
  query += ` ORDER BY ${sortClauses.length > 0 ? sortClauses.join(', ') : sortMap.distance}`;

  const places = db.prepare(query).all(...params);
  const getImages = db.prepare('SELECT image_url FROM place_images WHERE place_id = ? LIMIT 3');

  const result = places.map(p => ({
    ...p,
    images: getImages.all(p.id).map(i => i.image_url),
  }));

  res.json(result);
});

// Tìm kiếm gợi ý (autocomplete)
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const db = getDB();
  const results = db.prepare(`
    SELECT p.id, p.name, pt.name as type_name, pt.icon as type_icon, p.avg_rating, p.distance_from_fpt
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE p.is_active = 1 AND (p.name LIKE ? OR pt.name LIKE ?)
    LIMIT 8
  `).all(`%${q}%`, `%${q}%`);

  res.json(results);
});

// Lấy loại địa điểm
router.get('/types', (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM place_types ORDER BY id').all());
});

// Lấy địa điểm ngẫu nhiên cho vòng quay
router.get('/random', (req, res) => {
  const { count = 8, type_id } = req.query;
  const db = getDB();

  let query = `
    SELECT p.id, p.name, pt.icon as type_icon, pt.color as type_color
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (type_id) {
    query += ' AND p.type_id = ?';
    params.push(parseInt(type_id));
  }
  query += ' ORDER BY RANDOM() LIMIT ?';
  params.push(parseInt(count));

  res.json(db.prepare(query).all(...params));
});

// Lấy địa điểm đã lưu của user
router.get('/saved', authenticateToken, (req, res) => {
  const db = getDB();
  const saved = db.prepare(`
    SELECT p.*,
      pt.name as type_name, pt.color as type_color, pt.icon as type_icon, pt.slug as type_slug,
      CASE WHEN p.avg_rating >= 4.5 AND p.total_reviews >= 15 THEN 1 ELSE 0 END as is_popular
    FROM saved_places sp
    JOIN places p ON p.id = sp.place_id
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE sp.user_id = ? AND p.is_active = 1
    ORDER BY sp.created_at DESC
  `).all(req.user.id);

  const getImages = db.prepare('SELECT image_url FROM place_images WHERE place_id = ? LIMIT 3');
  res.json(saved.map(p => ({ ...p, images: getImages.all(p.id).map(i => i.image_url) })));
});

// Lưu / bỏ lưu địa điểm (toggle)
router.post('/:id/save', authenticateToken, (req, res) => {
  const db = getDB();
  const existing = db.prepare(
    'SELECT id FROM saved_places WHERE user_id = ? AND place_id = ?'
  ).get(req.user.id, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM saved_places WHERE user_id = ? AND place_id = ?')
      .run(req.user.id, req.params.id);
    res.json({ saved: false });
  } else {
    db.prepare('INSERT INTO saved_places (user_id, place_id) VALUES (?, ?)')
      .run(req.user.id, req.params.id);
    res.json({ saved: true });
  }
});

// Lấy chi tiết địa điểm
router.get('/:id', optionalAuth, (req, res) => {
  const db = getDB();
  const place = db.prepare(`
    SELECT p.*,
      pt.name as type_name, pt.color as type_color, pt.icon as type_icon, pt.slug as type_slug,
      CASE WHEN p.avg_rating >= 4.5 AND p.total_reviews >= 15 THEN 1 ELSE 0 END as is_popular
    FROM places p
    LEFT JOIN place_types pt ON p.type_id = pt.id
    WHERE p.id = ? AND p.is_active = 1
  `).get(req.params.id);

  if (!place) return res.status(404).json({ error: 'Không tìm thấy địa điểm này' });

  const images = db.prepare(
    'SELECT * FROM place_images WHERE place_id = ? ORDER BY created_at DESC'
  ).all(place.id);

  res.json({ ...place, images });
});

// Thêm địa điểm (user đã đăng nhập)
router.post('/', authenticateToken, upload.array('images', 10), (req, res) => {
  const { name, type_id, lat, lng, address, phone, hours, description } = req.body;

  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'Tên, vĩ độ và kinh độ là bắt buộc' });
  }

  const distance = haversineDistance(FPT_LAT, FPT_LNG, parseFloat(lat), parseFloat(lng));
  if (distance > MAX_RADIUS_KM) {
    return res.status(400).json({ error: `Địa điểm phải trong bán kính ${MAX_RADIUS_KM}km từ FPT` });
  }

  const db = getDB();
  const result = db.prepare(`
    INSERT INTO places (name, type_id, lat, lng, address, phone, hours, description, distance_from_fpt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type_id || null, lat, lng, address || null, phone || null, hours || null, description || null, distance);

  const placeId = result.lastInsertRowid;

  if (req.files && req.files.length > 0) {
    const insertImg = db.prepare(
      'INSERT INTO place_images (place_id, image_url, uploaded_by) VALUES (?, ?, ?)'
    );
    req.files.forEach(f => insertImg.run(placeId, getUploadedUrl(f), req.user.id));
    db.prepare('UPDATE places SET cover_image = ? WHERE id = ?')
      .run(getUploadedUrl(req.files[0]), placeId);
  }

  const newPlace = db.prepare(`
    SELECT p.*, pt.name as type_name, pt.color as type_color, pt.icon as type_icon
    FROM places p LEFT JOIN place_types pt ON p.type_id = pt.id WHERE p.id = ?
  `).get(placeId);

  res.status(201).json(newPlace);
});

// Cập nhật địa điểm (admin)
router.put('/:id', authenticateToken, requireAdmin, upload.array('images', 10), (req, res) => {
  const { name, type_id, lat, lng, address, phone, hours, description, is_active } = req.body;
  const db = getDB();

  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Không tìm thấy địa điểm' });

  const newLat = lat ? parseFloat(lat) : place.lat;
  const newLng = lng ? parseFloat(lng) : place.lng;
  const distance = haversineDistance(FPT_LAT, FPT_LNG, newLat, newLng);

  db.prepare(`
    UPDATE places SET
      name = COALESCE(?, name),
      type_id = COALESCE(?, type_id),
      lat = ?, lng = ?,
      address = COALESCE(?, address),
      phone = COALESCE(?, phone),
      hours = COALESCE(?, hours),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active),
      distance_from_fpt = ?
    WHERE id = ?
  `).run(name, type_id, newLat, newLng, address, phone, hours, description, is_active, distance, req.params.id);

  if (req.body.delete_images) {
    try {
      const toDelete = JSON.parse(req.body.delete_images);
      if (Array.isArray(toDelete) && toDelete.length > 0) {
        const delImg = db.prepare('DELETE FROM place_images WHERE place_id = ? AND image_url = ?');
        toDelete.forEach(url => delImg.run(req.params.id, url));
      }
    } catch { /* ignore invalid JSON */ }
  }

  if (req.files && req.files.length > 0) {
    const insertImg = db.prepare(
      'INSERT INTO place_images (place_id, image_url, uploaded_by) VALUES (?, ?, ?)'
    );
    req.files.forEach(f => insertImg.run(req.params.id, getUploadedUrl(f), req.user.id));
  }

  const updated = db.prepare(`
    SELECT p.*, pt.name as type_name, pt.color as type_color, pt.icon as type_icon
    FROM places p LEFT JOIN place_types pt ON p.type_id = pt.id WHERE p.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// Xoá địa điểm (admin - soft delete)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const place = db.prepare('SELECT id FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'Không tìm thấy địa điểm' });

  db.prepare('UPDATE places SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Đã xoá địa điểm thành công' });
});

module.exports = router;
