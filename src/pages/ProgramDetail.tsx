import { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  CalendarPlus,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileClock,
  GitCompareArrows,
  History,
  Link as LinkIcon,
  ListPlus,
  Pencil,
  Plus,
  Send,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useStore } from '../store';
import {
  INFO_FIELDS,
  type ApplicationRecord,
  type DateKind,
  type InfoField,
  type Milestone,
  type Program,
  type ProgramStatus,
  type Requirement,
  type Revision,
  type Source,
  type Task,
} from '../types';
import { DATE_KIND, FEE, INFO_FIELD_LABEL, INTERVIEW, PROGRAM_STATUS, REC_SUBMISSION, REQ_KIND, REQUIREMENT_TEMPLATE, RESULT, ASSET_STATUS, SUBMISSION } from '../labels';
import { Badge, CheckButton, DateKindBadge, Empty, ExtLink, Field, Modal, MultiPick, Progress, Section, Select, TextArea, TextInput } from '../components/ui';
import { ProgramForm } from '../components/programForm';
import { TaskForm, TaskRow, newTask } from '../components/tasks';
import { STATUS_ICON, useMaterial } from './Programs';
import { convertMoney, moneyText, uid } from '../lib/logic';
import { fmt, relative } from '../lib/dates';
import { askConfirm } from '../components/confirm';
import { pageHref } from '../lib/route';

function fieldValue(p: Program, f: InfoField | 'officialUrl'): string {
  if (f === 'tuition' || f === 'living') return p[f].amount === null ? '' : moneyText(p[f]);
  return p[f] as string;
}

export default function ProgramDetail({ id }: { id: string }) {
  const { data, today, upsert } = useStore();
  const p = data.programs.find((x) => x.id === id);
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  if (!p) return <Empty icon={CircleHelp} title="找不到這個學程"><a href={pageHref('programs')}>回到選校列表</a></Empty>;

  const tasks = data.tasks.filter((t) => t.programIds.includes(p.id) && !t.parentId);

  return (
    <div className="page">
      <a href={pageHref('programs')} className="back">
        <ArrowLeft size={16} />
        選校與學程
      </a>
      <header className="page-head row">
        <div>
          <p className="eyebrow">
            {p.country || '國家待填'}・{p.field || '領域待填'}・資料適用 {p.intakeLabel}
          </p>
          <h1>{p.school}</h1>
          <p className="subtitle">{p.programName}</p>
        </div>
        <div className="head-actions">
          {p.officialUrl && (
            <a className="btn ghost" href={p.officialUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={16} />
              官方頁面
            </a>
          )}
          <button className="btn" onClick={() => setEditing(true)}>
            <Pencil size={16} />
            編輯
          </button>
        </div>
      </header>

      <div className="seg wide" role="radiogroup" aria-label="申請狀態">
        {(Object.keys(PROGRAM_STATUS) as ProgramStatus[]).map((s) => {
          const Icon = STATUS_ICON[s];
          return (
            <button
              key={s}
              role="radio"
              aria-checked={p.status === s}
              className={p.status === s ? 'on' : ''}
              onClick={() => upsert('programs', { ...p, status: s, updatedAt: new Date().toISOString() })}
            >
              <Icon size={16} />
              {PROGRAM_STATUS[s]}
            </button>
          );
        })}
      </div>

      <MaterialsSection program={p} />
      <ApplicationSection program={p} />
      <InfoSection program={p} />
      <RevisionSection program={p} />
      <SourcesSection program={p} />
      <DatesSection program={p} />

      <Section
        title="相關任務"
        icon={ClipboardList}
        action={
          <button className="btn sm" onClick={() => setTask(newTask({ programIds: [p.id], category: 'research' }))}>
            <Plus size={16} />
            新增
          </button>
        }
      >
        {tasks.length === 0 ? (
          <p className="muted">尚無任務。</p>
        ) : (
          <ul className="rows">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setTask} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="我的筆記" icon={Pencil}>
        <dl className="info-dl">
          <dt>適合原因</dt>
          <dd>{p.fitReasons || <span className="muted">尚未填寫（由你自己寫）</span>}</dd>
          <dt>疑問</dt>
          <dd className="pre">{p.questions || <span className="muted">—</span>}</dd>
        </dl>
      </Section>

      <p className="muted small">最後更新 {fmt(p.updatedAt.slice(0, 10))}・今天 {fmt(today)}</p>

      {editing && <ProgramForm program={p} onClose={() => setEditing(false)} />}
      {task && <TaskForm task={task} onClose={() => setTask(null)} />}
    </div>
  );
}

// ───────── 招生資訊與來源標示 ─────────
function SourceTag({ program, field }: { program: Program; field: InfoField }) {
  const { data } = useStore();
  const list = data.sources
    .filter((s) => s.programId === program.id && s.fields.includes(field))
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const s = list[0];
  if (!s) return <Badge icon={CircleHelp} tone="warn">未附來源</Badge>;
  const sameYear = s.intakeLabel.trim() === program.intakeLabel.trim();
  return (
    <span className="source-tag">
      {sameYear ? (
        <Badge icon={LinkIcon} tone="ok">
          {s.isOfficial ? '官方' : '非官方'}・{s.intakeLabel}
        </Badge>
      ) : (
        <Badge icon={TriangleAlert} tone="warn">
          往年參考（{s.intakeLabel || '年度未註明'}）
        </Badge>
      )}
      <span className="muted small">查核 {fmt(s.checkedAt)}</span>
    </span>
  );
}

function InfoSection({ program: p }: { program: Program }) {
  const { data } = useStore();
  return (
    <Section title="招生資訊" icon={FileClock}>
      <p className="ai-off">
        <Bot size={16} aria-hidden />
        AI 搜尋與自動查核尚未啟用：以下資料都是手動輸入，請在「官方來源」附上連結、適用年度與查核日期。
      </p>
      <dl className="info-dl">
        {INFO_FIELDS.map((f) => {
          const v = fieldValue(p, f);
          const money = f === 'tuition' || f === 'living' ? p[f] : null;
          return (
            <div className="info-row" key={f}>
              <dt>{INFO_FIELD_LABEL[f]}</dt>
              <dd>
                <span className="pre">{v || <span className="muted">{p.intakeLabel} 尚未公布／待查</span>}</span>
                {money && money.amount !== null && (
                  <span className="muted small block">
                    {convertMoney(money, data.settings.fxRates, data.settings.homeCurrency) ?? `未設定 ${money.currency} 匯率，不換算`}
                  </span>
                )}
                <SourceTag program={p} field={f} />
              </dd>
            </div>
          );
        })}
        <div className="info-row">
          <dt>官方連結</dt>
          <dd>
            <ExtLink href={p.officialUrl} />
          </dd>
        </div>
      </dl>
    </Section>
  );
}

// ───────── 官方來源 ─────────
function SourcesSection({ program: p }: { program: Program }) {
  const { data, today, upsert, remove } = useStore();
  const [editing, setEditing] = useState<Source | null>(null);
  const list = data.sources.filter((s) => s.programId === p.id).sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  return (
    <Section
      title="官方來源"
      icon={LinkIcon}
      action={
        <button
          className="btn sm"
          onClick={() => setEditing({ id: uid('src'), programId: p.id, title: '', url: '', isOfficial: true, intakeLabel: p.intakeLabel, checkedAt: today, fields: [], note: '' })}
        >
          <Plus size={16} />
          新增來源
        </button>
      }
    >
      {list.length === 0 ? (
        <p className="muted">還沒有來源。每筆招生資訊都應附學校官方來源、適用入學年度與查核日期。</p>
      ) : (
        <ul className="source-list">
          {list.map((s) => (
            <li key={s.id}>
              <div>
                <ExtLink href={s.url}>{s.title || s.url}</ExtLink>
                <div className="badges">
                  <Badge tone={s.isOfficial ? 'ok' : 'warn'}>{s.isOfficial ? '學校官方' : '非官方'}</Badge>
                  <Badge>適用 {s.intakeLabel || '年度未註明'}</Badge>
                  <Badge>查核 {fmt(s.checkedAt)}</Badge>
                </div>
                {s.fields.length > 0 && <p className="muted small">涵蓋：{s.fields.map((f) => INFO_FIELD_LABEL[f]).join('、')}</p>}
                {s.note && <p className="small">{s.note}</p>}
              </div>
              <button className="icon-btn" aria-label="編輯來源" onClick={() => setEditing(s)}>
                <Pencil size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <SourceModal
          source={editing}
          onClose={() => setEditing(null)}
          onSave={(s) => upsert('sources', s)}
          onDelete={data.sources.some((s) => s.id === editing.id) ? () => remove('sources', editing.id) : undefined}
        />
      )}
    </Section>
  );
}

function SourceModal({ source, onClose, onSave, onDelete }: { source: Source; onClose: () => void; onSave: (s: Source) => void; onDelete?: () => void }) {
  const [s, setS] = useState(source);
  const set = (x: Partial<Source>) => setS((c) => ({ ...c, ...x }));
  const valid = s.url.trim() && s.checkedAt;
  return (
    <Modal
      title="招生資訊來源"
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <button className="btn danger ghost" onClick={() => void askConfirm('刪除這筆來源？').then((ok) => ok && (onDelete(), onClose()))}>
              <Trash2 size={16} />
              刪除
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={!valid} onClick={() => (onSave({ ...s, title: s.title.trim() || s.url }), onClose())}>
            儲存
          </button>
        </>
      }
    >
      <Field label="網址">
        <TextInput type="url" value={s.url} onChange={(v) => set({ url: v })} placeholder="https://" required />
      </Field>
      <Field label="頁面名稱">
        <TextInput value={s.title} onChange={(v) => set({ title: v })} />
      </Field>
      <div className="form-grid">
        <Field label="適用入學梯次" hint="往年資料請填該年，例如 2027 Fall">
          <TextInput value={s.intakeLabel} onChange={(v) => set({ intakeLabel: v })} />
        </Field>
        <Field label="查核日期">
          <input className="input" type="date" value={s.checkedAt} onChange={(e) => set({ checkedAt: e.target.value })} />
        </Field>
      </div>
      <label className="inline-check">
        <input type="checkbox" checked={s.isOfficial} onChange={(e) => set({ isOfficial: e.target.checked })} />
        學校官方來源
      </label>
      <Field label="這份來源支持哪些欄位">
        <MultiPick options={INFO_FIELDS.map((f) => ({ id: f, label: INFO_FIELD_LABEL[f] }))} value={s.fields} onChange={(v) => set({ fields: v as InfoField[] })} />
      </Field>
      <Field label="備註">
        <TextArea value={s.note} onChange={(v) => set({ note: v })} rows={2} />
      </Field>
    </Modal>
  );
}

// ───────── 官方資訊更新（保留原資料並提示差異） ─────────
function RevisionSection({ program: p }: { program: Program }) {
  const { data, mutate } = useStore();
  const [open, setOpen] = useState(false);
  const revs = data.revisions.filter((r) => r.programId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = revs.filter((r) => r.status === 'pending');
  const history = revs.filter((r) => r.status !== 'pending');

  const decide = (r: Revision, apply: boolean) =>
    mutate(['revisions', 'programs'], (d) => {
      let programs = d.programs;
      if (apply) {
        programs = d.programs.map((x) => {
          if (x.id !== p.id) return x;
          const f = r.field;
          if (f === 'tuition' || f === 'living') {
            const n = Number(r.newValue.replace(/[^\d.]/g, ''));
            return { ...x, [f]: { ...x[f], amount: r.newValue.trim() === '' || Number.isNaN(n) ? null : n }, updatedAt: new Date().toISOString() };
          }
          return { ...x, [f]: r.newValue, updatedAt: new Date().toISOString() };
        });
      }
      return {
        ...d,
        programs,
        revisions: d.revisions.map((x) => (x.id === r.id ? { ...x, status: apply ? 'applied' : 'dismissed', decidedAt: new Date().toISOString() } : x)),
      };
    });

  return (
    <Section
      title={`官方資訊更新${pending.length ? `（${pending.length} 筆待確認）` : ''}`}
      icon={GitCompareArrows}
      action={
        <button className="btn sm" onClick={() => setOpen(true)}>
          <Plus size={16} />
          記錄更新
        </button>
      }
    >
      <p className="muted small">官方資訊變動時先記在這裡，比對差異後由你決定是否套用；原資料會保留在紀錄中。</p>
      {pending.map((r) => {
        const src = data.sources.find((s) => s.id === r.sourceId);
        return (
          <div key={r.id} className="diff">
            <p className="diff-field">{INFO_FIELD_LABEL[r.field]}</p>
            <div className="diff-cols">
              <div className="diff-old">
                <span className="small">目前</span>
                <p className="pre">{r.oldValue || '（空白）'}</p>
              </div>
              <div className="diff-new">
                <span className="small">官方新資料</span>
                <p className="pre">{r.newValue || '（空白）'}</p>
              </div>
            </div>
            <p className="muted small">來源：{src ? `${src.title}（${src.intakeLabel}，查核 ${fmt(src.checkedAt)}）` : '未指定'}</p>
            <div className="row-actions">
              <button className="btn primary sm" onClick={() => decide(r, true)}>
                套用新資料
              </button>
              <button className="btn ghost sm" onClick={() => decide(r, false)}>
                保留原資料
              </button>
            </div>
          </div>
        );
      })}
      {history.length > 0 && (
        <details>
          <summary>
            <History size={14} /> 變更紀錄（{history.length}）
          </summary>
          <ul className="history">
            {history.map((r) => (
              <li key={r.id}>
                {fmt(r.decidedAt?.slice(0, 10))}・{INFO_FIELD_LABEL[r.field]}：{r.status === 'applied' ? '已套用' : '保留原資料'}
                <span className="muted small block">
                  原：{r.oldValue || '（空白）'} → 新：{r.newValue || '（空白）'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {open && <RevisionModal program={p} onClose={() => setOpen(false)} />}
    </Section>
  );
}

function RevisionModal({ program: p, onClose }: { program: Program; onClose: () => void }) {
  const { data, upsert } = useStore();
  const [field, setField] = useState<InfoField | 'officialUrl'>('materialsReq');
  const [value, setValue] = useState('');
  const sources = data.sources.filter((s) => s.programId === p.id);
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const options = [...INFO_FIELDS, 'officialUrl' as const].map((f) => [f, INFO_FIELD_LABEL[f]] as [InfoField | 'officialUrl', string]);
  return (
    <Modal
      title="記錄官方資訊更新"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn primary"
            onClick={() => {
              upsert('revisions', {
                id: uid('rev'),
                programId: p.id,
                field,
                oldValue: fieldValue(p, field),
                newValue: value,
                sourceId: sourceId || null,
                createdAt: new Date().toISOString(),
                status: 'pending',
              });
              onClose();
            }}
          >
            加入待確認
          </button>
        </>
      }
    >
      <Field label="欄位">
        <Select value={field} onChange={setField} options={options} />
      </Field>
      <p className="muted small">目前內容：{fieldValue(p, field) || '（空白）'}</p>
      <Field label="官方新資料" hint={field === 'tuition' || field === 'living' ? '請只填數字，幣別沿用目前設定' : undefined}>
        <TextArea value={value} onChange={setValue} />
      </Field>
      <Field label="來源" hint={sources.length ? undefined : '建議先在「官方來源」新增這筆資料的出處'}>
        <Select<string> value={sourceId} onChange={setSourceId} options={[['', '未指定'], ...sources.map((s) => [s.id, `${s.title}（${s.intakeLabel}）`] as [string, string])]} />
      </Field>
    </Modal>
  );
}

// ───────── 日期 ─────────
function DatesSection({ program: p }: { program: Program }) {
  const { data, today, upsert } = useStore();
  const [editing, setEditing] = useState<Milestone | null>(null);
  const list = data.milestones.filter((m) => m.programId === p.id).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Section
      title="截止日與日期"
      icon={CalendarPlus}
      action={
        <button className="btn sm" onClick={() => setEditing({ id: uid('ms'), title: '', date: today, kind: 'official', programId: p.id, sourceId: null, note: '' })}>
          <Plus size={16} />
          新增日期
        </button>
      }
    >
      {list.length === 0 ? (
        <p className="muted">{p.intakeLabel} 官方截止日尚未公布或尚未記錄。</p>
      ) : (
        <ul className="deadlines">
          {list.map((m) => (
            <li key={m.id}>
              <div className="dl-date">
                <strong>{fmt(m.date)}</strong>
                <span className="muted small">{relative(m.date, today)}</span>
              </div>
              <div>
                <button className="link-btn" onClick={() => setEditing(m)}>
                  {m.title}
                </button>
                <div className="badges">
                  <DateKindBadge kind={m.kind} />
                  {m.kind === 'official' && !m.sourceId && <Badge tone="warn">未附來源</Badge>}
                </div>
                {m.note && <p className="muted small">{m.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <MilestoneModal milestone={editing} onClose={() => setEditing(null)} onSave={(m) => upsert('milestones', m)} />}
    </Section>
  );
}

export function MilestoneModal({ milestone, onClose, onSave }: { milestone: Milestone; onClose: () => void; onSave: (m: Milestone) => void }) {
  const { data, remove } = useStore();
  const [m, setM] = useState(milestone);
  const set = (x: Partial<Milestone>) => setM((c) => ({ ...c, ...x }));
  const exists = data.milestones.some((x) => x.id === m.id);
  const sources = data.sources.filter((s) => !m.programId || s.programId === m.programId);
  return (
    <Modal
      title={exists ? '編輯日期' : '新增日期'}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <button className="btn danger ghost" onClick={() => void askConfirm('刪除這個日期？').then((ok) => ok && (remove('milestones', m.id), onClose()))}>
              <Trash2 size={16} />
              刪除
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={!m.title.trim() || !m.date} onClick={() => (onSave(m), onClose())}>
            儲存
          </button>
        </>
      }
    >
      <Field label="名稱">
        <TextInput value={m.title} onChange={(v) => set({ title: v })} required />
      </Field>
      <div className="form-grid">
        <Field label="日期">
          <input className="input" type="date" value={m.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="日期類型" hint="官方截止日請附來源；不確定時選暫估">
          <Select<DateKind> value={m.kind} onChange={(v) => set({ kind: v })} options={DATE_KIND} />
        </Field>
        <Field label="學程">
          <Select<string>
            value={m.programId ?? ''}
            onChange={(v) => set({ programId: v || null })}
            options={[['', '不限學程'], ...data.programs.map((p) => [p.id, `${p.school}｜${p.programName}`] as [string, string])]}
          />
        </Field>
        <Field label="來源">
          <Select<string> value={m.sourceId ?? ''} onChange={(v) => set({ sourceId: v || null })} options={[['', '未指定'], ...sources.map((s) => [s.id, s.title] as [string, string])]} />
        </Field>
      </div>
      <Field label="備註">
        <TextArea value={m.note} onChange={(v) => set({ note: v })} rows={2} />
      </Field>
    </Modal>
  );
}

// ───────── 材料清單 ─────────
function MaterialsSection({ program: p }: { program: Program }) {
  const { data, mutate, upsert, remove } = useStore();
  const [name, setName] = useState('');
  const reqs = data.requirements.filter((r) => r.programId === p.id);
  const mp = useMaterial(p.id);
  const recs = data.recommenders.filter((r) => r.submissions[p.id] !== undefined);

  const addTemplate = () =>
    mutate(['requirements'], (d) => ({
      ...d,
      requirements: [
        ...d.requirements,
        ...REQUIREMENT_TEMPLATE.filter((t) => !reqs.some((r) => r.name === t.name)).map((t) => ({
          id: uid('rq'),
          programId: p.id,
          name: t.name,
          kind: t.kind,
          required: true,
          assetId: d.assets.find((a) => a.kind === t.kind)?.id ?? null,
          uploaded: false,
          submitted: false,
          note: '範本項目，待官方確認',
        })),
      ],
    }));

  const add = () => {
    if (!name.trim()) return;
    upsert('requirements', { id: uid('rq'), programId: p.id, name: name.trim(), kind: 'other', required: true, assetId: null, uploaded: false, submitted: false, note: '' });
    setName('');
  };

  const patch = (r: Requirement, x: Partial<Requirement>) => upsert('requirements', { ...r, ...x });

  return (
    <Section title="材料清單" icon={ListPlus}>
      {mp.total > 0 && (
        <div className="material-summary">
          <Progress label="素材可使用" done={mp.ready} total={mp.total} />
          <Progress label="已上傳到申請系統" done={mp.uploaded} total={mp.total} />
          <Progress label="已提交" done={mp.submitted} total={mp.total} />
          <p className="muted small">分母為 {mp.total} 項必要材料（選填項目不計）。「已上傳」與「已提交」分開記錄。</p>
        </div>
      )}
      {reqs.length === 0 ? (
        <Empty icon={ListPlus} title="尚未建立材料清單">
          <p>可以先加入常見材料範本，之後依官方要求修改。</p>
          <button className="btn" onClick={addTemplate}>
            加入常見材料範本
          </button>
        </Empty>
      ) : (
        <div className="req-list">
          {reqs.map((r) => {
            const asset = data.assets.find((a) => a.id === r.assetId);
            return (
              <div className="req" key={r.id}>
                <div className="req-head">
                  <input className="input req-name" aria-label="材料名稱" value={r.name} onChange={(e) => patch(r, { name: e.target.value })} />
                  <label className="inline-check small">
                    <input type="checkbox" checked={r.required} onChange={(e) => patch(r, { required: e.target.checked })} />
                    必要
                  </label>
                  <button className="icon-btn" aria-label={`刪除 ${r.name}`} onClick={() => void askConfirm(`刪除「${r.name}」？`).then((ok) => ok && remove('requirements', r.id))}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="req-body">
                  <Select<string>
                    ariaLabel="對應共用素材"
                    value={r.assetId ?? ''}
                    onChange={(v) => patch(r, { assetId: v || null })}
                    options={[['', '未對應素材'], ...data.assets.map((a) => [a.id, a.title] as [string, string])]}
                  />
                  {asset && <Badge tone={asset.status === 'ready' ? 'ok' : 'plain'}>{ASSET_STATUS[asset.status]}</Badge>}
                  <span className="muted small">{REQ_KIND[r.kind]}</span>
                </div>
                <div className="req-checks">
                  <label className="check-label">
                    <CheckButton checked={r.uploaded} onToggle={() => patch(r, { uploaded: !r.uploaded })} label={`${r.name} 已上傳`} />
                    已上傳
                  </label>
                  <label className="check-label">
                    <CheckButton checked={r.submitted} onToggle={() => patch(r, { submitted: !r.submitted, uploaded: r.submitted ? r.uploaded : true })} label={`${r.name} 已提交`} />
                    已提交
                  </label>
                </div>
                {r.kind === 'recommendation' && (
                  <p className="muted small">
                    推薦人：
                    {recs.length === 0
                      ? '尚未指定，可在「文件」頁的推薦信區設定'
                      : recs.map((x) => `${x.name}（${REC_SUBMISSION[x.submissions[p.id]]}）`).join('、')}
                  </p>
                )}
                <input className="input small" aria-label="備註" placeholder="備註" value={r.note} onChange={(e) => patch(r, { note: e.target.value })} />
              </div>
            );
          })}
        </div>
      )}
      <div className="add-row">
        <input className="input" placeholder="新增材料，例如：Writing sample" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add} disabled={!name.trim()}>
          <Plus size={16} />
          加入
        </button>
      </div>
    </Section>
  );
}

// ───────── 送件、面試與結果 ─────────
function ApplicationSection({ program: p }: { program: Program }) {
  const { data, upsert } = useStore();
  const app: ApplicationRecord =
    data.applications.find((a) => a.programId === p.id) ?? {
      id: uid('app'),
      programId: p.id,
      submission: 'notStarted',
      submittedAt: null,
      fee: 'unknown',
      interview: 'none',
      interviewDate: null,
      result: 'pending',
      notes: '',
    };
  const set = (x: Partial<ApplicationRecord>) => upsert('applications', { ...app, ...x });
  return (
    <Section title="送件、面試與結果" icon={Send}>
      <p className="muted small">送件、付款與寄信都由你在學校系統親自操作，這裡只做紀錄。</p>
      <div className="form-grid">
        <Field label="送件狀態">
          <Select value={app.submission} onChange={(v) => set({ submission: v })} options={SUBMISSION} />
        </Field>
        <Field label="送件日期">
          <input className="input" type="date" value={app.submittedAt ?? ''} onChange={(e) => set({ submittedAt: e.target.value || null })} />
        </Field>
        <Field label="申請費">
          <Select value={app.fee} onChange={(v) => set({ fee: v })} options={FEE} />
        </Field>
        <Field label="面試">
          <Select value={app.interview} onChange={(v) => set({ interview: v })} options={INTERVIEW} />
        </Field>
        <Field label="面試日期">
          <input className="input" type="date" value={app.interviewDate ?? ''} onChange={(e) => set({ interviewDate: e.target.value || null })} />
        </Field>
        <Field label="結果">
          <Select value={app.result} onChange={(v) => set({ result: v })} options={RESULT} />
        </Field>
      </div>
      <Field label="紀錄">
        <TextArea value={app.notes} onChange={(v) => set({ notes: v })} rows={2} />
      </Field>
    </Section>
  );
}
