import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Trash2, RefreshCw, Shuffle } from 'lucide-react';
import { placesAPI } from '../../utils/api';

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F7DC6F', '#DDA0DD', '#FFB347', '#87CEEB',
  '#FF8C94', '#A8E6CF', '#FFD3B6', '#D4A5A5',
];

const SPIN_DURATION = 4000;

function easeOut(t) {
  return 1 - Math.pow(1 - t, 4);
}

export default function SpinWheel({ onClose }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const currentRotRef = useRef(0);

  const [items, setItems] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('places'); // 'places' | 'custom'
  const [placeTypes, setPlaceTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [loadingPlaces, setLoadingPlaces] = useState(false);

  useEffect(() => {
    placesAPI.getTypes().then(r => setPlaceTypes(r.data)).catch(() => {});
    loadRandomPlaces();
  }, []);

  async function loadRandomPlaces(typeId = '') {
    setLoadingPlaces(true);
    try {
      const res = await placesAPI.getRandom(10, typeId || undefined);
      setItems(res.data.map((p, i) => ({
        id: p.id,
        label: p.name,
        color: p.type_color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        icon: p.type_icon || '📍',
        isPlace: true,
      })));
    } catch {
      setItems([
        { id: 1, label: 'Bãi biển Non Nước', color: '#FF6B6B', icon: '🏖️' },
        { id: 2, label: 'Cafe chill', color: '#4ECDC4', icon: '☕' },
        { id: 3, label: 'Karaoke', color: '#45B7D1', icon: '🎤' },
        { id: 4, label: 'Quán ăn ngon', color: '#96CEB4', icon: '🍜' },
      ]);
    } finally {
      setLoadingPlaces(false);
    }
  }

  // Draw wheel on canvas
  const drawWheel = useCallback((rotation = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(cx, cy) - 8;
    const segAngle = (2 * Math.PI) / items.length;

    ctx.clearRect(0, 0, W, H);

    items.forEach((item, i) => {
      const start = rotation + i * segAngle - Math.PI / 2;
      const end = start + segAngle;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;

      const maxLen = 16;
      const label = item.label.length > maxLen ? item.label.slice(0, maxLen) + '…' : item.label;

      ctx.font = `bold ${items.length > 8 ? 11 : 13}px "Be Vietnam Pro", sans-serif`;
      ctx.fillText(label, R - 12, 4);

      if (items.length <= 8) {
        ctx.font = `${items.length > 6 ? 14 : 16}px serif`;
        ctx.fillText(item.icon, R - 12 - ctx.measureText(label).width - 6, 5);
      }

      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center emoji
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯', cx, cy);
  }, [items]);

  useEffect(() => {
    drawWheel(currentRotRef.current);
  }, [drawWheel]);

  function spin() {
    if (spinning || items.length < 2) return;
    setResult(null);
    setSpinning(true);

    const extraSpins = 6 + Math.random() * 4; // 6-10 full rotations
    const finalAngle = extraSpins * 2 * Math.PI + Math.random() * 2 * Math.PI;
    const startRot = currentRotRef.current;
    const targetRot = startRot + finalAngle;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);
      const currentRot = startRot + finalAngle * easeOut(progress);
      currentRotRef.current = currentRot;
      drawWheel(currentRot);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Determine winner
        const segAngle = (2 * Math.PI) / items.length;
        // Pointer at top (12 o'clock position)
        const normalized = ((targetRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pointed = (2 * Math.PI - normalized) % (2 * Math.PI);
        const winnerIdx = Math.floor(pointed / segAngle) % items.length;
        setResult(items[winnerIdx]);
        setSpinning(false);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  function addCustomItem() {
    if (!customInput.trim()) return;
    const colors = DEFAULT_COLORS;
    setItems(prev => [
      ...prev,
      {
        id: Date.now(),
        label: customInput.trim(),
        color: colors[prev.length % colors.length],
        icon: '✨',
      }
    ]);
    setCustomInput('');
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
    setResult(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">🎡 Vòng quay may mắn</h2>
            <p className="text-xs text-gray-400 mt-0.5">Không biết đi đâu? Để số phận quyết định!</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Wheel */}
          <div className="flex flex-col items-center justify-center p-6 flex-shrink-0">
            <div className="relative">
              <div className="spin-wheel-pointer" />
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="rounded-full shadow-xl"
              />
            </div>

            <button
              onClick={spin}
              disabled={spinning || items.length < 2}
              className={`mt-5 px-8 py-3 rounded-2xl font-bold text-white text-sm transition-all ${
                spinning
                  ? 'bg-gray-300 cursor-not-allowed'
                  : items.length < 2
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-fpt-orange to-pink-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              {spinning ? '🌀 Đang quay...' : '🎯 Quay ngay!'}
            </button>

            {result && (
              <div className="mt-4 text-center animate-bounce-in">
                <div className="text-3xl mb-1">{result.icon}</div>
                <div className="font-bold text-gray-900">{result.label}</div>
                <div className="text-xs text-gray-400 mt-1">Số phận đã chọn cho bạn! 🎉</div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l overflow-hidden">
            {/* Mode switch */}
            <div className="flex gap-1 p-3 bg-gray-50 border-b flex-shrink-0">
              <button
                onClick={() => { setMode('places'); loadRandomPlaces(selectedType); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${mode === 'places' ? 'bg-fpt-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                📍 Địa điểm có sẵn
              </button>
              <button
                onClick={() => { setMode('custom'); setItems([]); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${mode === 'custom' ? 'bg-fpt-orange text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                ✏️ Tự điền
              </button>
            </div>

            {/* Places mode controls */}
            {mode === 'places' && (
              <div className="px-3 py-2 border-b flex gap-2 flex-shrink-0">
                <select
                  value={selectedType}
                  onChange={e => { setSelectedType(e.target.value); loadRandomPlaces(e.target.value); }}
                  className="flex-1 text-xs border rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-fpt-orange"
                >
                  <option value="">Tất cả loại</option>
                  {placeTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
                <button
                  onClick={() => loadRandomPlaces(selectedType)}
                  disabled={loadingPlaces}
                  className="p-1.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  title="Làm mới"
                >
                  <RefreshCw size={14} className={loadingPlaces ? 'animate-spin' : ''} />
                </button>
              </div>
            )}

            {/* Custom mode input */}
            {mode === 'custom' && (
              <div className="px-3 py-2 border-b flex gap-2 flex-shrink-0">
                <input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                  placeholder="Nhập địa điểm hoặc món ăn..."
                  className="flex-1 text-xs border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-fpt-orange"
                />
                <button
                  onClick={addCustomItem}
                  className="p-1.5 bg-fpt-orange text-white rounded-xl hover:bg-fpt-dark transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Shuffle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{mode === 'custom' ? 'Thêm ít nhất 2 lựa chọn' : 'Đang tải...'}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 group transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-sm text-gray-700 truncate">{item.icon} {item.label}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-t flex-shrink-0 text-xs text-gray-400 text-center">
              {items.length} lựa chọn · Cần ít nhất 2 để quay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
