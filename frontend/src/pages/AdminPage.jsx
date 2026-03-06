import { AlertCircle, BarChart2, CheckCircle, Eye, EyeOff, FileSpreadsheet, ImagePlus, MapPin, MessageSquare, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import StarRating from '../components/Common/StarRating';
import { useAuth } from '../context/AuthContext';
import { adminAPI, placesAPI, getImageUrl } from '../utils/api';

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

const emptyForm = { name: '', type_id: '1', lat: '', lng: '', address: '', phone: '', hours: '', description: '' };

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
  const [form, setForm] = useState(emptyForm);
  const [formImages, setFormImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [excelImporting, setExcelImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const imgInputRef = useRef(null);

  // Edit state
  const [editingPlace, setEditingPlace] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editExistingImgs, setEditExistingImgs] = useState([]);
  const [editRemovedImgs, setEditRemovedImgs] = useState([]);
  const [editNewImgs, setEditNewImgs] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const editImgInputRef = useRef(null);

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

  function handleImgSelect(e) {
    const files = Array.from(e.target.files);
    const remaining = 10 - formImages.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFormImages(prev => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function removeFormImg(idx) {
    setFormImages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleAddPlace(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      formImages.forEach(({ file }) => fd.append('images', file));
      await placesAPI.create(fd);
      setMsg('Thêm địa điểm thành công!');
      setShowAddForm(false);
      setForm(emptyForm);
      setFormImages([]);
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

  async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setExcelImporting(true);
    setImportResult(null);
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminAPI.importExcel(fd);
      setImportResult(res.data);
      if (res.data.imported > 0) loadData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Lỗi import Excel');
    } finally {
      setExcelImporting(false);
    }
  }

  async function openEdit(place) {
    try {
      const res = await placesAPI.getById(place.id);
      const p = res.data;
      setEditForm({
        name: p.name || '',
        type_id: String(p.type_id || '1'),
        lat: String(p.lat || ''),
        lng: String(p.lng || ''),
        address: p.address || '',
        phone: p.phone || '',
        hours: p.hours || '',
        description: p.description || '',
      });
      setEditExistingImgs((p.images || []).map(img => typeof img === 'object' ? img.image_url : img));
      setEditRemovedImgs([]);
      setEditNewImgs([]);
      setEditingPlace(p);
    } catch (err) {
      alert('Không thể tải thông tin địa điểm');
    }
  }

  function closeEdit() {
    editNewImgs.forEach(img => URL.revokeObjectURL(img.preview));
    setEditingPlace(null);
    setEditNewImgs([]);
  }

  function handleEditImgSelect(e) {
    const files = Array.from(e.target.files);
    const remaining = 10 - editExistingImgs.length - editNewImgs.length;
    const toAdd = files.slice(0, remaining).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setEditNewImgs(prev => [...prev, ...toAdd]);
    e.target.value = '';
  }

  function removeEditExistingImg(url) {
    setEditExistingImgs(prev => prev.filter(u => u !== url));
    setEditRemovedImgs(prev => [...prev, url]);
  }

  function removeEditNewImg(idx) {
    setEditNewImgs(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditSaving(true);
    try {
      const fd = new FormData();
      Object.entries(editForm).forEach(([k, v]) => v !== '' && fd.append(k, v));
      if (editRemovedImgs.length > 0) fd.append('delete_images', JSON.stringify(editRemovedImgs));
      editNewImgs.forEach(({ file }) => fd.append('images', file));
      await placesAPI.update(editingPlace.id, fd);
      setMsg('Cập nhật địa điểm thành công!');
      closeEdit();
      loadData();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setEditSaving(false);
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

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange bg-slate-50 focus:bg-white transition-colors';

  return (
    <>
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản trị</h1>
            <p className="text-gray-500 text-sm mt-0.5">Xin chào, {user?.name}!</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 overflow-x-auto border border-slate-100">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-fpt-orange text-white shadow-sm'
                  : 'text-gray-500 hover:bg-slate-50 hover:text-gray-700'
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
                { label: 'Rating TB', value: (stats.avgRating?.toFixed(1) || '0') + ' ⭐', icon: '⭐', color: 'bg-yellow-50 text-yellow-600' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
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
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
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
              <div className="flex items-center gap-2">
                <label className={`flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer ${excelImporting ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <FileSpreadsheet size={16} />
                  {excelImporting ? 'Đang import...' : 'Import Excel'}
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} disabled={excelImporting} />
                </label>
                <button
                  onClick={() => { setShowAddForm(s => !s); setMsg(''); }}
                  className="flex items-center gap-2 bg-fpt-orange text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fpt-dark transition-colors"
                >
                  <Plus size={16} /> Thêm địa điểm
                </button>
              </div>
            </div>

            {msg && (
              <div className={`p-3 rounded-xl mb-4 text-sm font-medium flex items-center gap-2 ${msg.includes('thành công') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {msg.includes('thành công') ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {msg}
              </div>
            )}

            {importResult && (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-800">
                    Import thành công {importResult.imported}/{importResult.total} địa điểm
                  </span>
                  <button onClick={() => setImportResult(null)} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button>
                </div>
                {importResult.skipped?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1">
                      <AlertCircle size={13} /> {importResult.skipped.length} dòng bị bỏ qua:
                    </div>
                    {importResult.skipped.map((s, i) => (
                      <div key={i} className="text-xs text-gray-500 bg-amber-50 rounded-lg px-3 py-1.5">
                        Dòng {s.row} <span className="font-medium">{s.name}</span>: {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showAddForm && (
              <form onSubmit={handleAddPlace} className="bg-white rounded-2xl p-6 shadow-sm mb-4 border border-slate-100 animate-scale-in">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Plus size={18} className="text-fpt-orange" /> Thêm địa điểm mới
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tên địa điểm *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className={inputCls} required placeholder="VD: Cafe The Dreamer" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Loại địa điểm</label>
                    <select value={form.type_id} onChange={e => setForm(f => ({ ...f, type_id: e.target.value }))}
                      className={inputCls}>
                      {PLACE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Vĩ độ (Lat) *</label>
                    <input type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                      placeholder="15.9697" className={inputCls} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Kinh độ (Lng) *</label>
                    <input type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                      placeholder="108.2603" className={inputCls} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Địa chỉ</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      className={inputCls} placeholder="VD: 12 Lê Văn Hiến, Ngũ Hành Sơn" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Điện thoại</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className={inputCls} placeholder="0905 123 456" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Giờ mở cửa</label>
                    <input value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                      placeholder="07:00 - 22:00" className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mô tả</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className={`${inputCls} resize-none`} placeholder="Mô tả ngắn về địa điểm..." />
                  </div>

                  {/* Image upload with preview */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Hình ảnh ({formImages.length}/10)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 group flex-shrink-0">
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeFormImg(idx)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X size={16} className="text-white" />
                          </button>
                          {idx === 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-fpt-orange text-white text-[9px] font-bold text-center py-0.5">
                              Ảnh bìa
                            </div>
                          )}
                        </div>
                      ))}
                      {formImages.length < 10 && (
                        <button
                          type="button"
                          onClick={() => imgInputRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-fpt-orange hover:bg-orange-50 flex flex-col items-center justify-center text-slate-400 hover:text-fpt-orange transition-colors flex-shrink-0"
                        >
                          <ImagePlus size={20} />
                          <span className="text-[10px] mt-1 font-medium">Thêm ảnh</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={imgInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImgSelect}
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">Tối đa 10 ảnh · Ảnh đầu tiên sẽ là ảnh đại diện</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-fpt-orange text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-fpt-dark disabled:opacity-50 transition-colors">
                    {saving ? 'Đang lưu...' : <><Plus size={15} /> Thêm địa điểm</>}
                  </button>
                  <button type="button" onClick={() => { setShowAddForm(false); setFormImages([]); }}
                    className="bg-slate-100 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
                    Hủy
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Địa điểm</th>
                      <th className="px-4 py-3 text-left">Loại</th>
                      <th className="px-4 py-3 text-center">Rating</th>
                      <th className="px-4 py-3 text-center">Reviews</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {places.map(p => (
                      <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.address}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: p.type_color || '#6B7280' }}>
                            {p.type_name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StarRating value={p.avg_rating} size={12} />
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{p.total_reviews}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {p.is_active ? 'Hiện' : 'Ẩn'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleTogglePlace(p.id, p.is_active)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-500 transition-colors"
                              title={p.is_active ? 'Ẩn' : 'Hiện'}>
                              {p.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 transition-colors"
                              title="Sửa địa điểm">
                              <Pencil size={14} />
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
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Người dùng</th>
                    <th className="px-4 py-3 text-left">Địa điểm</th>
                    <th className="px-4 py-3 text-center">Sao</th>
                    <th className="px-4 py-3 text-left">Nội dung</th>
                    <th className="px-4 py-3 text-right">Ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reviews.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
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
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-center">Vai trò</th>
                    <th className="px-4 py-3 text-right">Ngày đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === 'admin' ? 'bg-fpt-light text-fpt-orange' : 'bg-slate-100 text-gray-600'}`}>
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

    {/* Edit Place Modal */}
    {editingPlace && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Pencil size={18} className="text-fpt-orange" />
              {editingPlace.name}
            </h3>
            <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-gray-400 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleEditSave} className="overflow-y-auto flex-1 px-6 py-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tên địa điểm *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Loại địa điểm</label>
                <select value={editForm.type_id} onChange={e => setEditForm(f => ({ ...f, type_id: e.target.value }))}
                  className={inputCls}>
                  {PLACE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Vĩ độ (Lat) *</label>
                <input type="number" step="any" value={editForm.lat} onChange={e => setEditForm(f => ({ ...f, lat: e.target.value }))}
                  className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Kinh độ (Lng) *</label>
                <input type="number" step="any" value={editForm.lng} onChange={e => setEditForm(f => ({ ...f, lng: e.target.value }))}
                  className={inputCls} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Địa chỉ</label>
                <input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Điện thoại</label>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Giờ mở cửa</label>
                <input value={editForm.hours} onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                  className={inputCls} placeholder="07:00 - 22:00" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Mô tả</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Images */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Hình ảnh ({editExistingImgs.length + editNewImgs.length}/10)
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Existing images */}
                  {editExistingImgs.map((url, idx) => (
                    <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 group flex-shrink-0">
                      <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeEditExistingImg(url)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X size={16} className="text-white" />
                      </button>
                      {idx === 0 && editExistingImgs.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-fpt-orange text-white text-[9px] font-bold text-center py-0.5">
                          Ảnh bìa
                        </div>
                      )}
                    </div>
                  ))}
                  {/* New images */}
                  {editNewImgs.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-blue-200 group flex-shrink-0">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeEditNewImg(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X size={16} className="text-white" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[9px] font-bold text-center py-0.5">
                        Mới
                      </div>
                    </div>
                  ))}
                  {/* Add button */}
                  {editExistingImgs.length + editNewImgs.length < 10 && (
                    <button type="button" onClick={() => editImgInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-fpt-orange hover:bg-orange-50 flex flex-col items-center justify-center text-slate-400 hover:text-fpt-orange transition-colors flex-shrink-0">
                      <ImagePlus size={20} />
                      <span className="text-[10px] mt-1 font-medium">Thêm ảnh</span>
                    </button>
                  )}
                </div>
                <input ref={editImgInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleEditImgSelect} />
                <p className="text-[11px] text-gray-400 mt-1.5">Ảnh viền cam = hiện có · Ảnh viền xanh = mới thêm · Hover để xóa</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
              <button type="submit" disabled={editSaving}
                className="flex items-center gap-2 bg-fpt-orange text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-fpt-dark disabled:opacity-50 transition-colors">
                {editSaving ? 'Đang lưu...' : <><CheckCircle size={15} /> Lưu thay đổi</>}
              </button>
              <button type="button" onClick={closeEdit}
                className="bg-slate-100 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
