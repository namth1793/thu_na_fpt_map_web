import { useState } from 'react';
import { Map, List, Shuffle } from 'lucide-react';
import MapView from '../components/Map/MapView';
import Sidebar from '../components/Sidebar/Sidebar';
import SpinWheel from '../components/SpinWheel/SpinWheel';

export default function HomePage() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [mobileView, setMobileView] = useState('map'); // 'map' | 'list'

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar - desktop */}
      <div
        className={`
          hidden md:flex flex-col bg-white shadow-lg z-10 flex-shrink-0
          transition-all duration-300 overflow-hidden
          ${showSidebar ? 'w-80 xl:w-96' : 'w-0'}
        `}
      >
        {showSidebar && <Sidebar />}
      </div>

      {/* Sidebar - mobile (khi chọn list view) */}
      {mobileView === 'list' && (
        <div className="md:hidden absolute inset-0 top-0 z-20 bg-white">
          <Sidebar />
        </div>
      )}

      {/* Map container */}
      <div className={`flex-1 relative ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
        <MapView />

        {/* Toggle sidebar - desktop */}
        <button
          onClick={() => setShowSidebar(s => !s)}
          className="hidden md:flex absolute top-3 left-3 z-20 bg-white shadow-md rounded-full w-8 h-8 items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors text-sm"
          title={showSidebar ? 'Ẩn danh sách' : 'Hiện danh sách'}
        >
          {showSidebar ? '◀' : '▶'}
        </button>

        {/* Spin wheel FAB */}
        <button
          onClick={() => setShowSpinWheel(true)}
          className="absolute bottom-8 right-5 z-20 bg-gradient-to-r from-fpt-orange to-pink-500 text-white rounded-full px-5 py-3 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2 font-semibold text-sm"
        >
          <Shuffle size={18} />
          <span>Random chỗ chơi!</span>
        </button>

        {/* Mobile bottom nav */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <button
            onClick={() => setMobileView('map')}
            className={`px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              mobileView === 'map'
                ? 'bg-fpt-orange text-white shadow-orange-200'
                : 'bg-white text-gray-600'
            }`}
          >
            <Map size={16} /> Bản đồ
          </button>
          <button
            onClick={() => setMobileView('list')}
            className={`px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold transition-all ${
              mobileView === 'list'
                ? 'bg-fpt-orange text-white shadow-orange-200'
                : 'bg-white text-gray-600'
            }`}
          >
            <List size={16} /> Danh sách
          </button>
          <button
            onClick={() => setShowSpinWheel(true)}
            className="px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-fpt-orange to-pink-500 text-white"
          >
            <Shuffle size={16} />
          </button>
        </div>
      </div>

      {/* Spin Wheel Modal */}
      {showSpinWheel && <SpinWheel onClose={() => setShowSpinWheel(false)} />}
    </div>
  );
}
