import { LogIn, LogOut, MapPin, Shield } from 'lucide-react';
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
      <nav className="h-14 bg-white border-b border-gray-100 shadow-sm flex items-center px-4 z-30 relative">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <div className="w-8 h-8 bg-fpt-orange rounded-xl flex items-center justify-center shadow-sm">
            <MapPin size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm leading-none block">FPT University Map</span>
            <span className="text-xs text-gray-400 leading-none">Quanh FPT Đà Nẵng</span>
          </div>
        </Link>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-fpt-orange transition-colors px-3 py-1.5 rounded-xl hover:bg-fpt-light"
            >
              <Shield size={15} />
              Quản trị
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(s => !s)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 bg-fpt-orange rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 min-w-[180px] overflow-hidden">
                    <div className="px-4 py-3 border-b">
                      <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Shield size={14} /> Quản trị
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
              className="flex items-center gap-2 bg-fpt-orange text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fpt-dark transition-colors shadow-sm"
            >
              <LogIn size={15} />
              <span className="hidden md:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
