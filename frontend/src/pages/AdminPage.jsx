import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, MapPin, MessageSquare, Users, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { adminAPI, placesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/Common/StarRating';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const PLACE_TYPES = [
  { id: 1, name: 'Sống ảo / Check-in', icon: '📸' },
  { id: 2, name: 'Karaoke', icon: '🎤' },
  { id: 3, name: 'Thể thao', icon: '⚽' },
  { id: 4, name: 'Cafe & Chill', icon: '☕' },
  { id: 5, name: 'Xem phim', icon: '🎬' },
  { id: 6, name: 'Ăn uống', icon: '🍜' },
  { id: 7, name: 'Giải trí', icon: '🎮' },
  { id: 8, name: 'Mua sắm', icon: '🛍️' },
];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [places, setPlaces] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', type_id: '1', lat: '', lng: '', address: '', phone: '', hours: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user || !isAdmin) { navigate('/'); return; }
    loadData();
  }, [user, isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [sRes, pRes, rRes, uRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllPlaces(),
        adminAPI.getAllReviews(),
        adminAPI.getAllUsers(),
      ]);
      setStats(sRes.data);
      setPlaces(pRes.data);
      setReviews(rRes.data);
      setUsers(uRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPlace(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await placesAPI.create(fd);
      setMsg('Thêm địa điểm thành công!');
      setShowAddForm(false);
      setForm({ name: '', type_id: '1', lat: '', lng: '', address: '', phone: '', hours: '', description: '' });
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePlace(id, isActive) {
    try {
      const fd = new FormData();
      fd.append('is_active', isActive ? '0' : '1');
      await placesAPI.update(id, fd);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi');
    }
  }

  async function handleDeletePlace(id) {
    if (!confirm('Xác nhận ẩn địa điểm này?')) return;
    try {
      await placesAPI.delete(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi');
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;

  const tabs = [
    { id: 'stats', label: 'Tổng quan', icon: BarChart2 },
    { id: 'places', label: 'Địa điểm', icon: MapPin },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'users', label: 'Người dùng', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản trị Thu Na Map</h1>
            <p className="text-gray-500 text-sm mt-0.5">Xin chào, {user?.name}!</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-fpt-orange text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === 'stats' && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Địa điểm', value: stats.totalPlaces, icon: '📍', color: 'bg-orange-50 text-fpt-orange' },
                { label: 'Reviews', value: stats.totalReviews, icon: '💬', color: 'bg-blue-50 text-blue-600' },
                { label: 'Người dùng', value: stats.totalUsers, icon: '👥', color: 'bg-green-50 text-green-600' },
                { label: 'Rating TB', value: stats.avgRating?.toFixed(1) + '⭐', icon: '⭐', color: 'bg-yellow-50 text-yellow-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Địa điểm mới nhất</h3>
                <div className="space-y-2">
                  {stats.recentPlaces?.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.type_name}</div>
                      </div>
                      <StarRating value={p.avg_rating} size={12} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Review mới nhất</h3>
                <div className="space-y-2">
                  {stats.recentReviews?.map(r => (
                    <div key={r.id} className="py-2 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{r.user_name}</span>
                        <StarRating value={r.rating} size={12} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.place_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Places management */}
        {tab === 'places' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Tất cả địa điểm ({places.length})</h2>
              <button
                onClick={() => setShowAddForm(s => !s)}
                className="flex items-center gap-2 bg-fpt-orange text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fpt-dark transition-colors"
              >
                <Plus size={16} /> Thêm địa điểm
              </button>
            </div>

            {msg && (
              <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${msg.includes('thành công') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg}
              </div>
            )}

            {showAddForm && (
              <form onSubmit={handleAddPlace} className="bg-white rounded-2xl p-6 shadow-sm mb-4">
                <h3 className="font-bold text-gray-800 mb-4">Thêm địa điểm mới</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên địa điểm *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại địa điểm</label>
                    <select value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange">
                      {PLACE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vĩ độ (Lat) *</label>
                    <input type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                      placeholder="15.9697" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kinh độ (Lng) *</label>
                    <input type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                      placeholder="108.2603" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giờ mở cửa</label>
                    <input value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                      placeholder="07:00 - 22:00" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange resize-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={saving}
                    className="bg-fpt-orange text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-fpt-dark disabled:opacity-50 transition-colors">
                    {saving ? 'Đang lưu...' : 'Thêm địa điểm'}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                    Hủy
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Địa điểm</th>
                      <th className="px-4 py-3 text-left">Loại</th>
                      <th className="px-4 py-3 text-center">Rating</th>
                      <th className="px-4 py-3 text-center">Reviews</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {places.map(p => (
                      <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: p.type_color || '#6B7280' }}>
                            {p.type_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StarRating value={p.avg_rating} size={12} />
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{p.total_reviews}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {p.is_active ? 'Hiện' : 'Ẩn'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleTogglePlace(p.id, p.is_active)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                              title={p.is_active ? 'Ẩn' : 'Hiện'}>
                              {p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => handleDeletePlace(p.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reviews */}
        {tab === 'reviews' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Người dùng</th>
                    <th className="px-4 py-3 text-left">Địa điểm</th>
                    <th className="px-4 py-3 text-center">Sao</th>
                    <th className="px-4 py-3 text-left">Nội dung</th>
                    <th className="px-4 py-3 text-right">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reviews.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.user_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.place_name}</td>
                      <td className="px-4 py-3 text-center">
                        <StarRating value={r.rating} size={12} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                        <div className="line-clamp-2">{r.content || r.title || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-center">Vai trò</th>
                    <th className="px-4 py-3 text-right">Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-fpt-light text-fpt-orange' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Sinh viên'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 text-right">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
