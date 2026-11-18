import { useState } from 'react';
import { CalendarArrowUp, ExternalLink, FileText, GraduationCap, Pencil, Plus, Scissors, Trash2, Link2, X } from 'lucide-react';
import type { AnswerType, Task, TaskCategory, TaskType } from '../types';
import { useStore } from '../store';
import { ANSWER_TYPE, PRIORITY, TASK_CATEGORY, TASK_TYPE } from '../labels';
import { CheckButton, Field, Modal, MinutesBadge, MultiPick, Select, TaskTypeBadge, TextInput, Badge } from './ui';
import { deferTask, depsDone } from '../lib/scheduler';
import { fmt, relative } from '../lib/dates';
import { uid } from '../lib/logic';
import { askConfirm } from './confirm';
import { pageHref, programHref } from '../lib/route';

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
    answerType: 'check',
    answeredAt: null,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

export function useToggleDone() {
  const { patchTask } = useStore();
  return (t: Task) =>
    patchTask(t.id, t.status === 'done' ? { status: 'todo', completedAt: null } : { status: 'done', completedAt: new Date().toISOString() });
}

/** 依回答方式顯示的輸入框 */
export function AnswerInput({ type, value, onChange, autoFocus }: { type: AnswerType; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  const [draft, setDraft] = useState('');
  if (type === 'text')
    return (
      <textarea
        className="input answer-input"
        rows={3}
        value={value}
        autoFocus={autoFocus}
        placeholder="在這裡回答…"
        aria-label="我的回答"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  if (type === 'list') {
    const items = value.split('\n').filter((x) => x.trim());
    const add = () => {
      if (!draft.trim()) return;
      onChange([...items, draft.trim()].join('\n'));
      setDraft('');
    };
    return (
      <div className="answer-list">
        {items.length > 0 && (
          <ol>
            {items.map((it, i) => (
              <li key={i}>
                <span>{it}</span>
                <button className="icon-btn sm" aria-label={`刪除：${it}`} onClick={() => onChange(items.filter((_, j) => j !== i).join('\n'))}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="add-row">
          <input
            className="input"
            value={draft}
            autoFocus={autoFocus}
            placeholder="新增一項，按 Enter"
            aria-label="新增清單項目"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                add();
              }
            }}
          />
          <button className="btn sm" onClick={add} disabled={!draft.trim()}>
            <Plus size={15} />
            加入
          </button>
        </div>
      </div>
    );
  }
  if (type === 'link')
    return (
      <div className="answer-link">
        <input className="input" type="url" value={value} autoFocus={autoFocus} placeholder="https://" aria-label="連結" onChange={(e) => onChange(e.target.value.trim())} />
        {/^https?:\/\//.test(value) && (
          <a className="btn sm" href={value} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            開啟
          </a>
        )}
      </div>
    );
  if (type === 'date')
    return <input className="input answer-date" type="date" value={value} autoFocus={autoFocus} aria-label="日期" onChange={(e) => onChange(e.target.value)} />;
  return null;
}

/** 首頁任務卡：對話框式回答、打勾、延後、拆小 */
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
  const kind = task.answerType ?? 'check';

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
            <span className="answer-chip">
              {ANSWER_TYPE[kind].emoji} {ANSWER_TYPE[kind].label}
            </span>
            <MinutesBadge minutes={task.minutes} />
            {task.dueDate && <Badge tone={task.dueDate < today ? 'warn' : 'plain'}>期限 {fmt(task.dueDate)}（{relative(task.dueDate, today)}）</Badge>}
            {blocked && <Badge tone="warn">前置任務未完成</Badge>}
          </div>
        </div>
      </div>

      {kind === 'check' ? (
        task.doneCriteria && <p className="criteria">做完的樣子：{task.doneCriteria}</p>
      ) : (
        <div className="chat">
          <div className="bubble from-app">
            <span className="bubble-name">apply diary ♡</span>
            {task.doneCriteria || task.title}
          </div>
          <div className="bubble from-me">
            <span className="bubble-name">我</span>
            <AnswerInput type={kind} value={task.notes} onChange={(v) => patchTask(task.id, { notes: v, answeredAt: new Date().toISOString() })} />
            {task.answeredAt && task.notes && <span className="saved-hint">已存進紀錄庫 ✓</span>}
          </div>
        </div>
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
                  <a href={pageHref('docs')}>{a.title}</a>
                )}
              </li>
            );
          })}
          {programs.map((p) => (
            <li key={p.id}>
              <GraduationCap size={14} aria-hidden />
              <a href={programHref(p.id)}>
                {p.school}｜{p.programName}
              </a>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="error small">{msg}</p>}
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
          answerType: 'check',
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

const QUESTION_LABEL: Record<AnswerType, [string, string]> = {
  check: ['怎樣算做完？（選填）', '例如：在選校頁新增一筆並附官方連結'],
  text: ['要回答的問題', '例如：寒假哪幾週可以讀 TOEFL？'],
  list: ['要列出什麼？', '例如：列出 3 篇候選代表作'],
  link: ['要存什麼連結？', '例如：貼上目前履歷的連結'],
  date: ['要決定什麼日期？', '例如：TOEFL 想考哪一天？'],
};

/** 新增／編輯任務：先選回答方式，再填必要欄位，其他收在「更多設定」 */
export function TaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [t, setT] = useState<Task>({ ...task, answerType: task.answerType ?? 'check' });
  const isNew = !data.tasks.some((x) => x.id === task.id);
  const set = (p: Partial<Task>) => setT((x) => ({ ...x, ...p }));
  const otherTasks = data.tasks.filter((x) => x.id !== t.id && x.parentId !== t.id && x.status !== 'done');
  const [label, placeholder] = QUESTION_LABEL[t.answerType];

  const save = () => {
    if (!t.title.trim()) return;
    upsert('tasks', { ...t, title: t.title.trim() });
    onClose();
  };

  return (
    <Modal
      title={isNew ? '新增任務 ♡' : '編輯任務'}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <button
              className="btn danger ghost"
              onClick={() => {
                void askConfirm(`刪除「${t.title}」？子任務也會一起刪除。`).then((ok) => {
                  if (!ok) return;
                  remove('tasks', t.id);
                  onClose();
                });
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
      <fieldset className="type-pick">
        <legend>這是什麼樣的任務？</legend>
        <div className="type-grid" role="radiogroup">
          {(Object.keys(ANSWER_TYPE) as AnswerType[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={t.answerType === k}
              className={`type-card ${t.answerType === k ? 'on' : ''}`}
              onClick={() => set({ answerType: k })}
            >
              <span className="type-emoji" aria-hidden>
                {ANSWER_TYPE[k].emoji}
              </span>
              <span className="type-label">{ANSWER_TYPE[k].label}</span>
              <span className="type-hint">{ANSWER_TYPE[k].hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="任務名稱">
        <TextInput value={t.title} onChange={(v) => set({ title: v })} placeholder="一個具體的小動作" required />
      </Field>
      <Field label={label}>
        <TextInput value={t.doneCriteria} onChange={(v) => set({ doneCriteria: v })} placeholder={placeholder} />
      </Field>
      {!isNew && t.answerType !== 'check' && (
        <Field label="我的回答">
          <AnswerInput type={t.answerType} value={t.notes} onChange={(v) => set({ notes: v, answeredAt: new Date().toISOString() })} />
        </Field>
      )}
      <div className="form-grid">
        <Field label="大約要多久">
          <div className="multipick">
            {[15, 20, 30, 45].map((m) => (
              <button key={m} type="button" className={`chip ${t.minutes === m ? 'on' : ''}`} aria-pressed={t.minutes === m} onClick={() => set({ minutes: m })}>
                {m} 分
              </button>
            ))}
          </div>
        </Field>
        <Field label="期限（選填）">
          <input className="input" type="date" value={t.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} />
        </Field>
      </div>

      <details className="more-settings">
        <summary>更多設定</summary>
        <div className="form-grid">
          <Field label="誰要做" hint="等待他人與待查證不會排進每日任務">
            <Select<TaskType> value={t.type} onChange={(v) => set({ type: v })} options={TASK_TYPE} />
          </Field>
          <Field label="類別" hint="忙碌期間只排允許的類別">
            <Select<TaskCategory> value={t.category} onChange={(v) => set({ category: v })} options={TASK_CATEGORY} />
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
          <Field label="指定哪天做" hint="留白由系統自動安排">
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
              options={[['', '未指定'], ...[...data.phases].sort((a, b) => a.order - b.order).map((p) => [p.id, p.name] as [string, string])]}
            />
          </Field>
          <Field label="自訂分鐘">
            <TextInput type="number" value={String(t.minutes)} onChange={(v) => set({ minutes: Math.max(5, Number(v) || 0) })} />
          </Field>
        </div>
        <Field label="前置任務（完成後才排這項）">
          <MultiPick options={otherTasks.map((x) => ({ id: x.id, label: x.title }))} value={t.dependsOn} onChange={(v) => set({ dependsOn: v })} />
        </Field>
        <Field label="相關學程">
          <MultiPick options={data.programs.map((p) => ({ id: p.id, label: `${p.school}｜${p.programName}` }))} value={t.programIds} onChange={(v) => set({ programIds: v })} />
        </Field>
        <Field label="相關文件">
          <MultiPick options={data.assets.map((a) => ({ id: a.id, label: a.title }))} value={t.assetIds} onChange={(v) => set({ assetIds: v })} />
        </Field>
      </details>
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
          {task.notes && <span className="row-note">✎ {task.notes}</span>}
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
