import { useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, KanbanSquare, Target } from 'lucide-react';
import { useStore } from '../store';
import type { Task, WeeklyReview } from '../types';
import { Heatmap } from '../components/charts';
import { Badge, Progress, Section, TextArea } from '../components/ui';
import { TaskForm, TaskRow } from '../components/tasks';
import { addDays, fmt, startOfWeek, toISO } from '../lib/dates';
import { INTERVIEW, RESULT, SUBMISSION } from '../labels';
import { StatusBadge, useMaterial } from './Programs';
import type { Program } from '../types';

function BoardCard({ p }: { p: Program }) {
  const { data } = useStore();
  const mp = useMaterial(p.id);
  const app = data.applications.find((a) => a.programId === p.id);
  return (
    <article className="card board-card">
      <a href={`#/programs/${p.id}`} className="strong-link">
        {p.school}
      </a>
      <p className="muted small">{p.programName}</p>
      <StatusBadge status={p.status} />
      {mp.total === 0 ? (
        <p className="muted small">尚未建立材料清單</p>
      ) : (
        <>
          <Progress label="已上傳" done={mp.uploaded} total={mp.total} />
          <Progress label="已提交" done={mp.submitted} total={mp.total} />
          {mp.missing.length > 0 && (
            <p className="small">
              <strong>缺件：</strong>
              {mp.missing.map((r) => r.name).join('、')}
            </p>
          )}
        </>
      )}
      {app && (
        <div className="badges">
          <Badge>{SUBMISSION[app.submission]}</Badge>
          {app.interview !== 'none' && <Badge>面試：{INTERVIEW[app.interview]}</Badge>}
          <Badge tone={app.result === 'admitted' ? 'ok' : 'plain'}>{RESULT[app.result]}</Badge>
        </div>
      )}
    </article>
  );
}

export default function Review() {
  const { data, today, upsert } = useStore();
  const [week, setWeek] = useState(startOfWeek(today));
  const [editing, setEditing] = useState<Task | null>(null);
  const end = addDays(week, 6);
  const nextWeek = addDays(week, 7);

  const leaves = data.tasks.filter((t) => !data.tasks.some((c) => c.parentId === t.id));
  const completed = leaves.filter((t) => t.status === 'done' && t.completedAt && toISO(new Date(t.completedAt)) >= week && toISO(new Date(t.completedAt)) <= end);
  const unfinished = leaves.filter((t) => t.status === 'todo' && t.type === 'mine' && t.scheduledDate && t.scheduledDate >= week && t.scheduledDate <= end && t.scheduledDate < today);
  const plannedRest = leaves.filter((t) => t.status === 'todo' && t.type === 'mine' && t.scheduledDate && t.scheduledDate >= today && t.scheduledDate <= end);

  const nextReview: WeeklyReview = data.reviews.find((r) => r.weekStart === nextWeek) ?? { id: nextWeek, weekStart: nextWeek, focusTaskIds: [], note: '' };
  const thisReview: WeeklyReview = data.reviews.find((r) => r.weekStart === week) ?? { id: week, weekStart: week, focusTaskIds: [], note: '' };
  const candidates = data.tasks.filter((t) => t.status === 'todo' && !t.parentId).sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const toggleFocus = (id: string) => {
    const on = nextReview.focusTaskIds.includes(id);
    if (!on && nextReview.focusTaskIds.length >= 3) return;
    upsert('reviews', { ...nextReview, focusTaskIds: on ? nextReview.focusTaskIds.filter((x) => x !== id) : [...nextReview.focusTaskIds, id] });
  };

  const active = data.programs.filter((p) => p.status !== 'paused');

  return (
    <div className="page">
      <header className="page-head">
        <h1>每週回顧與申請看板</h1>
        <div className="week-nav">
          <button className="icon-btn" aria-label="上一週" onClick={() => setWeek(addDays(week, -7))}>
            <ChevronLeft size={20} />
          </button>
          <span>
            {fmt(week)} – {fmt(end)}
          </span>
          <button className="icon-btn" aria-label="下一週" onClick={() => setWeek(addDays(week, 7))}>
            <ChevronRight size={20} />
          </button>
          {week !== startOfWeek(today) && (
            <button className="btn ghost sm" onClick={() => setWeek(startOfWeek(today))}>
              回到本週
            </button>
          )}
        </div>
      </header>

      <div className="grid-2">
        <Section title={`本週實際完成（${completed.length}）`} icon={CheckCircle2}>
          {completed.length === 0 ? (
            <p className="muted">這週還沒有完成紀錄。</p>
          ) : (
            <ul className="rows">
              {completed.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} showDate={false} />
              ))}
            </ul>
          )}
        </Section>
        <Section title={`尚未完成（${unfinished.length + plannedRest.length}）`} icon={CircleDashed}>
          {unfinished.length + plannedRest.length === 0 ? (
            <p className="muted">沒有。</p>
          ) : (
            <ul className="rows">
              {[...unfinished, ...plannedRest].map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          )}
          <p className="muted small">過了排定日期還沒做的任務，會在隔天自動分散到之後的工作日。</p>
        </Section>
      </div>

      <Section title={`下週重點（${fmt(nextWeek)} 起，最多三項）`} icon={Target}>
        <p className="muted small">已選 {nextReview.focusTaskIds.length}/3。只是提醒方向，不會額外增加每日任務。</p>
        <div className="focus-pick">
          {candidates.slice(0, 30).map((t) => {
            const on = nextReview.focusTaskIds.includes(t.id);
            const full = !on && nextReview.focusTaskIds.length >= 3;
            return (
              <button key={t.id} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} disabled={full} onClick={() => toggleFocus(t.id)}>
                {t.title}
              </button>
            );
          })}
        </div>
        <label className="field">
          <span className="field-label">本週心得</span>
          <TextArea value={thisReview.note} onChange={(v) => upsert('reviews', { ...thisReview, note: v })} placeholder="這週卡在哪裡？什麼有效？" rows={2} />
        </label>
      </Section>

      <Section title="累積成果" icon={CalendarDays}>
        <Heatmap tasks={data.tasks} today={today} weeks={20} />
      </Section>

      <Section title="申請看板" icon={KanbanSquare}>
        <p className="muted small">完成度以各學程「必要材料」為分母；不提供錄取機率或競爭力分數。暫不申請的學程不列入。</p>
        <div className="card-grid">
          {active.map((p) => (
            <BoardCard key={p.id} p={p} />
          ))}
        </div>
      </Section>

      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
