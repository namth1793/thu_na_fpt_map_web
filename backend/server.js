const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./config/database');
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());

// Kiểm tra origin có được phép không (hỗ trợ wildcard *.vercel.app và giá trị *)
function isOriginAllowed(origin) {
  if (!origin) return true; // server-to-server hoặc Postman
  for (const allowed of allowedOrigins) {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    // Hỗ trợ wildcard: *.vercel.app khớp với mọi subdomain vercel.app
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // .vercel.app
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

app.use(cors({
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Khởi tạo database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Thu Na Map API đang chạy!' });
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});

module.exports = app;
