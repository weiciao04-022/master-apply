import { useState } from 'react';
import { CalendarDays, Coffee, Flag, Hourglass, ListChecks, Plus, Search, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import type { Task } from '../types';
import { TaskCard, TaskForm, TaskRow, newTask } from '../components/tasks';
import { DateKindBadge, Empty, Progress, Section } from '../components/ui';
import { Heatmap } from '../components/charts';
import { fmt, inRange, relative, startOfWeek, toISO, weekday } from '../lib/dates';
import { isRestDay, tasksOn } from '../lib/scheduler';
import { phaseProgress } from '../lib/logic';
import { WEEKDAYS } from '../labels';

export default function Today() {
  const { data, today } = useStore();
  const [editing, setEditing] = useState<Task | null>(null);
  const s = data.settings;

  const open = tasksOn(today, data.tasks).filter((t) => t.status === 'todo');
  // 今天打勾的任務留在畫面上，作為完成回饋
  const doneToday = data.tasks.filter(
    (t) => t.status === 'done' && t.completedAt && toISO(new Date(t.completedAt)) === today && !data.tasks.some((c) => c.parentId === t.id),
  );
  const shown = [...open, ...doneToday];
  const busy = s.busyPeriods.find((p) => inRange(today, p.start, p.end));
  const rest = isRestDay(today, s);

  const upcoming = data.tasks
    .filter((t) => t.status === 'todo' && t.type === 'mine' && t.scheduledDate && t.scheduledDate > today)
    .sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!))
    .slice(0, 3);

  const deadlines = data.milestones
    .filter((m) => m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const week = startOfWeek(today);
  const review = data.reviews.find((r) => r.weekStart === week);
  const focus = (review?.focusTaskIds ?? []).map((id) => data.tasks.find((t) => t.id === id)).filter(Boolean) as Task[];

  const waiting = data.tasks.filter((t) => t.type === 'waiting' && t.status === 'todo');
  const verify = data.tasks.filter((t) => t.type === 'verify' && t.status === 'todo');

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{fmt(today, true)}</p>
        <h1>今天做一點</h1>
        {busy && (
          <p className="notice">
            <Coffee size={16} aria-hidden />
            {fmt(busy.end)} 前是「{busy.label}」期間
            {busy.allowCategories.length ? '，只安排相關的小任務。' : '，不安排任務。'}
          </p>
        )}
        {s.lastPlannedOn === today && s.lastReplanCount > 0 && (
          <p className="notice soft">
            <CalendarDays size={16} aria-hidden />
            已把 {s.lastReplanCount} 項逾期任務分散到之後的工作日，每天不超過 {s.maxTasksPerDay} 項。
          </p>
        )}
      </header>

      <Section
        title="今日任務"
        icon={ListChecks}
        action={
          <button className="btn sm" onClick={() => setEditing(newTask())}>
            <Plus size={16} />
            新增任務
          </button>
        }
      >
        {shown.length === 0 ? (
          <Empty icon={Sparkles} title="今天沒有必要任務">
            {rest ? <p>今天是{WEEKDAYS[weekday(today)]}，設定為休息日。</p> : <p>照自己的步調就好，不需要額外找事做。</p>}
          </Empty>
        ) : (
          <div className="task-list">
            {shown.map((t) => (
              <TaskCard key={t.id} task={t} onEdit={setEditing} />
            ))}
            {open.length === 0 && <p className="done-note">今天的任務都完成了 🌱</p>}
          </div>
        )}
        {upcoming.length > 0 && (
          <details className="upcoming">
            <summary>接下來排定的任務（{upcoming.length}）</summary>
            <ul className="rows">
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          </details>
        )}
      </Section>

      <div className="grid-2">
        <Section title="最近期限" icon={Flag}>
          {deadlines.length === 0 ? (
            <p className="muted">尚無日期。可到「路線圖」新增。</p>
          ) : (
            <ul className="deadlines">
              {deadlines.map((m) => {
                const p = data.programs.find((x) => x.id === m.programId);
                return (
                  <li key={m.id}>
                    <div className="dl-date">
                      <strong>{fmt(m.date)}</strong>
                      <span className="muted small">{relative(m.date, today)}</span>
                    </div>
                    <div>
                      <p>{m.title}</p>
                      <div className="badges">
                        <DateKindBadge kind={m.kind} />
                        {p && <span className="muted small">{p.school}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="本週重點" icon={Target} action={<a className="btn ghost sm" href="#/review">設定</a>}>
          {focus.length === 0 ? (
            <p className="muted">本週還沒選重點。可在「回顧」頁挑最多三項。</p>
          ) : (
            <ul className="rows">
              {focus.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="申請階段進度" icon={TrendingUp}>
        <p className="muted small">依各階段任務計算（不含等待他人；拆小的任務只算小步驟）。</p>
        <div className="phase-progress">
          {[...data.phases]
            .sort((a, b) => a.order - b.order)
            .map((p) => {
              const pr = phaseProgress(p.id, data.tasks);
              return <Progress key={p.id} label={p.name} done={pr.done} total={pr.total} />;
            })}
        </div>
      </Section>

      <div className="grid-2">
        <Section title={`等待他人（${waiting.length}）`} icon={Hourglass}>
          <p className="muted small">不算進每日工作，收到回覆後打勾。</p>
          {waiting.length === 0 ? (
            <p className="muted">目前沒有。</p>
          ) : (
            <ul className="rows">
              {waiting.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </Section>
        <Section title={`待查證（${verify.length}）`} icon={Search}>
          <p className="muted small">等官方公布或需要再確認的事項，不排入每日任務。</p>
          {verify.length === 0 ? (
            <p className="muted">目前沒有。</p>
          ) : (
            <ul className="rows">
              {verify.map((t) => (
                <TaskRow key={t.id} task={t} onEdit={setEditing} />
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="累積成果" icon={CalendarDays}>
        <Heatmap tasks={data.tasks} today={today} />
      </Section>

      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
