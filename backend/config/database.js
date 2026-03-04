const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Trên Railway: set DB_PATH=/data/thuna_map.db (persistent volume)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'thuna_map.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const database = getDB();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS place_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type_id INTEGER,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT,
      phone TEXT,
      hours TEXT,
      description TEXT,
      cover_image TEXT,
      avg_rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      distance_from_fpt REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES place_types(id)
    );

    CREATE TABLE IF NOT EXISTS place_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT,
      tags TEXT DEFAULT '[]',
      helpful_votes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS review_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(review_id, user_id),
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS saved_places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      place_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
      UNIQUE(user_id, place_id)
    );
  `);

  const typeCount = database.prepare('SELECT COUNT(*) as count FROM place_types').get();
  if (typeCount.count === 0) {
    seedData(database);
  }

  console.log('Database khởi tạo thành công!');
}

function seedData(database) {
  // Loại địa điểm
  const insertType = database.prepare(
    'INSERT INTO place_types (name, slug, color, icon) VALUES (?, ?, ?, ?)'
  );
  const types = [
    ['Sống ảo / Check-in', 'checkin', '#FF6B6B', '📸'],
    ['Karaoke', 'karaoke', '#4ECDC4', '🎤'],
    ['Thể thao', 'sports', '#45B7D1', '⚽'],
    ['Cafe & Chill', 'cafe', '#96CEB4', '☕'],
    ['Xem phim', 'cinema', '#F7DC6F', '🎬'],
    ['Ăn uống', 'food', '#DDA0DD', '🍜'],
    ['Giải trí', 'entertainment', '#FFB347', '🎮'],
    ['Mua sắm', 'shopping', '#87CEEB', '🛍️'],
  ];
  types.forEach(t => insertType.run(...t));

  // Tài khoản admin
  const adminPass = bcrypt.hashSync('admin123', 10);
  database.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')"
  ).run('Admin FPT', 'admin@fpt.edu.vn', adminPass);

  // Tài khoản demo
  const userPass = bcrypt.hashSync('user123', 10);
  database.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')"
  ).run('Sinh Viên FPT', 'sinhvien@fpt.edu.vn', userPass);

  // FPT Đà Nẵng: 15.9697, 108.2603
  const insertPlace = database.prepare(`
    INSERT INTO places (name, type_id, lat, lng, address, phone, hours, description, avg_rating, total_reviews, distance_from_fpt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const places = [
    // ── Sẵn có (15 địa điểm gốc) ──────────────────────────────────────────
    ['Bãi biển Non Nước', 1, 15.9788, 108.2741, 'Bãi biển Non Nước, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 22:00', 'Bãi biển cát trắng mịn, sóng nhẹ, lý tưởng để check-in và tắm biển. Hoàng hôn ở đây đẹp lắm, hay ghé!', 4.5, 23, 2.1],
    ['Karaoke Melody Stars', 2, 15.9756, 108.2520, '45 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', '0236 3951 234', '15:00 - 01:00', 'Phòng karaoke to nhỏ đầy đủ, âm thanh chuẩn, có đồ uống phục vụ tại phòng. Giá sinh viên cực hợp lý, hay đi nhóm!', 4.2, 15, 1.8],
    ['Cafe The Dreamer', 4, 15.9712, 108.2561, '12 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', '0905 123 456', '07:00 - 23:00', 'Quán cafe yên tĩnh decor vintage, view hồ sen. Wifi nhanh, phù hợp ngồi học bài hoặc chill cuối tuần. Cà phê đá xay ngon bá cháy!', 4.7, 31, 0.8],
    ['CGV Vincom Đà Nẵng', 5, 16.0010, 108.2447, 'Vincom Plaza Đà Nẵng, 910A Ngô Quyền, Đà Nẵng', '1900 6017', '09:00 - 23:00', 'Rạp phim hiện đại có IMAX và 4DX. Nhiều suất chiếu trong ngày, vé sinh viên được ưu đãi. Popcorn ở đây ngon!', 4.4, 42, 4.5],
    ['Nhà hàng Hải Sản Biển Đông', 6, 15.9749, 108.2678, '78 Trường Sa, Ngũ Hành Sơn, Đà Nẵng', '0236 3847 123', '10:00 - 22:00', 'Hải sản tươi sống, view biển đẹp, giá phải chăng. Ghẹ rang muối và cá thu nướng ngon không kém gì ngoài Bắc!', 4.3, 28, 1.5],
    ['Sân Bóng FPT City', 3, 15.9688, 108.2625, 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng', '0905 987 654', '06:00 - 22:00', 'Sân cỏ nhân tạo ngay trong khuôn viên FPT. Đặt sân online tiện, giá ưu đãi cho SV FPT. Đèn chiếu sáng đêm ok!', 4.1, 18, 0.3],
    ['Bar Rooftop Panorama', 7, 15.9765, 108.2685, '120 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0905 456 789', '17:00 - 02:00', 'Bar tầng thượng view biển và thành phố. Cocktail sáng tạo, nhạc chill, đèn LED cực đẹp về đêm. Hay đi tối thứ 6!', 4.6, 35, 1.9],
    ['Bowling Galaxy Center', 7, 15.9820, 108.2580, '55 Lê Đức Thọ, Ngũ Hành Sơn, Đà Nẵng', '0236 3955 888', '10:00 - 23:00', 'Khu giải trí bowling + billiard + game center. Không gian rộng, mát lạnh, phù hợp cả nhóm đông. Hay đi cuối tuần!', 4.0, 22, 2.2],
    ['Quán Cơm Bà Tám', 6, 15.9680, 108.2571, '8 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', '0905 111 222', '10:30 - 21:00', 'Cơm bình dân ngon, rẻ, đúng chất Quảng Nam. Buffet cơm 35k full topping. Sinh viên FPT coi đây là nhà bếp thứ 2!', 4.8, 67, 0.5],
    ['Phòng Gym FitZone', 3, 15.9715, 108.2619, '25 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '0905 333 444', '05:30 - 23:00', 'Phòng gym đầy đủ thiết bị, PT tận tâm, có lớp yoga và zumba buổi tối. Gói tháng chỉ 200k cho SV FPT!', 4.3, 19, 0.6],
    ['Trà Sữa Gong Cha FPT', 4, 15.9705, 108.2587, 'FPT City Plaza, Ngũ Hành Sơn, Đà Nẵng', null, '08:00 - 22:30', 'Trà sữa Gong Cha ngay cổng FPT! Mỗi buổi chiều sau giờ học là tụ điểm của cả khóa. Trà oolong trân châu là đỉnh!', 4.5, 55, 0.4],
    ['Billiard Club 8 Ball', 7, 15.9740, 108.2545, '33 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', '0905 777 888', '14:00 - 00:00', 'Phòng billiard sạch sẽ, bàn mới, có ghế ngồi chờ thoải mái. 15k/frame hoặc 30k/giờ. Có cả bàn snooker!', 4.1, 14, 1.2],
    ['Minimart FPT City', 8, 15.9693, 108.2600, 'Tòa nhà FPT City Center, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 23:59', 'Minimart tiện lợi ngay trong khuôn viên. Đồ ăn sáng, snack, nước uống, đồ dùng học tập đầy đủ. Mở cả đêm nữa!', 3.9, 12, 0.1],
    ['Danh Thắng Ngũ Hành Sơn', 1, 15.9833, 108.2640, 'Núi Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng', '0236 3961 114', '07:00 - 17:30', '5 ngọn núi đá cẩm thạch với chùa, hang động và view cực đẹp. Check-in sang xịn mịn! Nên đi sáng sớm ít người hơn.', 4.7, 89, 2.5],
    ['Karaoke Blue Night', 2, 15.9800, 108.2490, '67 Nguyễn Hữu Thọ, Hải Châu, Đà Nẵng', '0905 222 333', '16:00 - 02:00', 'Karaoke phòng riêng cao cấp, âm thanh Yamaha chuẩn chuyên nghiệp. Happy hour 16-20h giảm 30%! Hay book trước cuối tuần.', 4.4, 26, 3.1],

    // ── Cafe & Đồ uống ─────────────────────────────────────────────────────
    // ID 16
    ['Phúc Long Coffee & Tea', 4, 15.9740, 108.2655, '15 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '1800 6471', '07:00 - 22:00', 'Chuỗi trà sữa và cà phê nổi tiếng, vị ổn định, giá bình dân. Trà xanh latte và sữa tươi trân châu là best-seller. Gần trường, tiện ghé buổi sáng!', 4.3, 38, 0.8],
    // ID 17
    ['The Coffee House Ngũ Hành Sơn', 4, 15.9818, 108.2578, '102 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '1800 6995', '07:00 - 22:30', 'Không gian thoáng, ánh sáng đẹp, có tầng 2 view đường. Wifi mạnh, order trên app được. Hay đến buổi sáng uống cold brew học bài!', 4.4, 29, 1.4],
    // ID 18
    ['Highlands Coffee Vincom', 4, 15.9995, 108.2443, 'Vincom Plaza Đà Nẵng, Ngô Quyền, Đà Nẵng', '1800 6241', '06:30 - 22:00', 'Highlands trong Vincom, điều hòa mát, view thoáng. Cà phê phin truyền thống ngon, bánh mì que ăn kèm ổn. Đông vào cuối tuần nên đặt chỗ trước.', 4.2, 44, 4.4],
    // ID 19
    ['Cộng Cà Phê Mỹ An', 4, 15.9860, 108.2547, '18 Phan Bội Châu, Ngũ Hành Sơn, Đà Nẵng', '0905 888 001', '07:30 - 23:00', 'Decor vintage Bắc Việt, nhạc acoustic nhẹ nhàng, cà phê cốt dừa là phải thử. Hay đi 2 người hoặc ngồi một mình đọc sách cực chill!', 4.6, 52, 2.0],
    // ID 20
    ['Cafe Góc Phố Studio', 4, 15.9730, 108.2625, '7 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', '0905 012 345', '08:00 - 22:00', 'Quán nhỏ nhưng decor siêu xinh, hay dùng chụp ảnh sống ảo. Menu cafe + sinh tố tươi, giá dễ thương. Check-in xong ngồi uống luôn cũng được!', 4.5, 23, 0.6],

    // ── Ăn uống ────────────────────────────────────────────────────────────
    // ID 21
    ['Bánh Mì Bà Lan', 6, 15.9695, 108.2521, '3 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 11:00', 'Bánh mì Đà Nẵng chuẩn vị, nhân thịt nướng + chả + rau thơm. Chỉ 15k/ổ mà no suốt sáng. Xếp hàng hơi lâu nhưng xứng đáng!', 4.6, 71, 0.8],
    // ID 22
    ['Bún Bò Huế Cô Hà', 6, 15.9758, 108.2507, '20 Trần Hưng Đạo, Ngũ Hành Sơn, Đà Nẵng', '0905 234 567', '06:30 - 11:00', 'Bún bò chuẩn vị Huế, nước dùng đậm đà, chả cua tươi. Chỉ mở buổi sáng nên phải đến sớm. Tô lớn 45k ăn no lắm!', 4.7, 58, 1.7],
    // ID 23
    ['Mì Quảng Bà Vị', 6, 15.9743, 108.2672, '5 Nguyễn Phan Vinh, Ngũ Hành Sơn, Đà Nẵng', null, '07:00 - 14:00', 'Mì Quảng đặc sản Đà Nẵng, nước nhân đậm vị, thịt gà + tôm tươi. Ăn kèm bánh tráng nướng mới đúng điệu. 35k/tô, sinh viên ăn được!', 4.5, 43, 1.2],
    // ID 24
    ['Quán Nhậu Biển Xanh', 6, 15.9673, 108.2795, '200 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0236 3999 555', '16:00 - 23:00', 'Nhậu nhẹ view biển buổi tối, hải sản tươi sống đặt theo kg. Ốc hương xào lăn và mực nướng là phải gọi. Giá hơi cao nhưng không khí chill vô đối!', 4.2, 37, 2.0],
    // ID 25
    ['Lẩu Hải Sản Trường Sa', 6, 15.9831, 108.2728, '88 Trường Sa, Ngũ Hành Sơn, Đà Nẵng', '0905 345 678', '11:00 - 22:00', 'Lẩu hải sản tươi đúng vị, nồi lớn ăn theo nhóm rất đã. Tôm hùm, ghẹ, ngao hấp sả ngon hết ý. Hay đặt bàn trước vì đông khách cuối tuần!', 4.3, 31, 2.8],
    // ID 26
    ['Cơm Gà Tam Kỳ Cô Ba', 6, 15.9800, 108.2493, '45 Hải Phòng nối dài, Ngũ Hành Sơn, Đà Nẵng', '0905 456 111', '10:00 - 21:00', 'Cơm gà kiểu Tam Kỳ, cơm vàng béo, gà xé mềm ngon. Nước chấm gừng pha đúng chuẩn. 50k/suất, ăn no mà ngon hơn cơm canteen nhiều!', 4.4, 49, 2.4],
    // ID 27
    ['Chè & Bánh Ngọt Cô Hạnh', 6, 15.9691, 108.2553, '6 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', null, '13:00 - 21:30', 'Chè đậu đỏ bánh lọc, bánh bèo, chè bắp ngon mà rẻ. 10k-20k/ly. Ăn xong học bài tinh thần tỉnh táo ngay. Quán nhỏ nhưng có bàn ngồi!', 4.6, 33, 0.5],
    // ID 28
    ['Buffet Lẩu Nướng Đà Thành', 6, 15.9838, 108.2495, '15 Lê Văn Duyệt, Ngũ Hành Sơn, Đà Nẵng', '0236 3800 999', '11:00 - 22:00', 'Buffet lẩu + nướng 149k/người, hải sản tươi không giới hạn. Hay đi nhóm từ 6-10 người cho vui. Đặt trước có ưu đãi 10% cho sinh viên!', 4.1, 27, 2.8],

    // ── Giải trí ──────────────────────────────────────────────────────────
    // ID 29
    ['Escape Room Da Nang', 7, 15.9928, 108.2490, '23 Điện Biên Phủ nhánh, Ngũ Hành Sơn, Đà Nẵng', '0905 567 890', '10:00 - 22:00', 'Trốn thoát phòng bí ẩn với 6 chủ đề khác nhau. Thích hợp chơi nhóm 3-6 người. Có phòng horror cho team thích mạo hiểm. 100k/người, đặt trước nhé!', 4.3, 20, 3.8],
    // ID 30
    ['Phòng Game Net Speed', 7, 15.9722, 108.2538, '9 Nguyễn Đình Thi, Ngũ Hành Sơn, Đà Nẵng', '0905 678 901', '07:00 - 01:00', 'Net gaming tốc độ cao, máy i7 RTX, màn hình 144Hz. 10k/giờ gói thường, 15k gói VIP ghế massage. Có bán đồ ăn vặt và nước ngay tại chỗ!', 4.0, 16, 0.8],
    // ID 31
    ['Pub & Beer Club Bờ Biển', 7, 15.9780, 108.2765, '350 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0905 789 012', '18:00 - 02:00', 'Beer club ngay mép biển, nhạc live acoustic tối 3-4-5, DJ set cuối tuần. Không khí cực thoải mái, giá bia craft từ 40k. Hay rủ cả nhóm cuối tuần!', 4.4, 41, 2.5],
    // ID 32
    ['Karaoke Lucky Star', 2, 15.9841, 108.2518, '78 Lê Đức Thọ, Ngũ Hành Sơn, Đà Nẵng', '0905 111 777', '14:00 - 02:00', 'Phòng karaoke mới, màn hình LED 4K, 10.000+ bài hát cập nhật liên tục kể cả hit mới nhất. Có phòng mini cho 3-4 người giá rẻ hơn. Gọi nước tại phòng!', 4.3, 22, 2.5],
    // ID 33
    ['Lotte Cinema Đà Nẵng', 5, 15.9900, 108.2420, 'Lotte Mart Đà Nẵng, 6 Nại Nam, Ngũ Hành Sơn, Đà Nẵng', '1900 2596', '09:00 - 23:30', 'Rạp phim Lotte sạch sẽ, âm thanh Dolby, màn hình lớn. Giá vé thứ 3 hàng tuần chỉ 45k. Bắp rang bơ ngon hơn CGV theo mình!', 4.3, 33, 4.0],

    // ── Thể thao & Sức khỏe ───────────────────────────────────────────────
    // ID 34
    ['Sân Cầu Lông Ánh Dương', 3, 15.9793, 108.2505, '30 Nguyễn Văn Linh nối dài, Ngũ Hành Sơn, Đà Nẵng', '0905 321 654', '05:30 - 22:00', '6 sân cầu lông tiêu chuẩn, đèn sáng tốt ban đêm. 30k/sân/giờ, có cho thuê vợt và cầu. Đặt lịch qua Zalo tránh hết sân giờ cao điểm!', 4.2, 17, 2.3],
    // ID 35
    ['Hồ Bơi Non Nước Beach Resort', 3, 15.9803, 108.2742, 'Non Nước Beach Resort, Ngũ Hành Sơn, Đà Nẵng', '0236 3959 888', '07:00 - 19:00', 'Hồ bơi view biển cực đẹp, nước trong xanh, có đường trượt nước. 80k/lượt cho khách ngoài. Hay đến buổi sáng sớm ít người, bơi xong ăn sáng luôn!', 4.5, 28, 2.3],
    // ID 36
    ['Yoga & Meditation Morning Glory', 3, 15.9779, 108.2594, '14 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', '0905 432 876', '06:00 - 21:00', 'Studio yoga nhỏ gọn, không khí yên tĩnh, giáo viên tận tình. Lớp buổi sáng 6h rất hay cho người muốn tỉnh táo trước giờ học. 80k/buổi, có thẻ tháng!', 4.6, 14, 0.9],
    // ID 37
    ['Sân Tennis Bãi Biển', 3, 15.9830, 108.2625, '5 Trường Sa, Ngũ Hành Sơn, Đà Nẵng', '0905 543 210', '06:00 - 21:00', '4 sân tennis tiêu chuẩn, mặt sân tốt, view biển phía xa. 50k/sân/giờ, có HLV dạy kèm theo yêu cầu. Đặt lịch sớm vào cuối tuần vì đông lắm!', 4.0, 11, 2.2],

    // ── Check-in & Sống ảo ─────────────────────────────────────────────────
    // ID 38
    ['Bãi Đá Ôm Biển Nước Mặn', 1, 15.9850, 108.2800, 'Bờ biển Nước Mặn, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 20:00', 'Bãi đá tự nhiên hoang sơ, ít người biết, sóng vỗ đá cực ảo. Check-in buổi sáng sớm ánh nắng vàng rất đẹp. Đi giày bệt thôi vì đá trơn!', 4.4, 18, 3.4],
    // ID 39
    ['Vườn Hoa Công Viên Hòa Hải', 1, 15.9848, 108.2590, 'Công viên Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 22:00', 'Công viên xanh mát, nhiều hoa đẹp theo mùa, có khu thể dục ngoài trời. Sáng sớm người già tập thể dục, chiều tối sinh viên ra hóng gió chill!', 4.1, 9, 1.7],
    // ID 40
    ['Cafe Vườn Hoa Giấy', 1, 15.9817, 108.2658, '25 Hoàng Văn Thụ, Ngũ Hành Sơn, Đà Nẵng', '0905 654 321', '08:00 - 22:00', 'Quán cafe vườn đầy hoa giấy rực rỡ, decor tự nhiên cực đẹp. Chụp ảnh ra màu rất ảo, nhiều góc check-in. Đồ uống ngon, phục vụ nhiệt tình!', 4.8, 47, 2.0],

    // ── Mua sắm ──────────────────────────────────────────────────────────
    // ID 41
    ['Lotte Mart Đà Nẵng', 8, 15.9900, 108.2420, '6 Nại Nam, Ngũ Hành Sơn, Đà Nẵng', '0236 3777 777', '08:00 - 22:00', 'Siêu thị lớn đầy đủ từ thực phẩm đến điện tử. Tầng trên có Lotte Cinema và khu ăn uống. Cuối tháng hay có sale lớn, SV hay kéo nhau đi mua đồ tiết kiệm!', 4.2, 36, 4.0],
    // ID 42
    ['Chợ Hòa Hải Truyền Thống', 8, 15.9813, 108.2543, 'Chợ Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '05:30 - 18:00', 'Chợ truyền thống gần FPT, mua rau củ, đồ ăn sáng và đồ khô rẻ hơn siêu thị nhiều. Hay đi sáng sớm thứ 7 chợ đông vui, hàng tươi ngon!', 4.0, 15, 1.9],
    // ID 43
    ['Circle K FPT City', 8, 15.9700, 108.2583, 'FPT City, Ngũ Hành Sơn, Đà Nẵng', null, '00:00 - 23:59', 'Cửa hàng tiện lợi mở 24/7 ngay cổng FPT. Mì cốc, bánh mì, nước uống, đồ ăn vặt đủ hết. Điểm tụ tập sau giờ học mua đồ nhẹ hoặc in tài liệu nhanh!', 3.8, 28, 0.2],

    // ── Cafe & Đồ uống (thêm) ─────────────────────────────────────────
    // ID 44
    ['Aha Coffee FPT', 4, 15.9708, 108.2591, 'FPT City, Ngũ Hành Sơn, Đà Nẵng', null, '06:30 - 22:30', 'Chuỗi cafe giá sinh viên cực hợp lý, menu đa dạng từ cà phê đến trà sữa. Ngay sát cổng FPT tiện ghé trước giờ học. App Aha có thể đặt trước, freeship!', 4.2, 31, 0.3],
    // ID 45
    ['Phê La Cà Phê Muối', 4, 15.9775, 108.2618, '35 Trường Sa, Ngũ Hành Sơn, Đà Nẵng', '1800 6880', '07:00 - 22:00', 'Thương hiệu cafe muối độc đáo, cà phê muối kem cheese béo ngậy thơm lừng. Không gian sang trọng decor đẹp, hay check-in. Phải thử ít nhất một lần khi đến Đà Nẵng!', 4.5, 44, 1.0],
    // ID 46
    ['Katinat Saigon Kafe', 4, 15.9998, 108.2445, 'Vincom Plaza Đà Nẵng, 910A Ngô Quyền, Đà Nẵng', '1800 2088', '07:00 - 22:00', 'Cafe Sài Gòn phong cách, trà sữa kem cheese và matcha ngon. Trong Vincom tiện kết hợp mua sắm. Không gian đẹp, ánh sáng chuẩn cho chụp ảnh sống ảo!', 4.4, 27, 4.4],
    // ID 47
    ['Mixue Ice Cream & Tea FPT', 4, 15.9705, 108.2572, '8 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', null, '08:00 - 22:30', 'Kem mút và trà sữa siêu rẻ! Kem ốc quế 10k, trà sữa 20-25k, sinh viên FPT ghé hàng ngày. Xếp hàng hơi đông giờ tan học nhưng chờ rất nhanh!', 4.3, 86, 0.5],
    // ID 48
    ['ToCoToCo Trà Sữa', 4, 15.9840, 108.2532, '56 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '1800 6820', '08:30 - 22:00', 'Trà sữa ToCoToCo vị ổn định, size lớn giá vừa phải. Trà đào cam sả và trà sữa matcha được khen nhiều. Có ghế ngồi bên trong thoải mái, wifi ok!', 4.1, 22, 2.2],
    // ID 49
    ['Dingtea FPT Area', 4, 15.9712, 108.2601, '11 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng', null, '09:00 - 22:00', 'Trà sữa Đài Loan chính thống, nổi tiếng với trân châu đường đen dẻo thơm. Size chuẩn Đài Loan to hơn các hãng khác, uống no luôn. Gọi Dingtea đen đường đá là đỉnh!', 4.2, 19, 0.2],
    // ID 50
    ['Cheese Coffee Ngũ Hành Sơn', 4, 15.9850, 108.2498, '22 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', '0905 999 111', '07:30 - 22:30', 'Cafe cheese phong cách Hà Nội, cà phê ủ lạnh nhỏ giọt vào kem cheese mịn. Không gian công nghiệp-retro, ánh đèn vàng ấm. Nên thử cold brew cheese!', 4.5, 35, 2.4],

    // ── Ăn uống (thêm) ────────────────────────────────────────────────
    // ID 51
    ['KFC Ngũ Hành Sơn', 6, 15.9821, 108.2510, '120 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '1800 6263', '09:00 - 23:00', 'Gà rán KFC chuẩn vị, phục vụ nhanh. Combo sinh viên 69k là tiết kiệm nhất. Hay đến giờ vắng 2-4h chiều không cần chờ. Giao hàng nhanh qua app KFC!', 4.0, 55, 2.0],
    // ID 52
    ['Lotteria Đà Nẵng', 6, 15.9897, 108.2435, 'Lotte Mart, 6 Nại Nam, Ngũ Hành Sơn, Đà Nẵng', '1900 2557', '09:00 - 22:00', 'Hamburger Lotteria ngay trong Lotte Mart, tiện mua sắm xong ghé ăn. Cá hồi burger và shrimp burger ngon nhất. Giá ổn cho fast food, combo đủ no!', 3.9, 33, 3.9],
    // ID 53
    ['Pizza Non Nước', 6, 15.9768, 108.2635, '60 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0236 3966 777', '11:00 - 22:00', 'Pizza đế mỏng giòn, nhân hải sản tươi đặc trưng Đà Nẵng. Có pizza Tôm Mực Cà Chua là đặc biệt. Giao hàng trong 3km, hay gọi về phòng ký túc!', 4.2, 24, 1.0],
    // ID 54
    ['Phở Bà Ngọc Truyền Thống', 6, 15.9718, 108.2556, '4 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 11:30', 'Phở bò Hà Nội chuẩn vị, nước dùng trong veo hầm xương 12 tiếng. Tái + nạm + gân ngon bá cháy, hành lá thơm. Chỉ mở sáng đến 11h30!', 4.6, 41, 0.8],
    // ID 55
    ['Bún Chả Cá Thu Sản', 6, 15.9762, 108.2543, '15 Trần Hưng Đạo, Ngũ Hành Sơn, Đà Nẵng', '0905 123 888', '06:00 - 14:00', 'Đặc sản bún chả cá Đà Nẵng, nước dùng cà chua đỏ đẹp, chả cá tươi béo ngậy. Ăn kèm rau sống và mắm ớt. Phải thử nếu lần đầu đến Đà Nẵng!', 4.7, 63, 1.7],
    // ID 56
    ['Bánh Xèo Bà Dưỡng', 6, 15.9735, 108.2528, '23 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', null, '10:00 - 21:00', 'Bánh xèo Đà Nẵng size nhỏ giòn rụm, nhân tôm thịt + giá đỗ. Cuốn bánh tráng dày với rau sống, chấm mắm nêm. Ngon nhất khu, hay bán hết sớm!', 4.8, 78, 1.2],
    // ID 57
    ['Bánh Canh Chả Cá Cô Lan', 6, 15.9778, 108.2518, '7 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', null, '06:30 - 13:00', 'Bánh canh chả cá đặc sản miền Trung, sợi bánh to dai, chả cá thơm lừng. Tô 30k ăn no sáng. Đông khách 7-9h, đến muộn có thể hết hàng!', 4.5, 47, 1.7],
    // ID 58
    ['Cháo Vịt Thanh Đa', 6, 15.9699, 108.2643, '3 Nguyễn Phan Vinh, Ngũ Hành Sơn, Đà Nẵng', '0905 456 222', '16:00 - 23:00', 'Cháo vịt nấu từ gạo lứt, vịt béo thơm, ăn kèm quẩy nóng giòn. Tối mát mẻ ra đây ăn cháo vừa ngon vừa ấm bụng. Tô đôi 60k hai người ăn vừa!', 4.4, 28, 0.4],
    // ID 59
    ['Cơm Tấm Sài Gòn Bà Hai', 6, 15.9819, 108.2541, '40 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '0905 789 333', '07:00 - 21:00', 'Cơm tấm sườn bì chả kiểu Sài Gòn, cơm dẻo thơm, sườn nướng than hoa ngon. Suất đầy đủ chỉ 40k. Mắm chua ngọt tự làm rất ngon, nước mía miễn phí!', 4.3, 39, 2.1],
    // ID 60
    ['Bánh Tráng Cuốn Thịt Heo Mẹ Hằng', 6, 15.9729, 108.2578, '11 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng', null, '10:00 - 21:30', 'Đặc sản Đà Nẵng không thể bỏ qua! Bánh tráng mỏng cuốn thịt heo luộc, tôm, rau sống, chấm mắm nêm chuẩn vị. Set 2 người 80k là đủ!', 4.7, 55, 0.6],
    // ID 61
    ['Bê Thui Cầu Mống Cô Xánh', 6, 15.9762, 108.2610, '88 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0905 321 555', '10:00 - 22:00', 'Bê thui chấm mắm nêm gừng, đặc sản hiếm có ngoài Đà Nẵng. Thịt mềm không dai, thơm không hôi. Ăn lần đầu hơi lạ nhưng ghiền ngay, phải thử!', 4.5, 36, 1.0],
    // ID 62
    ['Hủ Tiếu Nam Vang Tứ Hải', 6, 15.9793, 108.2536, '28 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 13:00', 'Hủ tiếu Nam Vang sáng sớm, nước lèo ngọt thanh, thịt bằm + tôm + trứng cút. Khách quen đến hàng ngày. Ăn sáng no rồi vào học tỉnh táo lắm!', 4.4, 22, 2.0],
    // ID 63
    ['Đồ Ăn Vặt Bà Út - Ốc & Nướng', 6, 15.9700, 108.2612, '2 Lê Văn Hiến nhánh, Ngũ Hành Sơn, Đà Nẵng', null, '17:00 - 23:00', 'Xe ốc vặt ngon nhất khu FPT! Ốc hương, ốc vú nàng, bắp nướng, trứng cút nướng giá siêu rẻ. 50k ăn no vặt 2 người. Tụ điểm SV FPT buổi tối!', 4.6, 74, 0.1],

    // ── Giải trí (thêm) ───────────────────────────────────────────────
    // ID 64
    ['VR Game Zone', 7, 15.9846, 108.2509, '12 Lê Đức Thọ, Ngũ Hành Sơn, Đà Nẵng', '0905 888 222', '10:00 - 22:00', 'Trải nghiệm thực tế ảo VR: bắn súng, đua xe, roller coaster ảo. 50k/lượt 15 phút, nhiều game hay cho cả nhóm. Hay rủ bạn bè thử các game mới nhất!', 4.1, 18, 2.4],
    // ID 65
    ['Mini Golf Bờ Biển', 7, 15.9760, 108.2755, '280 Võ Nguyên Giáp, Ngũ Hành Sơn, Đà Nẵng', '0905 777 333', '09:00 - 22:00', 'Sân golf mini 18 lỗ ngay cạnh biển, view đẹp, phù hợp hẹn hò hoặc đi nhóm. 60k/người chơi thoải mái. Chiều tối view sunset cực đẹp!', 4.2, 25, 2.0],
    // ID 66
    ['Kidzone Khu Vui Chơi Thiếu Nhi', 7, 15.9881, 108.2488, '8 Lê Đức Thọ, Ngũ Hành Sơn, Đà Nẵng', '0236 3800 111', '09:00 - 21:00', 'Khu vui chơi trong nhà, có cầu trượt, nhà banh, khu phân vai nghề nghiệp. Hay đi cùng gia đình hoặc dẫn em nhỏ. Điều hòa mát, cuối tuần đông vui!', 3.9, 14, 2.8],
    // ID 67
    ['Pool & Darts Club', 7, 15.9900, 108.2480, '3 Điện Biên Phủ nhánh, Ngũ Hành Sơn, Đà Nẵng', '0905 333 777', '15:00 - 01:00', 'Câu lạc bộ billiard + phi tiêu + bóng bàn trong nhà. Không khí chill, có bán bia và đồ ăn nhẹ. 25k/giờ bàn bida. Hay đi chiều tối với bạn bè!', 4.0, 16, 3.8],

    // ── Thể thao & Sức khỏe (thêm) ────────────────────────────────────
    // ID 68
    ['Sân Pickleball FPT City', 3, 15.9672, 108.2621, 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng', '0905 432 111', '06:00 - 21:00', 'Sân pickleball đang hot trong SV FPT! Chơi dễ hơn tennis, vui theo nhóm. 40k/sân/giờ, có cho thuê vợt 10k. Đặt lịch qua Zalo nhé!', 4.3, 12, 0.3],
    // ID 69
    ['CrossFit Da Nang', 3, 15.9735, 108.2598, '18 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng', '0905 543 888', '05:30 - 21:00', 'Box CrossFit chuyên nghiệp, huấn luyện viên chuẩn CF-L1, thiết bị đầy đủ. WOD hàng ngày đa dạng. Thể lực cải thiện rõ sau 1 tháng. Thử miễn phí buổi đầu!', 4.5, 19, 0.2],
    // ID 70
    ['Hồ Bơi Công Cộng Ngũ Hành Sơn', 3, 15.9853, 108.2558, '50 Lê Đức Thọ, Ngũ Hành Sơn, Đà Nẵng', '0236 3961 200', '05:00 - 21:00', 'Hồ bơi chuẩn 50m, nước chlorine sạch, nhiều làn bơi. 20k/lượt vào cửa, có phòng thay đồ và tủ khóa. Sáng sớm mát mẻ ít người hơn chiều!', 4.1, 26, 2.3],
    // ID 71
    ['Sân Bóng Rổ FPT City', 3, 15.9682, 108.2613, 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 22:00', 'Sân bóng rổ ngoài trời trong khuôn viên FPT, miễn phí cho SV FPT. Đèn chiếu sáng ban đêm, mặt sân nhựa mới. Chiều tối hay có anh em năm 3-4 chơi!', 4.2, 21, 0.2],

    // ── Check-in & Sống ảo (thêm) ──────────────────────────────────────
    // ID 72
    ['Bãi Biển Mỹ Khê', 1, 15.9991, 108.2792, 'Bãi biển Mỹ Khê, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 22:00', 'Bãi biển nổi tiếng nhất Đà Nẵng, top 6 bãi biển đẹp nhất châu Á. Cát trắng mịn, nước trong xanh. Sáng sớm chụp bình minh đẹp xuất sắc!', 4.8, 120, 4.2],
    // ID 73
    ['Làng Đá Mỹ Nghệ Non Nước', 1, 15.9795, 108.2680, 'Làng đá Non Nước, Ngũ Hành Sơn, Đà Nẵng', null, '07:00 - 18:00', 'Làng nghề điêu khắc đá cẩm thạch 400 năm tuổi. Xem nghệ nhân tạc tượng, mua quà lưu niệm. Góc chụp với tượng đá nghệ thuật rất đẹp!', 4.4, 57, 1.3],
    // ID 74
    ['Công Viên Đông Bắc View Núi', 1, 15.9920, 108.2610, 'Công viên Đông Bắc, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 22:00', 'Công viên lớn view nhìn về phía núi Non Nước, hoa cỏ xanh mát. Sáng sớm nhiều người chạy bộ, chiều tối chill với đèn công viên lung linh!', 4.0, 18, 2.7],
    // ID 75
    ['Ghềnh Đá Bãi Bụt', 1, 15.9960, 108.2830, 'Bãi Bụt, Sơn Trà, Đà Nẵng', null, '05:00 - 18:00', 'Ghềnh đá hoang sơ ít người biết, sóng vỗ ghềnh đá rất đẹp. Nước biển trong xanh thấy đáy, hay đến sáng sớm ánh vàng chụp ảnh nghệ!', 4.6, 32, 4.5],

    // ── Mua sắm (thêm) ────────────────────────────────────────────────
    // ID 76
    ['Co.opmart Ngũ Hành Sơn', 8, 15.9880, 108.2512, '200 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '0236 3888 666', '07:00 - 22:00', 'Siêu thị hàng Việt, giá ổn định, hay có khuyến mại cuối tuần. Hàng thực phẩm tươi sống đa dạng, đồ gia dụng đầy đủ. Thanh toán QR, tích điểm thẻ!', 4.1, 28, 2.7],
    // ID 77
    ['Guardian Pharmacy Ngũ Hành Sơn', 8, 15.9820, 108.2524, '68 Nguyễn Hữu Thọ, Ngũ Hành Sơn, Đà Nẵng', '1800 6821', '08:00 - 22:00', 'Nhà thuốc Guardian đầy đủ thuốc, mỹ phẩm, chăm sóc cá nhân. Dược sĩ tư vấn nhiệt tình. Có app Guardian mua online nhận tại store tiện lợi!', 4.0, 13, 2.0],
    // ID 78
    ['Thế Giới Di Động FPT Area', 8, 15.9780, 108.2535, '33 Nguyễn Văn Linh, Ngũ Hành Sơn, Đà Nẵng', '1800 1789', '08:00 - 21:30', 'Mua điện thoại, laptop, phụ kiện đầy đủ. Nhân viên tư vấn ok, chính sách đổi trả rõ ràng. Hay ghé mua tai nghe, cáp sạc, case điện thoại!', 4.0, 22, 2.0],
    // ID 79
    ['Pharmacity FPT City', 8, 15.9701, 108.2580, 'FPT City, Ngũ Hành Sơn, Đà Nẵng', '1800 6928', '07:00 - 23:00', 'Nhà thuốc Pharmacity gần cổng FPT, mở muộn tiện ghé sau giờ học. Mua thuốc cảm, vitamin, đồ sơ cứu cơ bản. App Pharmacity đặt giao nhanh!', 3.9, 17, 0.2],
    // ID 80
    ['FPT Bookstore & Stationery', 8, 15.9695, 108.2598, 'FPT City Center, Ngũ Hành Sơn, Đà Nẵng', null, '07:30 - 21:00', 'Nhà sách và văn phòng phẩm trong khuôn viên FPT. Sách giáo trình, dụng cụ học tập, đồ văn phòng đầy đủ. In ấn tài liệu nhanh chóng, giá sinh viên!', 4.1, 19, 0.1],
  ];

  places.forEach(p => insertPlace.run(...p));

  // Review mẫu
  const insertReview = database.prepare(`
    INSERT INTO reviews (place_id, user_id, rating, title, content, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const reviews = [
    // Places gốc
    [3,  2, 5, 'Quán chill nhất khu FPT!',      'Ngồi học bài ở đây không muốn về luôn. Wifi nhanh, cà phê ngon, nhân viên thân thiện. Buổi chiều nắng vào đẹp lắm. Recommend!', '["chill","học bài","wifi tốt","đẹp"]'],
    [9,  2, 5, 'Cơm rẻ ngon khỏi bàn!',          'Mỗi ngày đều ăn ở đây, 35k mà đủ no. Bà chủ hiền lắm hay thêm đồ ăn cho sinh viên. Cá kho tộ và canh chua siêu đỉnh!', '["ngon","rẻ","nhiều","tốt bụng"]'],
    [11, 2, 5, 'Trà sữa sau giờ học quá chill!', 'Gong Cha cổng trường tiện quá trời. Trà oolong tươi size L là must-order. Queue hơi dài giờ cao điểm nhưng xứng đáng chờ!', '["tiện lợi","ngon","đông vui"]'],
    [14, 2, 5, 'View đỉnh nhất Đà Nẵng!',        'Lên Ngũ Hành Sơn ngắm biển và thành phố từ trên cao đẹp không tả được. Nên đi sáng sớm, ánh sáng đẹp chụp ảnh cực ảo!', '["đẹp","check-in","view biển","nên đi"]'],
    [1,  2, 5, 'Biển đẹp cực kỳ!',               'Non Nước đẹp hơn Mỹ Khê nhiều. Sóng nhẹ, cát mịn, ít khách du lịch hơn. Chiều tối hay ra đây ngắm hoàng hôn!', '["đẹp","yên tĩnh","hoàng hôn","cát trắng"]'],
    [7,  2, 4, 'Bar chill xịn sò!',               'View từ rooftop nhìn ra biển đêm đẹp lắm. Cocktail đắt hơn bình thường nhưng xứng đáng. Phù hợp đi dịp đặc biệt!', '["view đẹp","cocktail","lãng mạn","đắt chút"]'],
    // Places mới
    [16, 2, 4, 'Phúc Long gần trường tiện lắm!', 'Sáng nào cũng ghé lấy ly trà sữa trước khi vào học. Vị ổn định, không quá ngọt, nhân viên nhanh tay. Giá hơi cao hơn quán nhỏ nhưng chất lượng!', '["tiện lợi","ngon","nhanh"]'],
    [17, 2, 5, 'The Coffee House chill cực!',      'Không gian rộng, nhiều ổ điện, wifi ổn. Hay ngồi đây làm bài tập nhóm cả buổi chiều. Cold brew ngon nhất trong các chuỗi mình đã thử!', '["học bài","nhóm","wifi tốt","rộng rãi"]'],
    [19, 2, 5, 'Cộng Cà Phê decor đỉnh!',        'Cà phê cốt dừa ở đây là phải thử, ngon mà lạ miệng. Nhạc hay, không khí yên tĩnh, chụp ảnh ra góc nào cũng đẹp!', '["đẹp","chill","lạ","phải thử"]'],
    [20, 2, 5, 'Cafe nhỏ mà xinh lắm!',           'Quán nhỏ xinh decor vintage cực đẹp, nhiều góc sống ảo hay. Cà phê ngon, chủ quán thân thiện hay cho thêm bánh khi vắng khách!', '["đẹp","check-in","thân thiện","tiết kiệm"]'],
    [21, 2, 5, 'Bánh mì sáng tuyệt vời!',         'Bánh mì 15k mà ngon bá cháy, nhân đầy, bánh giòn. Hàng dài buổi sáng nhưng chỉ chờ 5 phút là có. Phải ăn thử một lần khi ở FPT!', '["ngon","rẻ","sáng","phải thử"]'],
    [22, 2, 5, 'Bún bò buổi sáng chuẩn vị!',     'Nước dùng đậm đà thơm sả, thịt bò mềm, chả cua tươi. Mở sáng sớm 6h30 phù hợp ăn trước giờ học. Ăn tô lớn no đến trưa luôn!', '["ngon","đậm vị","no","sáng sớm"]'],
    [23, 2, 4, 'Mì Quảng chuẩn Đà Nẵng!',        'Mì Quảng ngon, nước nhân vừa đủ không quá nhiều như kiểu khác. Ăn kèm bánh tráng nướng giòn mới đúng điệu. Mở đến 14h nên ghé trưa được!', '["ngon","đặc sản","đà nẵng","trưa"]'],
    [27, 2, 5, 'Chè siêu ngon giá rẻ!',           'Chè bắp và chè đậu đỏ ở đây ngon nhất khu. 15k một ly đầy ắp, ngọt vừa, không bị ngấy. Buổi chiều hay ghé ăn giải nhiệt sau môn thể chất!', '["ngon","rẻ","giải nhiệt","chiều"]'],
    [29, 2, 4, 'Escape Room vui và hồi hộp!',     'Chơi phòng Mật Thất cùng nhóm 5 người, đề khó vừa phải mà căng thẳng cực. Hết 1 tiếng phải xin hint 2 lần nhưng tự mở được cửa. Lần sau thử phòng horror!', '["vui","nhóm","hồi hộp","thử thách"]'],
    [30, 2, 4, 'Net gaming ổn ở gần trường!',     'Máy mới, đường truyền ổn định, chơi VALORANT và LOL không lag. Ghế thoải mái, điều hòa mát. Chỉ tiếc giờ cao điểm hết máy VIP hay phải chờ!', '["gaming","gần trường","máy mới","mát"]'],
    [31, 2, 5, 'Pub biển chill nhất Đà Nẵng!',   'Nhạc live acoustic tối thứ 5 nghe chill vô cùng. Ngồi ngoài trời nghe sóng biển + nhạc guitar + ly bia lạnh là hoàn hảo. Hay đi nhóm bạn cuối tuần!', '["chill","nhạc live","biển","nhóm"]'],
    [35, 2, 5, 'Hồ bơi view biển đỉnh quá!',     'Bơi xong ngồi nghỉ nhìn ra biển thư giãn cực. Nước sạch, hồ rộng, có phao và phao bơi thuê. Đến sáng sớm ít người, bơi sướng hơn nhiều!', '["thư giãn","view đẹp","sạch","sáng sớm"]'],
    [36, 2, 5, 'Yoga buổi sáng giúp tỉnh táo!',  'Lớp 6h sáng chỉ 6-7 người, thầy hướng dẫn tỉ mỉ. Học xong vào lớp tỉnh táo hẳn, focus tốt hơn hẳn. Thẻ tháng 400k cực hợp lý cho SV!', '["tỉnh táo","sức khỏe","sáng sớm","giá tốt"]'],
    [38, 2, 5, 'Bãi đá hoang sơ cực đẹp!',       'Ít người biết nên yên tĩnh, ảnh chụp ra cực nghệ. Sóng vỗ đá mạnh, âm thanh tự nhiên nghe cực chill. Đi giày thể thao thôi, đá trơn!', '["hoang sơ","đẹp","yên tĩnh","check-in"]'],
    [40, 2, 5, 'Cafe hoa giấy đẹp nhất khu!',    'Hoa giấy đỏ tím trồng khắp vườn, chụp ảnh góc nào cũng ra bộ. Cà phê ngon, phục vụ nhiệt tình. Hay đến buổi chiều ánh nắng đẹp hơn!', '["đẹp","hoa","check-in","chiều tà"]'],
    [43, 2, 3, 'Circle K tiện nhưng giá hơi cao', 'Tiện 24/7, mua mì cốc lúc 2h sáng ôn thi không cần đi đâu xa. Nhưng giá cao hơn siêu thị, chỉ nên ghé khi cần gấp. Nhiều SV FPT hay tụ tập ở đây!', '["tiện lợi","24/7","đêm","gần trường"]'],
    // Reviews địa điểm mới
    [44, 2, 4, 'Aha Coffee siêu tiện!',           'Sáng nào cũng ghé lấy ly cà phê trước khi vào học. Giá sinh viên thật sự, không đắt như các chuỗi lớn. App Aha đặt trước xong vào lấy luôn khỏi xếp hàng!', '["tiện lợi","rẻ","gần trường","nhanh"]'],
    [47, 2, 5, 'Mixue 10k không đâu bằng!',       'Kem ốc quế 10k, trà sữa 20k, sinh viên đâu dám mơ! Vị ổn không quá ngọt, kem mát lạnh sau buổi học dưới nắng. Hàng dài nhưng đợi chưa đến 5 phút!', '["rẻ","ngon","sinh viên","nhanh"]'],
    [54, 2, 5, 'Phở buổi sáng hoàn hảo!',        'Tô phở 40k mà xương hầm thật sự ngon, nước trong không ngầu. Thịt tái vừa chín tới, hành lá thơm. Ăn sáng xong học bài vèo vèo cả buổi!', '["ngon","sáng","no","chuẩn vị"]'],
    [55, 2, 5, 'Bún chả cá chuẩn Đà Nẵng nhất!', 'Đây là tô bún chả cá ngon nhất mình từng ăn ở Đà Nẵng. Chả cá tươi không hôi, nước dùng đậm đà mà không bị gắt. Lần nào về nhà cũng nhớ tới đây ăn!', '["đặc sản","ngon","phải thử","đà nẵng"]'],
    [56, 2, 5, 'Bánh xèo giòn rụm tuyệt vời!',   'Bánh xèo Đà Nẵng nhỏ nhưng giòn rụm, nhân tôm thịt đầy ắp. Cuốn với rau sống bánh tráng chấm mắm nêm là ngon muốn xỉu. Quán đông lắm nên hay bán hết sớm!', '["ngon","giòn","đặc sản","phải thử"]'],
    [60, 2, 5, 'Bánh tráng cuốn không đâu ngon bằng!', 'Đặc sản Đà Nẵng số 1! Thịt heo luộc mỏng cuốn bánh tráng mỏng với rau sống, chấm mắm nêm, ngon đến không thể dừng được. Set đôi 80k là đủ ăn no!', '["đặc sản","ngon","đà nẵng","phải thử"]'],
    [63, 2, 5, 'Ốc vặt tụ điểm SV FPT!',         'Xe ốc ngay gần cổng FPT, tối nào cũng đông. Ốc hương, ốc vú nàng xào sả ớt ngon bá cháy. 50k hai đứa ăn no vặt, ngồi nói chuyện đến 11 giờ đêm!', '["ngon","rẻ","tụ điểm","đêm"]'],
    [68, 2, 4, 'Pickleball đang hot lắm!',        'Mới tập chơi pickleball theo trend, sân gần FPT tiện quá. Dễ chơi hơn tennis nhiều, sau 3 buổi đã tự chơi được. Thuê vợt tại chỗ 10k, cực tiện!', '["hot","dễ chơi","gần trường","tiện"]'],
    [72, 2, 5, 'Mỹ Khê đẹp hơn mình nghĩ!',     'Top 6 bãi biển đẹp nhất châu Á không phải nói cho vui. Cát trắng mịn, nước trong xanh, sóng vừa phải. Đi sáng sớm 5h30 bình minh lên đẹp không thốt nên lời!', '["đẹp","bình minh","biển","cát trắng"]'],
    [73, 2, 4, 'Làng đá cực đẹp, độc đáo!',      'Xem các nghệ nhân tạc tượng đá từ phôi thô ra tác phẩm thật ấn tượng. Tượng đá đặt khắp làng chụp ảnh ra nghệ lắm. Mua quà lưu niệm về cho gia đình rất ý nghĩa!', '["nghệ thuật","check-in","đẹp","quà"]'],
    [75, 2, 5, 'Ghềnh đá Bãi Bụt bí mật!',      'Ít người biết nên yên tĩnh cực, chỉ vài người đến chụp ảnh. Đá granit đen, nước xanh ngọc, nhìn như ảnh nước ngoài. Sáng sớm ánh vàng chiếu vào đẹp xuất sắc!', '["hoang sơ","đẹp","ít người","check-in"]'],
  ];

  reviews.forEach(r => insertReview.run(...r));

  // Cập nhật rating cho tất cả place có review
  [1, 3, 7, 9, 11, 14, 16, 17, 19, 20, 21, 22, 23, 27, 29, 30, 31, 35, 36, 38, 40, 43,
   44, 47, 54, 55, 56, 60, 63, 68, 72, 73, 75]
    .forEach(id => updatePlaceRating(database, id));

  console.log('Dữ liệu mẫu đã được tạo!');
}

function updatePlaceRating(database, placeId) {
  const result = database.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total
    FROM reviews WHERE place_id = ?
  `).get(placeId);

  database.prepare(`
    UPDATE places SET avg_rating = ?, total_reviews = ? WHERE id = ?
  `).run(
    Math.round((result.avg_rating || 0) * 10) / 10,
    result.total || 0,
    placeId
  );
}

module.exports = { getDB, initDB, updatePlaceRating };
