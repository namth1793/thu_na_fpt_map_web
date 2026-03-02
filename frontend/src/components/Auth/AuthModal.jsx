import { useState } from 'react';
import { X, Eye, EyeOff, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Vui lòng nhập tên của bạn'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-fpt-orange focus:ring-2 focus:ring-fpt-orange/20 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
        {/* Gradient header */}
        <div
          className="px-6 pt-6 pb-5"
          style={{ background: 'linear-gradient(135deg, #FFF3EE 0%, #FFF9F7 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
              >
                <MapPin size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg leading-tight">
                  {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mode === 'login'
                    ? 'Viết review & khám phá cùng cộng đồng'
                    : 'Tham gia cộng đồng FPT Map!'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/80 rounded-xl transition-colors flex-shrink-0 -mt-0.5"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tên của bạn</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputClass}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="email@example.com"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className={`${inputClass} pr-10`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-xl border border-red-100">
                <span className="text-base leading-none flex-shrink-0">⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:shadow-md hover:-translate-y-px mt-1"
              style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Đang xử lý…
                </span>
              ) : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-sm text-gray-500 text-center mt-4">
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-fpt-orange font-semibold hover:underline"
            >
              {mode === 'login' ? 'Đăng ký miễn phí' : 'Đăng nhập ngay'}
            </button>
          </p>

          {/* Demo accounts */}
          <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tài khoản demo</p>
            </div>
            <div className="divide-y divide-gray-50">
              <button
                type="button"
                onClick={() => {
                  setForm({ name: '', email: 'sinhvien@fpt.edu.vn', password: 'user123' });
                  setMode('login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs flex-shrink-0">👤</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">sinhvien@fpt.edu.vn</p>
                  <p className="text-[10px] text-gray-400">user123</p>
                </div>
                <span className="text-[10px] text-blue-500 font-medium ml-auto flex-shrink-0">Dùng</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ name: '', email: 'admin@fpt.edu.vn', password: 'admin123' });
                  setMode('login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center text-xs flex-shrink-0">🛡️</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">admin@fpt.edu.vn</p>
                  <p className="text-[10px] text-gray-400">admin123</p>
                </div>
                <span className="text-[10px] text-fpt-orange font-medium ml-auto flex-shrink-0">Dùng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
