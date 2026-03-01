import { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
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
        if (!form.name.trim()) { setError('Vui lòng nhập tên'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900 text-xl">
                {mode === 'login' ? '👋 Đăng nhập' : '🎉 Đăng ký'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {mode === 'login' ? 'Đăng nhập để viết review và đánh giá' : 'Tham gia cộng đồng FPT Map!'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tên của bạn</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange"
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
                className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange"
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
                  className="w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-fpt-orange text-white py-3 rounded-xl font-bold text-sm hover:bg-fpt-dark disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? '⏳ Đang xử lý...' : mode === 'login' ? '🚀 Đăng nhập' : '✨ Đăng ký ngay'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <button
                onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-fpt-orange font-semibold hover:underline"
              >
                {mode === 'login' ? 'Đăng ký miễn phí' : 'Đăng nhập'}
              </button>
            </p>
          </div>

          {/* Demo accounts hint */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
            <p className="font-semibold mb-1">Tài khoản demo:</p>
            <p>👤 sinhvien@fpt.edu.vn / user123</p>
            <p>🛡️ admin@fpt.edu.vn / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
