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

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
