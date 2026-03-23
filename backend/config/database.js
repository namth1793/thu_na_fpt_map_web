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

  const isNewDB = database.prepare('SELECT COUNT(*) as count FROM place_types').get().count === 0;

  seedPlaces(database);

  if (isNewDB) {
    seedBootstrap(database);
  }

  console.log('Database khởi tạo thành công!');
}

// FPT Đà Nẵng: 15.9697, 108.2603 (Khu đô thị FPT City, Ngũ Hành Sơn)
function seedPlaces(database) {
  const insertType = database.prepare(
    'INSERT OR IGNORE INTO place_types (id, name, slug, color, icon) VALUES (?, ?, ?, ?, ?)'
  );
  const types = [
    [1, 'Sống ảo / Check-in', 'checkin',       '#FF6B6B', '📸'],
    [2, 'Karaoke',             'karaoke',        '#4ECDC4', '🎤'],
    [3, 'Thể thao',            'sports',         '#45B7D1', '⚽'],
    [4, 'Cafe & Chill',        'cafe',           '#96CEB4', '☕'],
    [5, 'Xem phim',            'cinema',         '#F7DC6F', '🎬'],
    [6, 'Ăn uống',             'food',           '#DDA0DD', '🍜'],
    [7, 'Giải trí',            'entertainment',  '#FFB347', '🎮'],
    [8, 'Mua sắm',             'shopping',       '#87CEEB', '🛍️'],
  ];
  types.forEach(t => insertType.run(...t));

  const insertPlace = database.prepare(`
    INSERT OR IGNORE INTO places (id, name, type_id, lat, lng, address, phone, hours, description, avg_rating, total_reviews, distance_from_fpt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 30 địa điểm thực tế trong bán kính 7km từ FPT (15.9697, 108.2603)
  const places = [
    // ── SỐNG ẢO / CHECK-IN ──────────────────────────────────────────────────
    [1,  'Bãi Biển Non Nước',
          1, 15.9944, 108.2742,
          'Bãi biển Non Nước, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '05:00 - 22:00',
          'Bãi biển cát trắng mịn đẹp nhất khu vực Ngũ Hành Sơn. Nước trong xanh, sóng nhẹ, thích hợp tắm biển và check-in hoàng hôn. Cách FPT chỉ 3km, đi xe đạp cũng được!',
          0, 0, 3.1],

    [2,  'Danh Thắng Ngũ Hành Sơn',
          1, 15.9752, 108.2647,
          '81 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3961 114', '07:00 - 17:30',
          '5 ngọn núi đá cẩm thạch huyền bí với chùa cổ ngàn năm, hang động kỳ vĩ và view biển tuyệt đẹp từ đỉnh cao. Di tích lịch sử quốc gia đặc biệt, ngay sát cạnh FPT.',
          0, 0, 0.8],

    [3,  'Làng Đá Mỹ Nghệ Non Nước',
          1, 15.9748, 108.2618,
          'Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '07:00 - 18:00',
          'Làng nghề điêu khắc đá cẩm thạch hơn 400 năm tuổi, ngay chân núi Ngũ Hành Sơn. Xem nghệ nhân tạc tượng thủ công, mua quà lưu niệm đá nghệ thuật độc đáo.',
          0, 0, 0.6],

    [4,  'Hồ Cảnh Quan FPT City',
          1, 15.9678, 108.2580,
          'Khu đô thị FPT City, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '00:00 - 24:00',
          'Hồ cảnh quan rộng lớn ngay trong khu FPT City, không gian xanh mát với đường dạo bộ, ghế nghỉ và view nhìn ra hồ lung linh. Check-in sáng sớm hoặc hoàng hôn cực đẹp.',
          0, 0, 0.3],

    // ── KARAOKE ────────────────────────────────────────────────────────────────
    [5,  'Karaoke Idol',
          2, 15.9573, 108.2514,
          '14 Hàm Tử, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3667 777', '10:00 - 02:00',
          'Karaoke cao cấp hệ thống âm thanh Anh Vũ chuyên nghiệp. 30 phòng từ phòng nhỏ đến VIP lớn, cập nhật bài liên tục từ nhạc Việt, Hàn đến Âu Mỹ. Combo đồ uống + ăn nhẹ cho nhóm bạn.',
          0, 0, 1.7],

    [6,  'Karaoke The Light',
          2, 15.9640, 108.2488,
          '68 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '0905 456 789', '11:00 - 01:00',
          'Karaoke concept ánh sáng lung linh, phòng được thiết kế theo phong cách LED độc đáo. Âm thanh chuẩn studio, màn hình 4K. Giá sinh viên hợp lý, hay có deal happy hour buổi trưa.',
          0, 0, 1.4],

    [7,  'Karaoke Paris Đà Nẵng',
          2, 15.9720, 108.2488,
          '102 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3556 668', '10:00 - 02:00',
          'Karaoke phong cách châu Âu sang trọng, phòng décor đẹp phù hợp sinh nhật và tụ tập nhóm bạn. Hệ thống bài hát 50.000+ bản, có riêng playlist Gen Z hot trend.',
          0, 0, 1.2],

    // ── THỂ THAO ───────────────────────────────────────────────────────────────
    [8,  'Sân Bóng Đá FPT Complex',
          3, 15.9710, 108.2650,
          'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng',
          null, '06:00 - 22:00',
          'Sân bóng đá mini cỏ nhân tạo ngay trong khu FPT City, đi bộ từ trường chưa đến 5 phút. Có đèn LED chiếu sáng đá tối. Cuối tuần đông sinh viên đặt sân, nên book qua Zalo sớm.',
          0, 0, 0.6],

    [9,  'Sân Cầu Lông Indexsport 2',
          3, 15.9680, 108.2455,
          '81C Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '0905 123 456', '06:00 - 22:00',
          'Tổ hợp 8 sân cầu lông trong nhà tiêu chuẩn, sàn gỗ chuyên dụng, hệ thống đèn LED đồng đều. Cho thuê vợt, có PTL tập riêng theo yêu cầu. Sinh viên FPT được giảm 20% phí sân.',
          0, 0, 1.5],

    [10, 'HD Fitness & Yoga Center',
          3, 15.9643, 108.2523,
          '161 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3828 828', '05:30 - 22:30',
          'Phòng gym rộng 800m² với đầy đủ máy móc thiết bị hiện đại. Lớp yoga, zumba, boxing aerobic mỗi ngày. PT chuyên nghiệp có chứng chỉ quốc tế. Gói tháng sinh viên từ 350k.',
          0, 0, 1.0],

    [11, 'Bể Bơi Ngũ Hành Sơn',
          3, 15.9750, 108.2500,
          '23 Trần Đại Nghĩa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3555 888', '06:00 - 20:00',
          'Bể bơi ngoài trời tiêu chuẩn 25m, nước sạch được xử lý định kỳ. Có khu vực bơi dành riêng cho trẻ em. Giá vé ngày thường cực rẻ chỉ 20k, buổi chiều từ 30k.',
          0, 0, 1.2],

    // ── CAFE & CHILL ────────────────────────────────────────────────────────────
    [12, 'Nốt Coffee',
          4, 15.9705, 108.2612,
          'Trần Đại Nghĩa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '06:00 - 22:00',
          'Quán cafe ngay cổng FPT, view đẹp nhìn ra đường Trần Đại Nghĩa. Không gian yên tĩnh, wifi mạnh, thích hợp ngồi học và làm việc. Cà phê muối đặc trưng Đà Nẵng và trà đào cam sả ngon.',
          0, 0, 0.1],

    [13, 'Trees Tea & Coffee',
          4, 15.9720, 108.2580,
          '72 Trương Đăng Quế, Ngũ Hành Sơn, Đà Nẵng',
          null, '07:00 - 22:00',
          'Quán cafe concept "rừng cây xanh" siêu thơ gần FPT. Thức uống đa dạng từ trà sữa, matcha, sinh tố đến cà phê specialty. Không gian xanh mát cực nghệ, chụp ảnh đẹp và decor thay theo mùa.',
          0, 0, 0.3],

    [14, 'Aha Coffee Phạm Kiết',
          4, 15.9850, 108.2550,
          '16 Phạm Kiết, Ngũ Hành Sơn, Đà Nẵng',
          null, '06:30 - 22:30',
          'Chuỗi cafe giá sinh viên cực hợp lý, đặt qua app Aha miễn phí giao đến lớp học. Cà phê, trà sữa, sinh tố đa dạng với 40+ thức uống. Wifi nhanh, không gian mở thoải mái ngồi cả ngày.',
          0, 0, 1.8],

    [15, 'Highlands Coffee NHS',
          4, 15.9628, 108.2492,
          '250 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '1800 1299', '06:30 - 22:30',
          'Chi nhánh Highlands Coffee không gian rộng và thoáng, phù hợp họp nhóm và làm việc. Hệ thống app đặt hàng tiện lợi, tích điểm đổi thưởng. Cà phê phin đặc trưng Việt Nam đậm đà.',
          0, 0, 1.4],

    [16, 'Phúc Long NHS',
          4, 15.9660, 108.2542,
          '85 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '1900 6161', '07:00 - 22:00',
          'Thương hiệu trà và cà phê Phúc Long nổi tiếng với trà trái cây, trà sữa và cà phê kem. Không gian hiện đại, điều hòa mát. Hay có combo 2 ly giá ưu đãi cho sinh viên.',
          0, 0, 0.8],

    // ── ĂN UỐNG ────────────────────────────────────────────────────────────────
    [17, 'Bún Bò Mệ Hoa',
          6, 15.9710, 108.2618,
          '45 Lê Văn Lương, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '06:00 - 14:00',
          'Quán bún bò Huế lâu đời ngay gần FPT, nước lèo đậm đà chuẩn vị Huế nấu từ 3 giờ sáng. Tô bún bò chân giò to, chỉ 35k no bụng. Sáng nào cũng đông nghẹt, nên đi trước 8 giờ.',
          0, 0, 0.2],

    [18, 'Cơm Tấm Hòa Hải',
          6, 15.9700, 108.2608,
          '12 Đỗ Bá, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '10:00 - 21:00',
          'Cơm tấm sườn bì chả thơm ngon nức tiếng khu NHS. Suất ăn đủ chất, cơm dẻo mịn, sườn nướng đậm vị. Giá từ 40-55k, có suất chay và phần trẻ em. Sinh viên FPT hay ăn trưa tại đây.',
          0, 0, 0.1],

    [19, 'Lẩu Băng Chuyền Kichi Kichi',
          6, 15.9730, 108.2561,
          '254 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '1900 599 964', '10:00 - 22:00',
          'Lẩu băng chuyền Kichi Kichi 60+ loại nguyên liệu tươi ngon chạy quanh bàn. Không gian rộng rãi, điều hòa mát, phù hợp đi nhóm đông. All-you-can-eat từ 169k/người. Đặt bàn trước dịp cuối tuần.',
          0, 0, 0.6],

    [20, 'Bún Chả Cá Nguyên Sinh',
          6, 15.9750, 108.2575,
          '18 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '06:30 - 14:00',
          'Quán bún chả cá đặc sản Đà Nẵng nổi tiếng gần Ngũ Hành Sơn. Chả cá tươi ngon tự làm, nước dùng ngọt thanh từ xương cá. Chỉ 30k một tô nhưng ngon "đậm chất biển" thứ thiệt.',
          0, 0, 0.6],

    [21, 'Mì Quảng Bà Mua',
          6, 15.9660, 108.2560,
          '33 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          null, '07:00 - 14:00',
          'Mì Quảng ngon nức tiếng cả khu NHS, sợi mì tươi mềm dai, nhân tôm thịt đầy đặn, nước dùng thơm chuẩn vị Quảng Nam. Bánh tráng mè giòn tan. Chỉ 30-35k một tô ăn no.',
          0, 0, 0.5],

    [22, 'Bánh Tráng Cuốn Thịt Heo Mỹ',
          6, 15.9690, 108.2520,
          '55 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          null, '10:00 - 22:00',
          'Đặc sản Đà Nẵng không thể bỏ qua! Bánh tráng mỏng cuốn thịt heo luộc, rau sống tươi, mắm nêm pha đậm đà. Cực phù hợp nhóm bạn nhậu nhẹ buổi tối. Giá vừa túi sinh viên.',
          0, 0, 0.8],

    [23, 'Lotteria Ngũ Hành Sơn',
          6, 15.9640, 108.2480,
          '320 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '1900 1572', '08:00 - 22:00',
          'Chuỗi fastfood Lotteria với burger, gà rán, khoai tây chiên giòn. Không gian thoáng rộng, có wifi miễn phí, điều hòa mát. Combo học nhóm + ăn uống siêu tiện. Delivery qua GrabFood, ShopeeFood.',
          0, 0, 1.5],

    // ── GIẢI TRÍ ──────────────────────────────────────────────────────────────
    [24, 'Fun World Đà Nẵng',
          7, 15.9695, 108.2489,
          '101 Ngô Thì Nhậm, Ngũ Hành Sơn, Đà Nẵng',
          '0236 3888 999', '09:00 - 22:00',
          'Trung tâm giải trí tổng hợp: bowling, billiard, game arcade, máy gắp thú, bida. Không gian điều hòa mát rượi. Gói chơi theo giờ hoặc theo lượt linh hoạt, thích hợp cả nhóm đông.',
          0, 0, 1.1],

    [25, 'Club Billiard NHS',
          7, 15.9660, 108.2498,
          '47 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '0905 888 123', '10:00 - 01:00',
          'Câu lạc bộ bida chuyên nghiệp với 15 bàn carom và pool chất lượng cao. Không gian yên tĩnh, ánh sáng tốt, điều hòa mát. Giờ vàng chiều tối giảm 30%, có coach dạy kỹ thuật.',
          0, 0, 1.1],

    [26, 'TimeZone NHS',
          7, 15.9680, 108.2452,
          'TTTM Vincom, Ngũ Hành Sơn, Đà Nẵng',
          '1800 8080', '09:30 - 22:00',
          'Khu vui chơi TimeZone với hàng trăm máy game arcade, máy claw, VR gaming và các trò thể thao điện tử. Dùng thẻ TimeZone tích điểm đổi quà. Vui chơi giải trí cả buổi cực hết ý.',
          0, 0, 1.6],

    // ── MUA SẮM ───────────────────────────────────────────────────────────────
    [27, 'Bách Hóa Xanh Ngũ Hành Sơn',
          8, 15.9622, 108.2517,
          '555 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '1800 1789', '07:00 - 22:00',
          'Siêu thị Bách Hóa Xanh đầy đủ thực phẩm tươi sống, đồ khô, hóa phẩm. Giá bình dân cạnh tranh, hàng hóa đa dạng đảm bảo chất lượng. App BHX đặt online giao tận phòng trong 2 giờ.',
          0, 0, 1.2],

    [28, 'Thế Giới Di Động Lê Văn Hiến',
          8, 15.9760, 108.2530,
          '231 Lê Văn Hiến, Ngũ Hành Sơn, Đà Nẵng',
          '1800 1789', '08:00 - 21:30',
          'Chuỗi điện máy lớn nhất Việt Nam. Đầy đủ điện thoại, laptop, tablet, phụ kiện công nghệ. Bảo hành chính hãng, đổi trả 30 ngày, trả góp 0% lãi cho sinh viên với thẻ sinh viên FPT.',
          0, 0, 0.9],

    [29, 'Chợ Hòa Hải',
          8, 15.9800, 108.2488,
          'Khu chợ Hòa Hải, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
          null, '05:00 - 18:00',
          'Chợ truyền thống sầm uất nhất khu NHS với đủ loại thực phẩm tươi sống, rau củ, trái cây, quần áo và hàng tạp hóa. Giá chợ rẻ hơn siêu thị, mặc cả được. Sáng sớm đông và đồ tươi nhất.',
          0, 0, 1.7],

    [30, 'WinMart Ngũ Hành Sơn',
          8, 15.9645, 108.2498,
          '130 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',
          '1900 232 389', '07:30 - 22:00',
          'Siêu thị WinMart (VinMart) hiện đại, không gian mua sắm sạch sẽ thoáng mát. Đầy đủ hàng tiêu dùng, đồ ăn chế biến sẵn và đồ dùng sinh hoạt. Thẻ WIN giảm thêm 5% mỗi hóa đơn.',
          0, 0, 1.3],
  ];

  places.forEach(p => insertPlace.run(...p));
}

function seedBootstrap(database) {
  const adminPass = bcrypt.hashSync('admin123', 10);
  database.prepare(
    "INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')"
  ).run('Admin FPT', 'admin@fpt.edu.vn', adminPass);

  const userPass = bcrypt.hashSync('user123', 10);
  database.prepare(
    "INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')"
  ).run('Sinh Viên FPT', 'sinhvien@fpt.edu.vn', userPass);

  // ── ẢNH cho từng địa điểm (2 ảnh/nơi) ──────────────────────────────────────
  const insertImage = database.prepare(
    'INSERT INTO place_images (place_id, image_url) VALUES (?, ?)'
  );
  const images = [
    // 1 - Bãi biển Non Nước
    [1, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'],
    [1, 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80'],
    // 2 - Ngũ Hành Sơn
    [2, 'https://images.unsplash.com/photo-1601933470096-0e34634ffcde?w=800&q=80'],
    [2, 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80'],
    // 3 - Làng Đá Mỹ Nghệ
    [3, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'],
    [3, 'https://images.unsplash.com/photo-1580428456289-31892d0c5af6?w=800&q=80'],
    // 4 - Hồ FPT City
    [4, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80'],
    [4, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'],
    // 5 - Karaoke Idol
    [5, 'https://images.unsplash.com/photo-1570737209810-b73e14d6b4c2?w=800&q=80'],
    [5, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80'],
    // 6 - Karaoke The Light
    [6, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'],
    [6, 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80'],
    // 7 - Karaoke Paris
    [7, 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800&q=80'],
    [7, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80'],
    // 8 - Sân Bóng FPT Complex
    [8, 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80'],
    [8, 'https://images.unsplash.com/photo-1516132006923-6cf348e5dee2?w=800&q=80'],
    // 9 - Sân Cầu Lông Indexsport
    [9, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80'],
    [9, 'https://images.unsplash.com/photo-1519926886-8a0ace85fb48?w=800&q=80'],
    // 10 - HD Fitness
    [10, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'],
    [10, 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80'],
    // 11 - Bể Bơi
    [11, 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=800&q=80'],
    [11, 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80'],
    // 12 - Nốt Coffee
    [12, 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80'],
    [12, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80'],
    // 13 - Trees Tea & Coffee
    [13, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    [13, 'https://images.unsplash.com/photo-1558618047-f87c7f38c946?w=800&q=80'],
    // 14 - Aha Coffee
    [14, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80'],
    [14, 'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=800&q=80'],
    // 15 - Highlands Coffee
    [15, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&q=80'],
    [15, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80'],
    // 16 - Phúc Long
    [16, 'https://images.unsplash.com/photo-1544996010-3d41b29df6fa?w=800&q=80'],
    [16, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80'],
    // 17 - Bún Bò Mệ Hoa
    [17, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80'],
    [17, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80'],
    // 18 - Cơm Tấm
    [18, 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=800&q=80'],
    [18, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80'],
    // 19 - Kichi Kichi
    [19, 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800&q=80'],
    [19, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80'],
    // 20 - Bún Chả Cá
    [20, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80'],
    [20, 'https://images.unsplash.com/photo-1596560548464-f010b450b0bc?w=800&q=80'],
    // 21 - Mì Quảng Bà Mua
    [21, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80'],
    [21, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&q=80'],
    // 22 - Bánh Tráng Cuốn
    [22, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80'],
    [22, 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=800&q=80'],
    // 23 - Lotteria
    [23, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80'],
    [23, 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80'],
    // 24 - Fun World
    [24, 'https://images.unsplash.com/photo-1566647387313-9fda80664848?w=800&q=80'],
    [24, 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80'],
    // 25 - Billiard Club
    [25, 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&q=80'],
    [25, 'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&q=80'],
    // 26 - TimeZone
    [26, 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80'],
    [26, 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&q=80'],
    // 27 - Bách Hóa Xanh
    [27, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'],
    [27, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'],
    // 28 - Thế Giới Di Động
    [28, 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&q=80'],
    [28, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80'],
    // 29 - Chợ Hòa Hải
    [29, 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800&q=80'],
    [29, 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80'],
    // 30 - WinMart
    [30, 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'],
    [30, 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'],
  ];
  images.forEach(([placeId, url]) => insertImage.run(placeId, url));

  // ── REVIEWS mẫu ──────────────────────────────────────────────────────────────
  const insertReview = database.prepare(`
    INSERT INTO reviews (place_id, user_id, rating, title, content, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const reviews = [
    [1,  2, 5, 'Biển đẹp cực kỳ!',             'Non Nước đẹp hơn Mỹ Khê nhiều. Sóng nhẹ, cát mịn, ít khách du lịch. Chiều tối ra đây ngắm hoàng hôn tím hồng siêu ảo!',                    '["đẹp","yên tĩnh","hoàng hôn","cát trắng"]'],
    [2,  2, 5, 'View đỉnh từ đỉnh núi!',        'Lên Ngũ Hành Sơn ngắm biển và thành phố từ trên cao đẹp không tả được. Nên đi sáng sớm ánh sáng đẹp, ít khách hơn.',                        '["đẹp","check-in","view biển","nên đi"]'],
    [4,  2, 4, 'Chill hồ buổi sáng tuyệt vời', 'Sáng nào cũng ra đây đi dạo trước khi vào trường. Không khí trong lành, hồ phản chiếu ánh sáng lung linh. Gần trường mà ít người biết!',    '["chill","gần trường","buổi sáng","đẹp"]'],
    [8,  2, 5, 'Sân bóng ngay trường tiện lắm!','Tụi mình hay book sân FPT Complex cuối tuần. Sân cỏ tốt, có đèn đá tối. Đặt qua zalo page cực nhanh, không lo hết sân.',                     '["tiện","gần trường","cỏ tốt","nhóm bạn"]'],
    [10, 2, 4, 'Gym cơ sở vật chất tốt!',       'HD Fitness máy móc mới, không gian thoáng. PT hướng dẫn nhiệt tình. Gói sinh viên 3 tháng giá OK. Đông giờ chiều tối.',                       '["gym","máy mới","sinh viên","PT tốt"]'],
    [12, 2, 5, 'Cafe chill ngay cổng trường!',  'Nốt Coffee mình hay ghé sau giờ học. Yên tĩnh, wifi khỏe, cà phê muối ngon lắm. Giá cũng ổn so với vị trí ngay cạnh FPT.',                   '["gần trường","yên tĩnh","wifi","chill"]'],
    [17, 2, 5, 'Bún bò ngon nhất khu này!',     'Quán mệ Hoa từ sáng sớm, tô bún bò to và đậm đà chuẩn vị. 35k một tô no bụng luôn. Xếp hàng tí xíu nhưng đáng chờ vì ngon thật.',          '["ngon","rẻ","gần trường","đậm đà"]'],
    [19, 2, 4, 'Kichi Kichi ngon, vui lắm!',    'Đi nhóm 8 người ăn Kichi Kichi rất vui. Băng chuyền chạy liên tục, tha hồ lấy. Giá 169k ăn thỏa thích. Nhớ đặt bàn trước cuối tuần!',       '["lẩu","nhóm bạn","vui","đáng tiền"]'],
    [5,  2, 5, 'Karaoke âm thanh đỉnh!',        'Idol karaoke âm thanh cực đỉnh, nhiều bài hát cập nhật. Phòng sạch sẽ, điều hòa mát. Hay đi sau thi cuối kỳ để xả stress!',                 '["chất lượng","âm thanh tốt","nhóm bạn","vui"]'],
    [3,  2, 4, 'Làng đá cực độc đáo!',          'Xem nghệ nhân tạc tượng đá từ phôi thô ra tác phẩm thật ấn tượng. Tượng đá đặt khắp làng chụp ảnh nghệ lắm. Mua quà về rất ý nghĩa!',       '["nghệ thuật","check-in","đẹp","quà"]'],
  ];
  reviews.forEach(r => insertReview.run(...r));

  const reviewedPlaceIds = [1, 2, 3, 4, 5, 8, 10, 12, 17, 19];
  reviewedPlaceIds.forEach(id => updatePlaceRating(database, id));

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
