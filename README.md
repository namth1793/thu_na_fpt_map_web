# 🗺️ Thu Na Map - Bản đồ quanh FPT Đà Nẵng

Trang web bản đồ địa điểm vui chơi, giải trí trong bán kính 7km quanh Đại học FPT Đà Nẵng.

## Cài đặt & Chạy

### Backend

```bash
cd backend
npm install
npm run dev
```
> Server chạy tại: http://localhost:5000

### Frontend

```bash
cd frontend
npm install
npm run dev
```
> App chạy tại: http://localhost:5173

---

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | admin@fpt.edu.vn | admin123 |
| Sinh viên | sinhvien@fpt.edu.vn | user123 |

---

## Tính năng

- **Bản đồ**: Leaflet + OpenStreetMap, vòng bán kính 7km, pin màu theo loại
- **Tìm kiếm**: Autocomplete real-time
- **Bộ lọc**: Loại địa điểm, đánh giá, khoảng cách, sắp xếp
- **Review**: Đánh giá sao 1-5, tag cảm xúc, upload ảnh, vote hữu ích
- **Vòng quay**: Random địa điểm hoặc tự điền, canvas animation
- **Admin**: Thống kê, quản lý địa điểm/review/người dùng
- **Mobile-first**: Responsive, toggle map/list

## Công nghệ

**Backend:** Node.js · Express · SQLite (better-sqlite3) · JWT · Multer

**Frontend:** React 18 · Vite · Leaflet · Tailwind CSS · Lucide React
