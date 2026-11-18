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

const NAV: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '', label: '今天', icon: Sun },
  { path: 'roadmap', label: '路線圖', icon: CalendarRange },
  { path: 'programs', label: '選校', icon: GraduationCap },
  { path: 'docs', label: '文件', icon: FolderOpen },
  { path: 'review', label: '回顧', icon: NotebookPen },
  { path: 'settings', label: '設定', icon: SettingsIcon },
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
  const [section, sub] = route.split('/');
  let page;
  switch (section) {
    case 'programs':
      page = sub ? <ProgramDetail id={sub} /> : <Programs />;
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
    case 'settings':
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
            ✎
          </span>
          <span>申請手帳</span>
        </div>
        <ul>
          {NAV.map((n) => {
            const active = (section || '') === n.path;
            return (
              <li key={n.path}>
                <a href={`#/${n.path}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
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
          <span className="brand-mini">申請手帳</span>
          <SaveIndicator />
        </div>
        {page}
      </main>
    </div>
  );
}
