/** 背景拼貼：撕紙、紙星星、網點嘴唇、網點圓。全部為原創向量圖形。 */
function PaperStar({ size, rot, style }: { size: number; rot: number; style: React.CSSProperties }) {
  return (
    <svg className="bd-star" width={size} height={size} viewBox="0 0 100 100" style={{ ...style, transform: `rotate(${rot}deg)` }} aria-hidden>
      <path
        d="M50 4 L62 36 L96 37 L69 58 L79 92 L50 72 L21 92 L31 58 L4 37 L38 36 Z"
        fill="#f4e6cc"
        stroke="#e7d2ad"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M50 12 L58 38 M38 44 L62 44 M30 62 L48 70" stroke="#e2c99e" strokeWidth="1.2" opacity=".7" fill="none" />
    </svg>
  );
}

function HalftoneLips({ size, rot, style }: { size: number; rot: number; style: React.CSSProperties }) {
  return (
    <svg className="bd-lips" width={size} height={size * 0.62} viewBox="0 0 200 124" style={{ ...style, transform: `rotate(${rot}deg)` }} aria-hidden>
      <defs>
        <pattern id="ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="1.7" fill="#c2106c" />
        </pattern>
        <pattern id="ht2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="2.5" cy="2.5" r="1" fill="#ffffff" />
        </pattern>
      </defs>
      {/* 白色剪紙邊 */}
      <path d="M8 62 C30 22 70 10 100 30 C130 10 170 22 192 62 C170 104 130 120 100 118 C70 120 30 104 8 62 Z" fill="#fffaf2" />
      <path d="M16 62 C36 30 70 20 100 38 C130 20 164 30 184 62 C164 98 130 112 100 110 C70 112 36 98 16 62 Z" fill="#ff4fa3" />
      <path d="M16 62 C36 30 70 20 100 38 C130 20 164 30 184 62 C164 98 130 112 100 110 C70 112 36 98 16 62 Z" fill="url(#ht)" opacity=".55" />
      <path d="M22 62 C60 70 140 70 178 62 C140 78 60 78 22 62 Z" fill="#7d0a43" />
      <path d="M60 84 C80 96 120 96 140 84" stroke="url(#ht2)" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".9" />
      <path d="M70 40 C82 34 92 38 98 44" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
    </svg>
  );
}

export default function Collage() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="bd-torn" />
      <div className="bd-halftone a" />
      <div className="bd-halftone b" />
      <PaperStar size={190} rot={-14} style={{ left: '-40px', top: '38vh' }} />
      <PaperStar size={120} rot={18} style={{ left: '7vw', top: '62vh' }} />
      <PaperStar size={230} rot={10} style={{ right: '-60px', top: '52vh' }} />
      <PaperStar size={110} rot={-8} style={{ right: '9vw', top: '20vh' }} />
      <HalftoneLips size={300} rot={-18} style={{ left: '-50px', bottom: '-30px' }} />
      <HalftoneLips size={210} rot={22} style={{ right: '-30px', top: '14vh' }} />
    </div>
  );
}
