import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Money, Program, ProgramStatus } from '../types';
import { useStore } from '../store';
import { PROGRAM_STATUS } from '../labels';
import { Field, Modal, Select, TextArea, TextInput } from './ui';
import { uid } from '../lib/logic';
import { askConfirm } from './confirm';
import { go, pageHref } from '../lib/route';

export function newProgram(intakeLabel: string): Program {
  const now = new Date().toISOString();
  const money = (): Money => ({ amount: null, currency: 'USD', period: '', note: '' });
  return {
    id: uid('pg'),
    school: '',
    programName: '',
    country: '',
    field: '',
    degree: '',
    focus: '',
    duration: '',
    languageReq: '',
    materialsReq: '',
    portfolioReq: '',
    tuition: money(),
    living: money(),
    scholarship: '',
    officialUrl: '',
    fitReasons: '',
    questions: '',
    status: 'exploring',
    intakeLabel,
    createdAt: now,
    updatedAt: now,
  };
}

function MoneyField({ label, value, onChange }: { label: string; value: Money; onChange: (m: Money) => void }) {
  return (
    <fieldset className="money">
      <legend>{label}</legend>
      <div className="money-row">
        <input
          className="input"
          type="number"
          inputMode="decimal"
          aria-label={`${label}金額`}
          placeholder="未知請留白"
          value={value.amount ?? ''}
          onChange={(e) => onChange({ ...value, amount: e.target.value === '' ? null : Number(e.target.value) })}
        />
        <input
          className="input currency"
          aria-label={`${label}幣別`}
          value={value.currency}
          onChange={(e) => onChange({ ...value, currency: e.target.value.toUpperCase() })}
        />
        <input className="input" aria-label={`${label}計算單位`} placeholder="例如：每學年" value={value.period} onChange={(e) => onChange({ ...value, period: e.target.value })} />
      </div>
      <span className="field-hint">保留原幣別；金額留白代表未知，不會被當成 0。</span>
    </fieldset>
  );
}

export function ProgramForm({ program, onClose, onSaved }: { program: Program; onClose: () => void; onSaved?: (p: Program) => void }) {
  const { data, mutate, upsert, remove } = useStore();
  const [p, setP] = useState<Program>(program);
  const isNew = !data.programs.some((x) => x.id === program.id);
  const set = (x: Partial<Program>) => setP((cur) => ({ ...cur, ...x }));
  const valid = p.school.trim() && p.programName.trim();

  const save = () => {
    if (!valid) return;
    const saved = { ...p, updatedAt: new Date().toISOString() };
    if (isNew) {
      mutate(['programs', 'applications'], (d) => ({
        ...d,
        programs: [...d.programs, saved],
        applications: [
          ...d.applications,
          { id: uid('app'), programId: saved.id, submission: 'notStarted', submittedAt: null, fee: 'unknown', interview: 'none', interviewDate: null, result: 'pending', notes: '' },
        ],
      }));
    } else upsert('programs', saved);
    onSaved?.(saved);
    onClose();
  };

  return (
    <Modal
      title={isNew ? '新增學程' : '編輯學程'}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && (
            <button
              className="btn danger ghost"
              onClick={() => {
                void askConfirm(`刪除「${p.school}｜${p.programName}」？相關來源、材料清單、送件紀錄與該學程的日期都會一起刪除。`).then((ok) => {
                  if (!ok) return;
                  remove('programs', p.id);
                  onClose();
                  go(pageHref('programs'));
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
          <button className="btn primary" onClick={save} disabled={!valid}>
            儲存
          </button>
        </>
      }
    >
      <p className="muted small">同一學校的不同學程請分開新增。招生資訊請以學校官方來源為準，未公布的欄位留白，存檔後可在學程頁加上來源與查核日期。</p>
      <div className="form-grid">
        <Field label="學校">
          <TextInput value={p.school} onChange={(v) => set({ school: v })} required />
        </Field>
        <Field label="學程名稱">
          <TextInput value={p.programName} onChange={(v) => set({ programName: v })} required />
        </Field>
        <Field label="國家">
          <TextInput value={p.country} onChange={(v) => set({ country: v })} />
        </Field>
        <Field label="領域" hint="例如：新聞、資料新聞、國際關係、公共政策">
          <TextInput value={p.field} onChange={(v) => set({ field: v })} />
        </Field>
        <Field label="申請狀態">
          <Select<ProgramStatus> value={p.status} onChange={(v) => set({ status: v })} options={PROGRAM_STATUS} />
        </Field>
        <Field label="適用入學梯次">
          <TextInput value={p.intakeLabel} onChange={(v) => set({ intakeLabel: v })} />
        </Field>
        <Field label="學位">
          <TextInput value={p.degree} onChange={(v) => set({ degree: v })} />
        </Field>
        <Field label="修業時間">
          <TextInput value={p.duration} onChange={(v) => set({ duration: v })} />
        </Field>
      </div>
      <Field label="官方連結">
        <TextInput type="url" value={p.officialUrl} onChange={(v) => set({ officialUrl: v })} placeholder="https://" />
      </Field>
      <Field label="課程方向">
        <TextArea value={p.focus} onChange={(v) => set({ focus: v })} rows={2} />
      </Field>
      <div className="form-grid">
        <Field label="語言要求">
          <TextArea value={p.languageReq} onChange={(v) => set({ languageReq: v })} rows={2} />
        </Field>
        <Field label="作品要求">
          <TextArea value={p.portfolioReq} onChange={(v) => set({ portfolioReq: v })} rows={2} />
        </Field>
      </div>
      <Field label="申請材料（官方描述）" hint="材料清單可在學程頁逐項管理">
        <TextArea value={p.materialsReq} onChange={(v) => set({ materialsReq: v })} rows={2} />
      </Field>
      <div className="form-grid">
        <MoneyField label="學費" value={p.tuition} onChange={(m) => set({ tuition: m })} />
        <MoneyField label="生活費" value={p.living} onChange={(m) => set({ living: m })} />
      </div>
      <Field label="獎學金">
        <TextArea value={p.scholarship} onChange={(v) => set({ scholarship: v })} rows={2} />
      </Field>
      <div className="form-grid">
        <Field label="我的適合原因" hint="由你填寫，AI 不代寫">
          <TextArea value={p.fitReasons} onChange={(v) => set({ fitReasons: v })} />
        </Field>
        <Field label="疑問">
          <TextArea value={p.questions} onChange={(v) => set({ questions: v })} />
        </Field>
      </div>
    </Modal>
  );
}
