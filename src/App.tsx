import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Menu, X, FolderOpen, GraduationCap, HardDrive, NotebookPen, Settings as SettingsIcon, Sun, type LucideIcon } from 'lucide-react';
import { useStore } from './store';
import Today from './pages/Today';
import Programs from './pages/Programs';
import ProgramDetail from './pages/ProgramDetail';
import Review from './pages/Review';
import Roadmap from './pages/Roadmap';
import Docs from './pages/Docs';
import SettingsPage from './pages/Settings';
import { pageHref, safeId } from './lib/route';
import { ConfirmHost } from './components/confirm';
import SparkleCursor from './components/sparkleCursor';
import { HeartFolder } from './components/kawaii';

const NAV: { path: string; label: string; en: string; icon: LucideIcon }[] = [
  { path: 'today', en: 'today', label: '今天', icon: Sun },
  { path: 'roadmap', en: 'roadmap', label: '路線圖', icon: CalendarRange },
  { path: 'programs', en: 'schools', label: '選校', icon: GraduationCap },
  { path: 'docs', en: 'files', label: '文件', icon: FolderOpen },
  { path: 'review', en: 'recap', label: '回顧', icon: NotebookPen },
  { path: 'setup', en: 'settings', label: '設定', icon: SettingsIcon },
];

function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read());
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

const MASTHEAD: Record<string, [string, string]> = {
  today: ['Today', 'just do a little ♡'],
  roadmap: ['The Roadmap', 'dream it, plan it, get it'],
  programs: ['Dream Schools', 'it’s giving grad school'],
  docs: ['The Files', 'portfolio era ✿'],
  review: ['Weekly Recap', 'look how far you’ve come'],
  setup: ['Settings', 'behind the scenes'],
};

function Masthead({ section }: { section: string }) {
  const [title, tag] = MASTHEAD[section] ?? MASTHEAD.today;
  return (
    <div className="masthead" aria-hidden>
      <span className="sparkle s1">✦</span>
      <span className="sparkle s2">✧</span>
      <span className="sparkle s3">✦</span>
      <span className="sparkle s4">♡</span>
      <p className="issue-line">vol. 01 ✦ grad school edition ✦ {section}</p>
      <p className="masthead-title">{title}</p>
      <span className="cover-sticker">
        it girl
        <br />
        era ♡
      </span>
      <p className="masthead-tag">{tag}</p>
    </div>
  );
}

function SaveIndicator() {
  const { saveState } = useStore();
  const text = { idle: '已載入', saving: '儲存中…', saved: '已儲存', error: '儲存失敗，請匯出備份' }[saveState];
  return (
    <span className={`save-state ${saveState}`} role="status">
      <HardDrive size={14} aria-hidden />
      {text}
    </span>
  );
}

export default function App() {
  const route = useRoute();
  const { data } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const firstLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => setMenuOpen(false), [route]);
  useEffect(() => {
    if (!menuOpen) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  let section = route || 'today';
  let page;
  if (section.startsWith('program-')) {
    const key = section.slice('program-'.length);
    const p = data.programs.find((x) => safeId(x.id) === key);
    section = 'programs';
    page = <ProgramDetail id={p?.id ?? key} />;
  } else switch (section) {
    case 'programs':
      page = <Programs />;
      break;
    case 'roadmap':
      page = <Roadmap />;
      break;
    case 'docs':
      page = <Docs />;
      break;
    case 'review':
      page = <Review />;
      break;
    case 'setup':
      page = <SettingsPage />;
      break;
    default:
      page = <Today />;
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button
          className="menu-btn"
          aria-expanded={menuOpen}
          aria-controls="drawer"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={20} aria-hidden />
          <span>menu</span>
        </button>
        <a className="topbar-brand" href={pageHref('today')}>
          apply diary
        </a>
        <SaveIndicator />
      </header>

      <div className={`drawer-overlay ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden />
      <nav id="drawer" className={`drawer ${menuOpen ? 'open' : ''}`} aria-label="主要頁面">
        <div className="drawer-head">
          <span className="drawer-title">✦ menu ✦</span>
          <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="關閉選單">
            <X size={22} />
          </button>
        </div>
        <ul>
          {NAV.map((n, i) => {
            const active = section === n.path;
            return (
              <li key={n.path} style={{ ['--i' as string]: i }}>
                <a
                  ref={i === 0 ? firstLink : undefined}
                  href={pageHref(n.path)}
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon">
                    {n.path === 'docs' ? <HeartFolder size={30} /> : <n.icon size={20} aria-hidden />}
                  </span>
                  <span className="nav-label">{n.label}</span>
                  <span className="nav-en">{n.en}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="drawer-foot">
          <p className="sticker-note">資料只存在這個瀏覽器 ♡<br />記得到「設定」匯出備份</p>
        </div>
      </nav>

      <main className="main">
        <div className="page-wrap">
          <Masthead section={section} />
          {page}
          <footer className="site-foot">made with ♡ for {data.settings.intakeYear} {data.settings.intakeTerm} ✦ you got this</footer>
        </div>
      </main>
      <ConfirmHost />
      <SparkleCursor />
    </div>
  );
}
