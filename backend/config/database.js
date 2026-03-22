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

  // FPT Đà Nẵng thực tế: 15.9765, 108.2634
  const insertPlace = database.prepare(`
    INSERT INTO places (name, type_id, lat, lng, address, phone, hours, description, avg_rating, total_reviews, distance_from_fpt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Địa điểm THỰC TẾ có tọa độ xác minh, trong bán kính 7km từ FPT
  const places = [
    // ID 1 — Sống ảo / Check-in
    ['Bãi biển Non Nước', 1, 15.9955, 108.2739, 'Bãi biển Non Nước, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '05:00 - 22:00', 'Bãi biển cát trắng mịn nổi tiếng nhất Đà Nẵng. Nước trong xanh, sóng nhẹ phù hợp tắm biển. View nhìn về Ngũ Hành Sơn cực đẹp, hay check-in hoàng hôn!', 0, 0, 2.5],
    // ID 2
    ['Danh Thắng Ngũ Hành Sơn', 1, 15.9752, 108.2647, '81 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', '0236 3961 114', '07:00 - 17:30', '5 ngọn núi đá cẩm thạch với chùa cổ, hang động kỳ bí và view nhìn ra biển. Di tích lịch sử quốc gia. Nên đi sáng sớm ít khách hơn.', 0, 0, 0.2],
    // ID 3
    ['Làng Đá Mỹ Nghệ Non Nước', 1, 15.9748, 108.2618, 'Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '07:00 - 18:00', 'Làng nghề điêu khắc đá cẩm thạch hơn 400 năm tuổi ngay chân núi Ngũ Hành Sơn. Xem nghệ nhân tạc tượng, mua quà lưu niệm đá nghệ thuật.', 0, 0, 0.2],
    // ID 4 — Mua sắm
    ['Thế Giới Di Động Lê Văn Hiến', 8, 15.9760, 108.2530, '231 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', '1800 1789', '08:00 - 21:30', 'Chuỗi điện máy lớn nhất Việt Nam. Mua điện thoại, laptop, phụ kiện công nghệ đầy đủ. Nhân viên tư vấn nhiệt tình, trả góp 0% lãi cho sinh viên.', 0, 0, 1.1],
    // ID 5 — Cafe & Chill
    ['Aha Coffee Phạm Kiết', 4, 15.9850, 108.2550, '16 Phạm Kiết, Ngũ Hành Sơn, Đà Nẵng', null, '06:30 - 22:30', 'Chuỗi cafe giá sinh viên cực hợp lý. Cà phê, trà sữa, sinh tố đa dạng. Wifi nhanh, chỗ ngồi thoải mái. Đặt trước qua app Aha miễn phí ship.', 0, 0, 1.6],
    // ID 6 — Mua sắm
    ['Pharmacity Hồ Xuân Hương', 8, 16.0130, 108.2520, '78 Hồ Xuân Hương, Khê Mỹ, Ngũ Hành Sơn, Đà Nẵng', '1800 6928', '07:00 - 23:00', 'Nhà thuốc Pharmacity đầy đủ thuốc, mỹ phẩm, chăm sóc sức khỏe. Dược sĩ tư vấn tận tình. App Pharmacity đặt online giao nhanh tận nơi.', 0, 0, 4.6],
    // ID 7 — Cafe & Chill (ngay cạnh FPT)
    ['Nốt Coffee', 4, 15.9768, 108.2612, 'Trần Đại Nghĩa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 22:00', 'Quán cafe ngay cạnh FPT, view đẹp nhìn ra đường Trần Đại Nghĩa. Không gian yên tĩnh, wifi miễn phí, thích hợp ngồi học và làm việc. Đặc biệt có cà phê muối và trà đào cam sả ngon.', 0, 0, 0.2],
    // ID 8 — Cafe & Chill
    ['Trees Tea & Coffee', 4, 15.9780, 108.2598, '72 Trương Đăng Quế, Ngũ Hành Sơn, Đà Nẵng', null, '07:00 - 22:00', 'Quán trà sữa và cafe concept "cây xanh" siêu thơ, nằm gần FPT. Thức uống phong phú từ trà sữa, matcha đến sinh tố. Không gian xanh mát, chụp ảnh cực nghệ.', 0, 0, 0.5],
    // ID 9 — Thể thao
    ['Sân Bóng Đá FPT Complex', 3, 15.9762, 108.2652, 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 22:00', 'Sân bóng đá mini ngay trong khu FPT City, cách trường chưa đến 300m. Sân cỏ nhân tạo, có đèn chiếu sáng ban đêm. Sinh viên FPT thường đặt sân cuối tuần rất nhộn nhịp.', 0, 0, 0.2],
    // ID 10 — Thể thao
    ['Sân Cầu Lông Indexsport 2', 3, 15.9680, 108.2455, '81C Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', '0905 123 456', '06:00 - 22:00', 'Tổ hợp sân cầu lông trong nhà hiện đại nhất khu vực NHS. 8 sân tiêu chuẩn, sàn gỗ chuyên dụng, hệ thống đèn LED tốt. Giá thuê sân sinh viên được giảm 20%. Có cho thuê vợt.', 0, 0, 2.3],
    // ID 11 — Thể thao
    ['HD Fitness Center', 3, 15.9643, 108.2523, '161 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng', '0236 3828 828', '05:30 - 22:30', 'Phòng gym hiện đại, diện tích rộng, đầy đủ máy móc thiết bị. Có lớp yoga, zumba, boxing aerobic. Giáo viên PT chuyên nghiệp. Học sinh sinh viên có gói ưu đãi riêng.', 0, 0, 3.0],
    // ID 12 — Mua sắm
    ['Bách Hóa Xanh Ngũ Hành Sơn', 8, 15.9622, 108.2517, '555 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng', '1800 1789', '07:00 - 22:00', 'Siêu thị Bách Hóa Xanh đầy đủ thực phẩm tươi sống, đồ khô, hóa phẩm và đồ dùng sinh hoạt. Giá cả bình dân, hàng hóa đa dạng. App BHX đặt online giao nhanh 2h.', 0, 0, 3.5],
    // ID 13 — Karaoke
    ['Karaoke Idol', 2, 15.9573, 108.2514, '14 Hàm Tử, Ngũ Hành Sơn, Đà Nẵng', '0236 3667 777', '10:00 - 02:00', 'Karaoke cao cấp hệ thống âm thanh Anh Vũ chuyên nghiệp. 30 phòng từ phòng nhỏ đến VIP, đầy đủ bài từ nhạc Việt, Hàn, Âu Mỹ. Có combo đồ uống + ăn nhẹ cho nhóm bạn.', 0, 0, 4.5],
    // ID 14 — Ăn uống
    ['Bún Bò Mệ Hoa', 6, 15.9771, 108.2625, '45 Lê Văn Lương, Ngũ Hành Sơn, Đà Nẵng', null, '06:00 - 14:00', 'Quán bún bò Huế lâu đời ngay gần FPT, nước lèo đậm đà chuẩn vị Huế. Tô bún thịt bò to, giá sinh viên siêu rẻ chỉ 35k. Sáng nào cũng đông nghẹt khách.', 0, 0, 0.1],
    // ID 15 — Ăn uống
    ['Cơm Tấm Đà Nẵng', 6, 15.9755, 108.2608, '12 Đỗ Bá, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', null, '10:00 - 21:00', 'Cơm tấm sườn bì chả ngon nức tiếng khu NHS. Suất ăn đủ chất, giá cả phải chăng từ 40-55k. Có suất chay mỗi ngày. Sinh viên FPT hay ăn trưa tại đây.', 0, 0, 0.2],
    // ID 16 — Ăn uống
    ['Lẩu Băng Chuyền Kichi Kichi', 6, 15.9730, 108.2561, '254 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng', '1900 599 964', '10:00 - 22:00', 'Lẩu băng chuyền Kichi Kichi nổi tiếng với 60+ loại nguyên liệu tươi ngon đi theo băng chuyền quanh bàn. Không gian sang trọng, phù hợp đi nhóm bạn đông. Giá từ 169k/người.', 0, 0, 1.0],
    // ID 17 — Giải trí
    ['Fun World Đà Nẵng', 7, 15.9695, 108.2489, '101 Ngô Thì Nhậm, Ngũ Hành Sơn, Đà Nẵng', '0236 3888 999', '09:00 - 22:00', 'Trung tâm giải trí tổng hợp với bowling, billiard, game arcade, máy gắp thú. Không gian rộng rãi, điều hòa mát. Gói chơi theo giờ hoặc theo lượt linh hoạt cho nhóm bạn.', 0, 0, 2.0],
    // ID 18 — Xem phim
    ['Galaxy Cinema Trần Phú', 5, 16.0427, 108.2295, '116 Trần Phú, Hải Châu, Đà Nẵng', '1900 545 599', '08:00 - 23:00', 'Rạp chiếu phim Galaxy với 6 phòng chiếu hiện đại, màn hình lớn, âm thanh Dolby. Phim mới nhất cập nhật liên tục. Sinh viên xuất trình thẻ được giảm 20%. Đặt vé qua app Galaxy+.', 0, 0, 6.8],
  ];

  places.forEach(p => insertPlace.run(...p));

  // Review mẫu
  const insertReview = database.prepare(`
    INSERT INTO reviews (place_id, user_id, rating, title, content, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const reviews = [
    [1, 2, 5, 'Biển đẹp cực kỳ!',             'Non Nước đẹp hơn Mỹ Khê nhiều. Sóng nhẹ, cát mịn, ít khách du lịch hơn. Chiều tối hay ra đây ngắm hoàng hôn tím hồng!', '["đẹp","yên tĩnh","hoàng hôn","cát trắng"]'],
    [2, 2, 5, 'View đỉnh nhất Đà Nẵng!',      'Lên Ngũ Hành Sơn ngắm biển và thành phố từ trên cao đẹp không tả được. Hang động và chùa cổ rất linh thiêng. Nên đi sáng sớm ánh sáng đẹp!', '["đẹp","check-in","view biển","nên đi"]'],
    [3, 2, 4, 'Làng đá cực đẹp, độc đáo!',   'Xem các nghệ nhân tạc tượng đá từ phôi thô ra tác phẩm thật ấn tượng. Tượng đá đặt khắp làng chụp ảnh ra nghệ lắm. Mua quà lưu niệm về rất ý nghĩa!', '["nghệ thuật","check-in","đẹp","quà"]'],
    [5, 2, 4, 'Aha Coffee siêu tiện!',         'Sáng nào cũng ghé lấy ly cà phê. Giá sinh viên thật sự, không đắt như các chuỗi lớn. App Aha đặt trước xong vào lấy luôn khỏi xếp hàng!', '["tiện lợi","rẻ","gần trường","nhanh"]'],
    [7, 2, 5, 'Quán cafe chill ngay cổng trường!', 'Nốt Coffee mình hay ghé sau giờ học. Yên tĩnh, wifi khỏe, cà phê muối ngon lắm. Giá cũng ổn so với vị trí ngay cạnh FPT.', '["gần trường","yên tĩnh","wifi","chill"]'],
    [9, 2, 5, 'Sân bóng ngay khu FPT tiện lắm!', 'Tụi mình hay book sân FPT Complex cuối tuần. Sân cỏ tốt, có đèn đá tối được. Đặt qua zalo page cực nhanh, không lo hết sân.', '["tiện","gần trường","cỏ tốt","nhóm bạn"]'],
    [14, 2, 5, 'Bún bò ngon nhất khu này!',    'Quán mệ Hoa bán từ sáng sớm, tô bún bò to và đậm đà chuẩn vị. 35k một tô no bụng luôn. Xếp hàng tí xíu nhưng đáng chờ vì ngon thật.', '["ngon","rẻ","gần trường","đậm đà"]'],
    [13, 2, 5, 'Karaoke chất lượng cao!',       'Idol karaoke âm thanh cực đỉnh, nhiều bài hát cập nhật. Phòng sạch sẽ, điều hòa mát. Nhóm 6 bạn book phòng standard vừa vặn. Hay đi sau thi cuối kỳ!', '["chất lượng","âm thanh tốt","nhóm bạn","vui"]'],
    [11, 2, 4, 'Gym cơ sở vật chất tốt!',      'HD Fitness máy móc mới, không gian thoáng. PT viên hướng dẫn nhiệt tình. Gói sinh viên 3 tháng giá OK. Đông vào giờ cao điểm chiều tối.', '["gym","máy mới","sinh viên","PT tốt"]'],
  ];

  reviews.forEach(r => insertReview.run(...r));

  // Cập nhật rating cho place có review
  [1, 2, 3, 5, 7, 9, 11, 13, 14].forEach(id => updatePlaceRating(database, id));

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
