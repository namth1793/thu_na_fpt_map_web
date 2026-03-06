const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Chỉ chấp nhận ảnh JPEG, PNG và WebP'));
};

let upload;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  // Production: dùng Cloudinary để lưu ảnh lâu dài
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'thuna-map',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
  // Local dev: lưu vào thư mục uploads/
  const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
}

// Helper: lấy URL để lưu vào DB
// - Cloudinary: trả về secure_url (https://res.cloudinary.com/...)
// - Local: trả về đường dẫn tương đối /uploads/filename
function getUploadedUrl(file) {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    return file.path; // Cloudinary secure_url
  }
  return `/uploads/${file.filename}`;
}

module.exports = upload;
module.exports.getUploadedUrl = getUploadedUrl;
