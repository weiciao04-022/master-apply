/** 粉紅愛心資料夾圖示 */
export function HeartFolder({ size = 56, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 64 52" aria-hidden className="heart-folder">
      <defs>
        <linearGradient id="hfBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9fcf" />
          <stop offset="1" stopColor="#e85a9f" />
        </linearGradient>
        <linearGradient id="hfFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc2df" />
          <stop offset="0.55" stopColor="#ff9fcf" />
          <stop offset="1" stopColor="#f278b3" />
        </linearGradient>
        <linearGradient id="hfHeart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6fb3" />
          <stop offset="1" stopColor="#e0147a" />
        </linearGradient>
      </defs>
      <path d="M4 8a4 4 0 0 1 4-4h15l5 5h28a4 4 0 0 1 4 4v31a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="url(#hfBack)" />
      {open && <rect x="9" y="11" width="44" height="22" rx="2" fill="#fff" opacity="0.9" />}
      <path
        d={open ? 'M2 20a3 3 0 0 1 3-3h55a3 3 0 0 1 3 3.4l-3 24A4 4 0 0 1 56 48H8a4 4 0 0 1-4-3.6z' : 'M4 17a3 3 0 0 1 3-3h50a3 3 0 0 1 3 3v27a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z'}
        fill="url(#hfFront)"
      />
      <path d="M7 16.5h50" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M32 41s-10-6-10-12.5a5.5 5.5 0 0 1 10-3.2 5.5 5.5 0 0 1 10 3.2C42 35 32 41 32 41z"
        fill="url(#hfHeart)"
        stroke="#fff"
        strokeOpacity="0.6"
        strokeWidth="1"
      />
      <ellipse cx="27.5" cy="27" rx="2" ry="1.3" fill="#fff" opacity="0.7" />
    </svg>
  );
}
