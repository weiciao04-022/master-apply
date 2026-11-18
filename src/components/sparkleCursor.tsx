import { useEffect, useRef } from 'react';

/**
 * 滑鼠閃光：延遲跟隨的發光光點 + 沿路灑出的小星星。
 * 只在有滑鼠的裝置啟用；系統設定「減少動態效果」時關閉。
 */
const COLORS = ['#ff3d9a', '#ff8cc6', '#ffffff', '#c9a6ff', '#ffd1e8'];
const TRAIL = 6; // 延遲光點數
const EASE = 0.18; // 越小延遲越明顯

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  spin: number;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * r * 0.32, Math.sin(a + Math.PI / 4) * r * 0.32);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function SparkleCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = ref.current;
    if (!fine || reduce || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const mouse = { x: -100, y: -100, seen: false };
    const trail = Array.from({ length: TRAIL }, () => ({ x: -100, y: -100 }));
    const parts: P[] = [];
    let raf = 0;
    let last = performance.now();

    const spawn = (x: number, y: number, n: number, burst = false) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = burst ? 1.5 + Math.random() * 3 : Math.random() * 0.8;
        parts.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp + (burst ? -0.5 : 0.3),
          life: 0,
          max: 550 + Math.random() * 500,
          size: (burst ? 3 : 1.6) + Math.random() * 2.4,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          spin: Math.random() * Math.PI,
        });
      }
      if (parts.length > 220) parts.splice(0, parts.length - 220);
      start();
    };

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // 延遲跟隨的光點：每一顆追前一顆
      let px = mouse.x;
      let py = mouse.y;
      let moving = false;
      trail.forEach((t, i) => {
        t.x += (px - t.x) * EASE;
        t.y += (py - t.y) * EASE;
        if (Math.abs(px - t.x) + Math.abs(py - t.y) > 0.3) moving = true;
        px = t.x;
        py = t.y;
        if (!mouse.seen) return;
        const r = (TRAIL - i) * 0.45 + 0.9;
        const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r * 2.4);
        g.addColorStop(0, i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,140,198,0.75)');
        g.addColorStop(0.35, 'rgba(255,61,154,0.35)');
        g.addColorStop(1, 'rgba(255,61,154,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 灑落的小星星
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        p.vy += 0.012 * dt * 0.06;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.spin += 0.05;
        const k = 1 - p.life / p.max;
        const tw = 0.6 + 0.4 * Math.sin(p.life / 60);
        ctx.globalAlpha = k * tw;
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#ff3d9a';
        ctx.shadowBlur = 3;
        star(ctx, p.x, p.y, p.size * (0.4 + 0.6 * k), p.spin);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      if (moving || parts.length > 0) raf = requestAnimationFrame(tick);
      else raf = 0;
    };

    function start() {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }

    let acc = 0;
    const onMove = (e: PointerEvent) => {
      if (!mouse.seen) {
        trail.forEach((t) => ((t.x = e.clientX), (t.y = e.clientY)));
        mouse.seen = true;
      }
      const d = Math.hypot(e.clientX - mouse.x, e.clientY - mouse.y);
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      acc += d;
      if (acc > 14) {
        spawn(mouse.x, mouse.y, Math.min(3, Math.floor(acc / 14)));
        acc = 0;
      }
      start();
    };
    const onDown = (e: PointerEvent) => spawn(e.clientX, e.clientY, 14, true);
    const onLeave = () => {
      mouse.seen = false;
      start();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="sparkle-cursor" aria-hidden />;
}
