import { useState } from 'react';
import bannerImg from '../../../assets/banner.jpg';

export default function SplashScreen({ onStart }) {
  const [clicked, setClicked] = useState(false);

  function handleClick() {
    setClicked(true);
    setTimeout(onStart, 550);
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <img
        src={bannerImg}
        alt="Banner"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);    opacity: 0.55; }
          70%  { transform: scale(1.6);  opacity: 0; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .btn-splash {
          animation: float 3s ease-in-out infinite, fade-in-up 0.9s ease both;
        }
        .btn-splash::before,
        .btn-splash::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: #f97316;
          animation: pulse-ring 2.4s ease-out infinite;
          z-index: -1;
        }
        .btn-splash::after {
          animation-delay: 1.2s;
        }
        .btn-splash:hover {
          transform: scale(1.08) !important;
          animation: none;
          transition: transform 0.2s ease;
        }
        .btn-splash:active {
          transform: scale(0.95) !important;
        }
        .btn-splash.exit {
          transform: scale(1.15) !important;
          opacity: 0 !important;
          transition: transform 0.5s ease, opacity 0.5s ease !important;
          animation: none !important;
        }
      `}</style>

      <div className="relative z-10 flex items-center justify-center h-full">
        <button
          onClick={handleClick}
          className={`btn-splash${clicked ? ' exit' : ''} relative px-12 py-5 bg-orange-500 text-white text-xl font-bold rounded-full shadow-2xl cursor-pointer`}
        >
          <span className="flex items-center gap-3">
            Bắt đầu khám phá
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
