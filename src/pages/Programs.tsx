import { useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, Compass, LayoutGrid, Pause, Plus, Rows3, School, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '../store';
import type { AppData, Program, ProgramStatus } from '../types';
import { PROGRAM_STATUS } from '../labels';
import { Badge, Empty, Progress } from '../components/ui';
import { ProgramForm, newProgram } from '../components/programForm';
import { materialProgress, moneyText } from '../lib/logic';
import { fmt } from '../lib/dates';
import { go, programHref } from '../lib/route';

export const STATUS_ICON: Record<ProgramStatus, LucideIcon> = {
  exploring: Compass,
  considering: Star,
  applying: CheckCircle2,
  paused: Pause,
};

export function StatusBadge({ status }: { status: ProgramStatus }) {
  return (
    <Badge icon={STATUS_ICON[status]} tone={`st-${status}`}>
      {PROGRAM_STATUS[status]}
    </Badge>
  );
}

/** 學程的官方截止日；沒有就回傳 null（顯示「尚未公布」） */
export function officialDeadline(d: AppData, programId: string, today: string) {
  const list = d.milestones.filter((m) => m.programId === programId && m.kind === 'official').sort((a, b) => a.date.localeCompare(b.date));
  return list.find((m) => m.date >= today) ?? list.at(-1) ?? null;
}

export function useMaterial(programId: string) {
  const { data } = useStore();
  return materialProgress(programId, data.requirements, (id) => !!id && data.assets.find((a) => a.id === id)?.status === 'ready');
}

function DeadlineCell({ p }: { p: Program }) {
  const { data, today } = useStore();
  const m = officialDeadline(data, p.id, today);
  return m ? <span>{fmt(m.date)}</span> : <span className="muted">尚未公布</span>;
}

function MaterialCell({ p }: { p: Program }) {
  const m = useMaterial(p.id);
  if (m.total === 0) return <span className="muted small">尚未建立清單</span>;
  return <Progress done={m.submitted} total={m.total} label="已提交" />;
}

function VerifyCell({ p }: { p: Program }) {
  const { data } = useStore();
  const n = data.sources.filter((s) => s.programId === p.id).length;
  return n ? <Badge icon={CheckCircle2} tone="ok">{n} 筆來源</Badge> : <Badge icon={CircleHelp} tone="warn">待查</Badge>;
}

export default function Programs() {
  const { data } = useStore();
  const [view, setView] = useState<'table' | 'cards'>(() => (window.innerWidth < 720 ? 'cards' : 'table'));
  const [country, setCountry] = useState('');
  const [field, setField] = useState('');
  const [status, setStatus] = useState<ProgramStatus | ''>('');
  const [editing, setEditing] = useState<Program | null>(null);

  const countries = useMemo(() => [...new Set(data.programs.map((p) => p.country).filter(Boolean))], [data.programs]);
  const fields = useMemo(() => [...new Set(data.programs.map((p) => p.field).filter(Boolean))], [data.programs]);
  const list = data.programs
    .filter((p) => (!country || p.country === country) && (!field || p.field === field) && (!status || p.status === status))
    .sort((a, b) => a.school.localeCompare(b.school) || a.programName.localeCompare(b.programName));

  const label = `${data.settings.intakeYear} ${data.settings.intakeTerm}`;

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">目標：{label}</p>
          <h1>選校與學程</h1>
        </div>
        <button className="btn primary" onClick={() => setEditing(newProgram(label))}>
          <Plus size={18} />
          新增學程
        </button>
      </header>

      <div className="toolbar" role="group" aria-label="篩選與檢視">
        <select className="input" aria-label="國家" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">所有國家</option>
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" aria-label="領域" value={field} onChange={(e) => setField(e.target.value)}>
          <option value="">所有領域</option>
          {fields.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input" aria-label="申請狀態" value={status} onChange={(e) => setStatus(e.target.value as ProgramStatus | '')}>
          <option value="">所有狀態</option>
          {Object.entries(PROGRAM_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="seg" role="radiogroup" aria-label="檢視方式">
          <button role="radio" aria-checked={view === 'table'} className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
            <Rows3 size={16} />
            表格
          </button>
          <button role="radio" aria-checked={view === 'cards'} className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>
            <LayoutGrid size={16} />
            卡片
          </button>
        </div>
      </div>
      <p className="muted small">
        顯示 {list.length} / {data.programs.length} 個學程。招生資訊以學校官方來源為準；尚未查核或未公布的欄位會標示出來。
      </p>

      {list.length === 0 ? (
        <Empty icon={School} title="沒有符合條件的學程" />
      ) : view === 'table' ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>學校｜學程</th>
                <th>狀態</th>
                <th>國家／領域</th>
                <th>學位</th>
                <th>修業時間</th>
                <th>學費（原幣）</th>
                <th>官方截止日</th>
                <th>必要材料</th>
                <th>資料來源</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a href={programHref(p.id)} className="strong-link">
                      {p.school}
                      <br />
                      <span className="muted">{p.programName}</span>
                    </a>
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td>
                    {p.country || '—'}
                    <br />
                    <span className="muted">{p.field || '—'}</span>
                  </td>
                  <td>{p.degree || <span className="muted">待查</span>}</td>
                  <td>{p.duration || <span className="muted">待查</span>}</td>
                  <td>{moneyText(p.tuition)}</td>
                  <td>
                    <DeadlineCell p={p} />
                  </td>
                  <td className="min-w">
                    <MaterialCell p={p} />
                  </td>
                  <td>
                    <VerifyCell p={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-grid">
          {list.map((p) => (
            <a key={p.id} href={programHref(p.id)} className="card program-card">
              <div className="badges">
                <StatusBadge status={p.status} />
                <VerifyCell p={p} />
              </div>
              <h2>{p.school}</h2>
              <p className="muted">{p.programName}</p>
              <dl className="mini-dl">
                <dt>國家／領域</dt>
                <dd>
                  {p.country || '—'}・{p.field || '—'}
                </dd>
                <dt>官方截止日</dt>
                <dd>
                  <DeadlineCell p={p} />
                </dd>
                <dt>學費</dt>
                <dd>{moneyText(p.tuition)}</dd>
              </dl>
              <MaterialCell p={p} />
            </a>
          ))}
        </div>
      )}

      {editing && <ProgramForm program={editing} onClose={() => setEditing(null)} onSaved={(p) => go(programHref(p.id))} />}
    </div>
  );
}
