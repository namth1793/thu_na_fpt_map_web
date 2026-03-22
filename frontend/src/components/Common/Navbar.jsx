import { LogIn, LogOut, MapPin, Shield, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../Auth/AuthModal';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  function handleLogout() {
    logout();
    setShowMenu(false);
    navigate('/');
  }

  return (
    <>
      <nav className="h-14 bg-white border-b border-gray-100 flex items-center px-4 z-[1500] relative" style={{ boxShadow: '0 1px 0 #f3f4f6, 0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 mr-auto group">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}>
            <MapPin size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="font-bold text-gray-900 text-[13px] tracking-tight block">FPT University Map</span>
            <span className="text-[11px] text-gray-400 font-medium">Quanh FPT Đà Nẵng</span>
          </div>
        </Link>

        {/* Right section */}
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-fpt-orange transition-colors px-3 py-1.5 rounded-xl hover:bg-fpt-light"
            >
              <Shield size={14} />
              Quản trị
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(s => !s)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
                >
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[90px] truncate leading-none">
                  {user.name}
                </span>
                <ChevronDown size={13} className={`text-gray-400 hidden md:block transition-transform ${showMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 min-w-[200px] overflow-hidden animate-slide-down">
                    {/* User info header */}
                    <div className="px-4 py-3.5 border-b border-gray-50" style={{ background: 'linear-gradient(135deg, #FFF3EE, #FFF9F7)' }}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
                        >
                          {user.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{user.name}</p>
                          <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Shield size={14} className="text-gray-400" /> Trang quản trị
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:-translate-y-px btn-cta-glow"
              style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
            >
              <LogIn size={14} />
              <span className="hidden md:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
