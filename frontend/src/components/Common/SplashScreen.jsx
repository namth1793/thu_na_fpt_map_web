import bannerImg from '../../assets/banner.jpg';

export default function SplashScreen({ onStart }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Banner image */}
      <img
        src={bannerImg}
        alt="Banner"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg mb-3">
          Thu Na FPT Map
        </h1>
        <p className="text-lg md:text-xl text-white/90 drop-shadow mb-10">
          Khám phá địa điểm vui chơi quanh FPT University Đà Nẵng
        </p>

        <button
          onClick={onStart}
          className="group relative px-10 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-lg font-semibold rounded-full shadow-2xl transition-all duration-200"
        >
          <span className="flex items-center gap-2">
            Bắt đầu khám phá
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
