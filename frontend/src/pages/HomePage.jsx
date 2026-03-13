import { useState } from 'react';
import { Map, List, Shuffle } from 'lucide-react';
import MapView from '../components/Map/MapView';
import Sidebar from '../components/Sidebar/Sidebar';
import SpinWheel from '../components/SpinWheel/SpinWheel';
import { useAuth } from '../context/AuthContext';
import { usePlaces } from '../context/PlaceContext';

export default function HomePage() {
  const { isAdmin } = useAuth();
  const { loadPlaces } = usePlaces();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [mobileView, setMobileView] = useState('map');

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden relative">
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

      {/* Sidebar - mobile */}
      {mobileView === 'list' && (
        <div className="md:hidden absolute inset-0 z-20 bg-white pb-20">
          <Sidebar />
        </div>
      )}

      {/* Map container */}
      <div className={`flex-1 relative ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
        <MapView isAdmin={isAdmin} onPlaceAdded={loadPlaces} />

        {/* Toggle sidebar - desktop only */}
        <button
          onClick={() => setShowSidebar(s => !s)}
          className="hidden md:flex absolute top-3 left-3 z-20 bg-white shadow-md rounded-full w-8 h-8 items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors text-sm"
          title={showSidebar ? 'Ẩn danh sách' : 'Hiện danh sách'}
        >
          {showSidebar ? '◀' : '▶'}
        </button>

        {/* Spin wheel FAB - desktop only */}
        <button
          onClick={() => setShowSpinWheel(true)}
          className="hidden md:flex absolute bottom-8 right-5 z-20 bg-gradient-to-r from-fpt-orange to-pink-500 text-white rounded-full px-5 py-3 shadow-xl hover:shadow-2xl transition-all items-center gap-2 font-semibold text-sm animate-float"
        >
          <Shuffle size={18} />
          <span>Random chỗ chơi!</span>
        </button>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        <button
          onClick={() => setMobileView('map')}
          className={`px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold transition-all ${
            mobileView === 'map' ? 'text-white' : 'bg-white text-gray-600'
          }`}
          style={mobileView === 'map' ? { background: 'linear-gradient(135deg,#F05A22,#e04010)', boxShadow: '0 4px 16px rgba(240,90,34,0.35)' } : {}}
        >
          <Map size={16} /> Bản đồ
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold transition-all ${
            mobileView === 'list' ? 'text-white' : 'bg-white text-gray-600'
          }`}
          style={mobileView === 'list' ? { background: 'linear-gradient(135deg,#F05A22,#e04010)', boxShadow: '0 4px 16px rgba(240,90,34,0.35)' } : {}}
        >
          <List size={16} /> Danh sách
        </button>
        <button
          onClick={() => setShowSpinWheel(true)}
          className="px-4 py-2.5 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg,#F05A22,#ec4899)' }}
          title="Random chỗ chơi"
        >
          <Shuffle size={17} />
        </button>
      </div>

      {/* Spin Wheel Modal */}
      {showSpinWheel && <SpinWheel onClose={() => setShowSpinWheel(false)} />}
    </div>
  );
}
