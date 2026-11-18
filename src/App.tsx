import { useEffect, useState } from 'react';
import { CalendarRange, FolderOpen, GraduationCap, HardDrive, NotebookPen, Settings as SettingsIcon, Sun, type LucideIcon } from 'lucide-react';
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

const NAV: { path: string; label: string; icon: LucideIcon }[] = [
  { path: 'today', label: '今天', icon: Sun },
  { path: 'roadmap', label: '路線圖', icon: CalendarRange },
  { path: 'programs', label: '選校', icon: GraduationCap },
  { path: 'docs', label: '文件', icon: FolderOpen },
  { path: 'review', label: '回顧', icon: NotebookPen },
  { path: 'setup', label: '設定', icon: SettingsIcon },
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
      <p className="masthead-title">{title}</p>
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
      <nav className="sidenav" aria-label="主要頁面">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ♡
          </span>
          <span>apply diary</span>
        </div>
        <ul>
          {NAV.map((n) => {
            const active = section === n.path;
            return (
              <li key={n.path}>
                <a href={pageHref(n.path)} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                  <n.icon size={20} aria-hidden />
                  <span>{n.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="sidenav-foot">
          <SaveIndicator />
          <p>資料只保存在目前這個瀏覽器，請定期到「設定」匯出備份。</p>
        </div>
      </nav>
      <main className="main">
        <div className="mobile-top">
          <span className="brand-mini">apply diary ♡</span>
          <SaveIndicator />
        </div>
        <div className="page-wrap">
          <Masthead section={section} />
          {page}
        </div>
      </main>
      <ConfirmHost />
    </div>
  );
}
