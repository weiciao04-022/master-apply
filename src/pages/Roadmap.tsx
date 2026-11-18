import { useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useStore } from '../store';
import type { Milestone, Task } from '../types';
import { DateKindBadge, Section } from '../components/ui';
import { MilestoneModal } from './ProgramDetail';
import { TaskForm, useToggleDone } from '../components/tasks';
import { addDays, addMonths, daysInMonth, diffDays, fmt, fmtShort, startOfMonth, startOfWeek, WEEKDAY_LABELS } from '../lib/dates';
import { isRestDay } from '../lib/scheduler';
import { applyIntakeChange, previewIntakeChange, uid, type ShiftChange } from '../lib/logic';

type View = 'year' | 'month' | 'week';

function Legend() {
  return (
    <div className="legend" aria-label="圖例">
      <DateKindBadge kind="official" />
      <DateKindBadge kind="self" />
      <DateKindBadge kind="estimate" />
      <span className="muted small">階段長條皆為暫估範圍</span>
    </div>
  );
}

function YearView({ year, onPick }: { year: number; onPick: (m: Milestone) => void }) {
  const { data, today } = useStore();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const total = diffDays(end, start) + 1;
  const pos = (d: string) => (Math.min(Math.max(diffDays(d, start), 0), total) / total) * 100;
  const phases = [...data.phases].sort((a, b) => a.order - b.order);
  const ms = data.milestones.filter((m) => m.date >= start && m.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  const showToday = today >= start && today <= end;

  return (
    <div className="timeline">
      <div className="tl-inner">
        <div className="tl-months" aria-hidden>
          <span style={{ border: 0 }} />
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i}>{i + 1} 月</span>
          ))}
        </div>
        {phases.map((p) => {
          const visible = p.end >= start && p.start <= end;
          const current = today >= p.start && today <= p.end;
          return (
            <div className="tl-row" key={p.id}>
              <div className="tl-row-label">{p.name}</div>
              <div className="tl-track">
                {visible && (
                  <div
                    className={`tl-bar ${current ? 'current' : ''}`}
                    style={{ left: `${pos(p.start)}%`, width: `${Math.max(pos(p.end) - pos(p.start), 1.5)}%` }}
                    title={`${p.name}：${fmt(p.start)} – ${fmt(p.end)}（暫估）`}
                  >
                    {fmtShort(p.start)}–{fmtShort(p.end)}
                  </div>
                )}
                {showToday && <div className="tl-today" style={{ left: `${pos(today)}%` }} aria-hidden />}
              </div>
            </div>
          );
        })}
        <div className="tl-row">
          <div className="tl-row-label">日期</div>
          <div className="tl-markers" style={{ minHeight: ms.length ? 175 : 40 }}>
            {showToday && (
              <>
                <div className="tl-today" style={{ left: `${pos(today)}%` }} aria-hidden />
                <span className="tl-today-label" style={{ left: `${pos(today)}%`, top: 0 }}>
                  今天
                </span>
              </>
            )}
            {ms.length === 0 && <p className="muted small" style={{ paddingTop: 8 }}>這一年沒有日期。</p>}
            {ms.map((m, i) => (
              <button
                key={m.id}
                className="tl-marker"
                style={{ left: `${pos(m.date)}%`, top: 18 + (i % 3) * 48 }}
                onClick={() => onPick(m)}
                aria-label={`${m.title}，${fmt(m.date)}，${m.kind}`}
              >
                <span className={`tl-dot ${m.kind}`} aria-hidden />
                <span>
                  {fmtShort(m.date)} {m.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function dayItems(date: string, milestones: Milestone[], tasks: Task[]) {
  return {
    ms: milestones.filter((m) => m.date === date),
    ts: tasks.filter((t) => t.type === 'mine' && t.scheduledDate === date && !tasks.some((c) => c.parentId === t.id)),
  };
}

function MonthView({ month, onPick, onTask }: { month: string; onPick: (m: Milestone) => void; onTask: (t: Task) => void }) {
  const { data, today } = useStore();
  const first = startOfWeek(month);
  const days = Math.ceil((diffDays(month, first) + daysInMonth(month)) / 7) * 7;
  const cells = Array.from({ length: days }, (_, i) => addDays(first, i));
  return (
    <div className="cal" role="grid" aria-label={`${month.slice(0, 7)} 月曆`}>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <div className="cal-head" key={d} role="columnheader">
          {WEEKDAY_LABELS[d]}
        </div>
      ))}
      {cells.map((d) => {
        const { ms, ts } = dayItems(d, data.milestones, data.tasks);
        const out = d.slice(0, 7) !== month.slice(0, 7);
        return (
          <div key={d} role="gridcell" className={`cal-cell ${out ? 'out' : ''} ${d === today ? 'today' : ''} ${isRestDay(d, data.settings) ? 'rest' : ''}`}>
            <span className="cal-day">{Number(d.slice(8))}</span>
            {ms.map((m) => (
              <button key={m.id} className={`cal-item ${m.kind} link-btn`} style={{ textDecoration: 'none' }} title={`${m.title}（${m.kind}）`} onClick={() => onPick(m)}>
                {m.kind === 'official' ? '● ' : m.kind === 'self' ? '◆ ' : '○ '}
                {m.title}
              </button>
            ))}
            {ts.map((t) => (
              <button key={t.id} className={`cal-item task link-btn ${t.status === 'done' ? 'done' : ''}`} style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }} title={t.title} onClick={() => onTask(t)}>
                {t.status === 'done' ? '✓ ' : '□ '}
                {t.title}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ week, onPick, onTask }: { week: string; onPick: (m: Milestone) => void; onTask: (t: Task) => void }) {
  const { data, today } = useStore();
  const toggle = useToggleDone();
  return (
    <div className="week-cols">
      {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d) => {
        const { ms, ts } = dayItems(d, data.milestones, data.tasks);
        const rest = isRestDay(d, data.settings);
        return (
          <div key={d} className={`week-col ${d === today ? 'today' : ''} ${rest ? 'rest' : ''}`}>
            <h3>
              {fmt(d, true).slice(5)}
              {rest && <span className="muted small">・休息日</span>}
            </h3>
            {ms.map((m) => (
              <button key={m.id} className="link-btn small" onClick={() => onPick(m)}>
                <DateKindBadge kind={m.kind} /> {m.title}
              </button>
            ))}
            {ts.map((t) => (
              <label key={t.id} className="check-label small">
                <input type="checkbox" checked={t.status === 'done'} onChange={() => toggle(t)} style={{ width: 18, height: 18, accentColor: '#724319' }} />
                <button className="link-btn" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none' }} onClick={() => onTask(t)}>
                  {t.title}
                </button>
              </label>
            ))}
            {ms.length + ts.length === 0 && <span className="muted small">—</span>}
          </div>
        );
      })}
    </div>
  );
}

function IntakeChanger() {
  const store = useStore();
  const { data, today } = store;
  const [year, setYear] = useState(String(data.settings.intakeYear));
  const [preview, setPreview] = useState<ShiftChange[] | null>(null);
  const n = Number(year);
  const valid = Number.isInteger(n) && n >= 2026 && n <= 2040;
  const actionLabel = { shift: '平移', recheck: '保留，需重新查核', keep: '保留' };

  return (
    <Section title={`目標入學：${data.settings.intakeYear} ${data.settings.intakeTerm}`} icon={RefreshCw}>
      <div className="add-row" style={{ marginTop: 0 }}>
        <input className="input" style={{ maxWidth: 140 }} type="number" aria-label="新的入學年度" value={year} onChange={(e) => (setYear(e.target.value), setPreview(null))} />
        <button className="btn" disabled={!valid || n === data.settings.intakeYear} onClick={() => setPreview(previewIntakeChange(data, n, today))}>
          預覽時程調整
        </button>
      </div>
      {preview && (
        <>
          <p className="small">
            改成 <strong>{n} {data.settings.intakeTerm}</strong> 會調整以下 {preview.length} 項。官方截止日不會自動推算。
          </p>
          <div className="table-wrap">
            <table className="table shift-table">
              <thead>
                <tr>
                  <th>項目</th>
                  <th>類型</th>
                  <th>原日期</th>
                  <th>調整後</th>
                  <th>處理</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((c) => (
                  <tr key={c.entity + c.id}>
                    <td>
                      {c.title}
                      {c.note && <span className="muted small block">{c.note}</span>}
                    </td>
                    <td>{c.kindLabel}</td>
                    <td>{fmt(c.from)}</td>
                    <td>{fmt(c.to)}</td>
                    <td>{actionLabel[c.action]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-actions" style={{ marginTop: 8 }}>
            <button
              className="btn primary"
              onClick={() => {
                store.mutate(['settings', 'phases', 'milestones', 'tasks', 'programs'], (d) => applyIntakeChange(d, n, preview));
                setPreview(null);
              }}
            >
              確認套用
            </button>
            <button className="btn ghost" onClick={() => setPreview(null)}>
              取消
            </button>
          </div>
        </>
      )}
    </Section>
  );
}

export default function Roadmap() {
  const { data, today, upsert } = useStore();
  const [view, setView] = useState<View>('year');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(startOfMonth(today));
  const [week, setWeek] = useState(startOfWeek(today));
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [task, setTask] = useState<Task | null>(null);

  const label = view === 'year' ? `${year} 年` : view === 'month' ? `${month.slice(0, 4)} 年 ${Number(month.slice(5, 7))} 月` : `${fmt(week)} – ${fmtShort(addDays(week, 6))}`;
  const move = (n: number) => {
    if (view === 'year') setYear(year + n);
    else if (view === 'month') setMonth(addMonths(month, n));
    else setWeek(addDays(week, 7 * n));
  };
  const reset = () => {
    setYear(Number(today.slice(0, 4)));
    setMonth(startOfMonth(today));
    setWeek(startOfWeek(today));
  };

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">探索選校 → 能力與作品準備 → 文件製作 → 送件 → 面試 → 結果與入學</p>
          <h1>申請路線圖</h1>
        </div>
        <button className="btn primary" onClick={() => setEditing({ id: uid('ms'), title: '', date: today, kind: 'self', programId: null, sourceId: null, note: '' })}>
          <CalendarPlus size={18} />
          新增日期
        </button>
      </header>

      <div className="toolbar">
        <div className="seg" role="radiogroup" aria-label="檢視範圍">
          {(['year', 'month', 'week'] as View[]).map((v) => (
            <button key={v} role="radio" aria-checked={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {{ year: '年度', month: '月份', week: '本週' }[v]}
            </button>
          ))}
        </div>
        <div className="week-nav">
          <button className="icon-btn" aria-label="上一段" onClick={() => move(-1)}>
            <ChevronLeft size={20} />
          </button>
          <span>{label}</span>
          <button className="icon-btn" aria-label="下一段" onClick={() => move(1)}>
            <ChevronRight size={20} />
          </button>
          <button className="btn ghost sm" onClick={reset}>
            今天
          </button>
        </div>
      </div>
      <Legend />

      <section className="card">
        {view === 'year' && <YearView year={year} onPick={setEditing} />}
        {view === 'month' && <MonthView month={month} onPick={setEditing} onTask={setTask} />}
        {view === 'week' && <WeekView week={week} onPick={setEditing} onTask={setTask} />}
      </section>

      <IntakeChanger />

      {editing && <MilestoneModal milestone={editing} onClose={() => setEditing(null)} onSave={(m) => upsert('milestones', m)} />}
      {task && <TaskForm task={task} onClose={() => setTask(null)} />}
      <p className="muted small">共 {data.milestones.length} 個日期、{data.phases.length} 個階段。</p>
    </div>
  );
}
