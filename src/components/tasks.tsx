import { useState } from 'react';
import { CalendarArrowUp, FileText, GraduationCap, Pencil, Plus, Scissors, Trash2, Link2 } from 'lucide-react';
import type { Task, TaskCategory, TaskType } from '../types';
import { useStore } from '../store';
import { PRIORITY, TASK_CATEGORY, TASK_TYPE } from '../labels';
import { CheckButton, Field, Modal, MinutesBadge, MultiPick, Select, TaskTypeBadge, TextArea, TextInput, Badge } from './ui';
import { deferTask, depsDone } from '../lib/scheduler';
import { fmt, relative } from '../lib/dates';
import { uid } from '../lib/logic';

export function newTask(partial: Partial<Task> = {}): Task {
  return {
    id: uid('tk'),
    title: '',
    doneCriteria: '',
    minutes: 20,
    category: 'other',
    type: 'mine',
    status: 'todo',
    priority: 2,
    phaseId: null,
    dueDate: null,
    scheduledDate: null,
    pinned: false,
    dependsOn: [],
    assetIds: [],
    programIds: [],
    parentId: null,
    completedAt: null,
    deferCount: 0,
    notes: '',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function useToggleDone() {
  const { patchTask } = useStore();
  return (t: Task) =>
    patchTask(t.id, t.status === 'done' ? { status: 'todo', completedAt: null } : { status: 'done', completedAt: new Date().toISOString() });
}

/** 首頁任務卡：打勾、延後、拆小，顯示完成條件與相關文件 */
export function TaskCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { data, today, patchTask } = useStore();
  const toggle = useToggleDone();
  const [splitting, setSplitting] = useState(false);
  const [msg, setMsg] = useState('');
  const done = task.status === 'done';
  const assets = data.assets.filter((a) => task.assetIds.includes(a.id));
  const programs = data.programs.filter((p) => task.programIds.includes(p.id));
  const byId = new Map(data.tasks.map((t) => [t.id, t]));
  const blocked = !depsDone(task, byId);

  const defer = () => {
    const d = deferTask(task, data.tasks, data.settings, today);
    if (!d) return setMsg('找不到可安排的日期，請檢查休息日與忙碌期間設定');
    patchTask(task.id, { scheduledDate: d, pinned: true, deferCount: task.deferCount + 1 });
  };

  return (
    <article className={`task-card ${done ? 'is-done' : ''}`}>
      <div className="task-main">
        <CheckButton checked={done} onToggle={() => toggle(task)} label={`${done ? '取消完成' : '完成'}：${task.title}`} />
        <div className="task-body">
          <h3 className="task-title">{task.title}</h3>
          <div className="badges">
            <MinutesBadge minutes={task.minutes} />
            <Badge>{TASK_CATEGORY[task.category]}</Badge>
            {task.dueDate && <Badge tone={task.dueDate < today ? 'warn' : 'plain'}>期限 {fmt(task.dueDate)}（{relative(task.dueDate, today)}）</Badge>}
            {task.deferCount > 0 && <Badge>已延後 {task.deferCount} 次</Badge>}
            {blocked && <Badge tone="warn">前置任務未完成</Badge>}
          </div>
          {task.doneCriteria && (
            <p className="criteria">
              <strong>完成條件：</strong>
              {task.doneCriteria}
            </p>
          )}
          {(assets.length > 0 || programs.length > 0) && (
            <ul className="related">
              {assets.map((a) => {
                const link = a.versions.at(-1)?.link;
                return (
                  <li key={a.id}>
                    <FileText size={14} aria-hidden />
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer">
                        {a.title}
                      </a>
                    ) : (
                      <a href="#/docs">{a.title}</a>
                    )}
                  </li>
                );
              })}
              {programs.map((p) => (
                <li key={p.id}>
                  <GraduationCap size={14} aria-hidden />
                  <a href={`#/programs/${p.id}`}>
                    {p.school}｜{p.programName}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {msg && <p className="error small">{msg}</p>}
        </div>
      </div>
      {!done && (
        <div className="task-actions">
          <button className="btn ghost sm" onClick={defer}>
            <CalendarArrowUp size={16} />
            延後
          </button>
          <button className="btn ghost sm" onClick={() => setSplitting(true)}>
            <Scissors size={16} />
            拆小
          </button>
          <button className="btn ghost sm" onClick={() => onEdit(task)}>
            <Pencil size={16} />
            編輯
          </button>
        </div>
      )}
      {splitting && <SplitModal task={task} onClose={() => setSplitting(false)} />}
    </article>
  );
}

/** 拆小：原任務變成母任務，子任務依序排程 */
export function SplitModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { mutate } = useStore();
  const [steps, setSteps] = useState<string[]>(['', '']);
  const [minutes, setMinutes] = useState(15);
  const valid = steps.map((s) => s.trim()).filter(Boolean);

  const save = () => {
    if (valid.length === 0) return;
    mutate(['tasks'], (d) => {
      let prev: string | null = null;
      const children = valid.map((title) => {
        const t = newTask({
          title,
          minutes,
          category: task.category,
          phaseId: task.phaseId,
          dueDate: task.dueDate,
          priority: task.priority,
          programIds: task.programIds,
          assetIds: task.assetIds,
          parentId: task.id,
          dependsOn: prev ? [prev] : task.dependsOn,
        });
        prev = t.id;
        return t;
      });
      return { ...d, tasks: [...d.tasks.map((t) => (t.id === task.id ? { ...t, scheduledDate: null } : t)), ...children] };
    });
    onClose();
  };

  return (
    <Modal
      title={`拆小：${task.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={save} disabled={valid.length === 0}>
            建立 {valid.length} 個小步驟
          </button>
        </>
      }
    >
      <p className="muted small">每一步寫成具體動作，例如「挑選一篇代表作品」。小步驟會依順序排入之後的日子，全部完成後母任務也算完成。</p>
      {steps.map((s, i) => (
        <Field key={i} label={`步驟 ${i + 1}`}>
          <TextInput value={s} onChange={(v) => setSteps(steps.map((x, j) => (j === i ? v : x)))} placeholder="具體可完成的動作" />
        </Field>
      ))}
      <button className="btn ghost sm" onClick={() => setSteps([...steps, ''])}>
        <Plus size={16} />
        再加一步
      </button>
      <Field label="每步預估分鐘">
        <TextInput type="number" value={String(minutes)} onChange={(v) => setMinutes(Math.max(5, Number(v) || 15))} />
      </Field>
    </Modal>
  );
}

/** 新增／編輯任務 */
export function TaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [t, setT] = useState<Task>(task);
  const isNew = !data.tasks.some((x) => x.id === task.id);
  const set = (p: Partial<Task>) => setT((x) => ({ ...x, ...p }));
  const otherTasks = data.tasks.filter((x) => x.id !== t.id && x.parentId !== t.id && x.status !== 'done');

  const save = () => {
    if (!t.title.trim()) return;
    upsert('tasks', { ...t, title: t.title.trim() });
    onClose();
  };

  return (
    <Modal
      title={isNew ? '新增任務' : '編輯任務'}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <button
              className="btn danger ghost"
              onClick={() => {
                if (confirm(`刪除「${t.title}」？子任務也會一起刪除。`)) {
                  remove('tasks', t.id);
                  onClose();
                }
              }}
            >
              <Trash2 size={16} />
              刪除
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={save} disabled={!t.title.trim()}>
            儲存
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="任務名稱（具體動作）">
          <TextInput value={t.title} onChange={(v) => set({ title: v })} placeholder="例如：挑選一篇代表作品" required />
        </Field>
        <Field label="完成條件">
          <TextInput value={t.doneCriteria} onChange={(v) => set({ doneCriteria: v })} placeholder="做到什麼程度算完成" />
        </Field>
        <Field label="類型" hint="等待他人與待查證不會排入每日任務">
          <Select<TaskType> value={t.type} onChange={(v) => set({ type: v })} options={TASK_TYPE} />
        </Field>
        <Field label="類別" hint="忙碌期間只排允許的類別">
          <Select<TaskCategory> value={t.category} onChange={(v) => set({ category: v })} options={TASK_CATEGORY} />
        </Field>
        <Field label="預估分鐘" hint="建議 15–30 分鐘，太大請拆小">
          <TextInput type="number" value={String(t.minutes)} onChange={(v) => set({ minutes: Math.max(5, Number(v) || 0) })} />
        </Field>
        <Field label="重要性">
          <Select<'1' | '2' | '3'>
            value={String(t.priority) as '1' | '2' | '3'}
            onChange={(v) => set({ priority: Number(v) as 1 | 2 | 3 })}
            options={[
              ['1', PRIORITY[1]],
              ['2', PRIORITY[2]],
              ['3', PRIORITY[3]],
            ]}
          />
        </Field>
        <Field label="期限（選填）">
          <input className="input" type="date" value={t.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} />
        </Field>
        <Field label="指定執行日（選填）" hint="留白由系統依期限與每週時間自動安排">
          <input
            className="input"
            type="date"
            value={t.pinned ? t.scheduledDate ?? '' : ''}
            onChange={(e) => set({ scheduledDate: e.target.value || null, pinned: !!e.target.value })}
          />
        </Field>
        <Field label="申請階段">
          <Select<string>
            value={t.phaseId ?? ''}
            onChange={(v) => set({ phaseId: v || null })}
            options={[['', '未指定'], ...data.phases.sort((a, b) => a.order - b.order).map((p) => [p.id, p.name] as [string, string])]}
          />
        </Field>
      </div>
      <Field label="前置任務（完成後才排這項）">
        <MultiPick options={otherTasks.map((x) => ({ id: x.id, label: x.title }))} value={t.dependsOn} onChange={(v) => set({ dependsOn: v })} />
      </Field>
      <Field label="相關學程">
        <MultiPick
          options={data.programs.map((p) => ({ id: p.id, label: `${p.school}｜${p.programName}` }))}
          value={t.programIds}
          onChange={(v) => set({ programIds: v })}
        />
      </Field>
      <Field label="相關文件">
        <MultiPick options={data.assets.map((a) => ({ id: a.id, label: a.title }))} value={t.assetIds} onChange={(v) => set({ assetIds: v })} />
      </Field>
      <Field label="備註">
        <TextArea value={t.notes} onChange={(v) => set({ notes: v })} />
      </Field>
    </Modal>
  );
}

/** 精簡任務列：用於清單與看板 */
export function TaskRow({ task, onEdit, showDate = true }: { task: Task; onEdit: (t: Task) => void; showDate?: boolean }) {
  const toggle = useToggleDone();
  const { data } = useStore();
  const children = data.tasks.filter((c) => c.parentId === task.id);
  return (
    <li className={`task-row ${task.status === 'done' ? 'is-done' : ''}`}>
      {task.type === 'mine' || task.type === 'verify' ? (
        <CheckButton checked={task.status === 'done'} onToggle={() => toggle(task)} label={`完成：${task.title}`} />
      ) : (
        <CheckButton checked={task.status === 'done'} onToggle={() => toggle(task)} label={`已收到：${task.title}`} />
      )}
      <button className="row-main" onClick={() => onEdit(task)}>
        <span className="row-title">{task.title}</span>
        <span className="row-meta">
          {task.type !== 'mine' && <TaskTypeBadge type={task.type} />}
          {showDate && task.scheduledDate && task.status !== 'done' && <span>排在 {fmt(task.scheduledDate, true)}</span>}
          {task.dueDate && <span>期限 {fmt(task.dueDate)}</span>}
          {children.length > 0 && (
            <span>
              <Link2 size={12} /> 子步驟 {children.filter((c) => c.status === 'done').length}/{children.length}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
