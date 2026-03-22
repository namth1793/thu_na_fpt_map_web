const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { getDB } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

const TYPE_NAME_MAP = {
  'sống ảo': 1, 'check-in': 1, 'checkin': 1, 'chụp ảnh': 1,
  'karaoke': 2, 'hát': 2,
  'thể thao': 3, 'sport': 3, 'bóng đá': 3,
  'cafe': 4, 'chill': 4, 'cafe & chill': 4, 'cà phê': 4,
  'xem phim': 5, 'phim': 5, 'cinema': 5, 'rạp': 5,
  'ăn uống': 6, 'ăn': 6, 'food': 6, 'nhà hàng': 6, 'quán ăn': 6,
  'giải trí': 7, 'game': 7, 'gaming': 7,
  'mua sắm': 8, 'shopping': 8, 'chợ': 8,
};

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

// Import địa điểm từ Excel
router.post('/import-excel', authenticateToken, requireAdmin, excelUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Chưa chọn file Excel' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'File Excel không có dữ liệu' });

    const db = getDB();
    const imported = [];
    const skipped = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2;
      const name = String(row.name || row['Tên'] || row['ten'] || '').trim();
      const lat = parseFloat(row.lat || row['Vĩ độ'] || row['vi_do'] || 0);
      const lng = parseFloat(row.lng || row['Kinh độ'] || row['kinh_do'] || 0);

      if (!name || !lat || !lng || isNaN(lat) || isNaN(lng)) {
        skipped.push({ row: rowNum, name: name || '(trống)', reason: 'Thiếu tên, lat hoặc lng' });
        return;
      }

      const distance = haversineDistance(FPT_LAT, FPT_LNG, lat, lng);
      if (distance > MAX_RADIUS_KM) {
        skipped.push({ row: rowNum, name, reason: `Ngoài bán kính ${MAX_RADIUS_KM}km (${distance.toFixed(1)}km từ FPT)` });
        return;
      }

      let type_id = parseInt(row.type_id || row['Loại ID'] || 0);
      if (!type_id || type_id < 1 || type_id > 8) {
        const typeName = String(row.type_name || row['Loại'] || row['loai'] || '').toLowerCase().trim();
        type_id = TYPE_NAME_MAP[typeName] || 1;
      }

      const address = String(row.address || row['Địa chỉ'] || row['dia_chi'] || '').trim() || null;
      const phone = String(row.phone || row['Điện thoại'] || row['dien_thoai'] || '').trim() || null;
      const hours = String(row.hours || row['Giờ mở cửa'] || row['gio_mo_cua'] || '').trim() || null;
      const description = String(row.description || row['Mô tả'] || row['mo_ta'] || '').trim() || null;

      try {
        db.prepare(`
          INSERT INTO places (name, type_id, lat, lng, address, phone, hours, description, distance_from_fpt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(name, type_id, lat, lng, address, phone, hours, description, distance);
        imported.push(name);
      } catch (err) {
        skipped.push({ row: rowNum, name, reason: err.message });
      }
    });

    res.json({ imported: imported.length, skipped, total: rows.length });
  } catch (err) {
    res.status(400).json({ error: 'Không thể đọc file Excel: ' + err.message });
  }
});

module.exports = router;
