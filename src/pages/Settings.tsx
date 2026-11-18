import { useRef, useState } from 'react';
import { Bot, CalendarCog, Copy, Coins, DatabaseBackup, Download, Layers, Plus, Trash2, Upload, UserRound } from 'lucide-react';
import { useStore } from '../store';
import type { BusyPeriod, FxRate, TaskCategory } from '../types';
import { PROGRAM_STATUS, TASK_CATEGORY, TASK_TYPE, WEEKDAYS } from '../labels';
import { Field, Modal, MultiPick, Section, TextArea, TextInput } from '../components/ui';
import { dailyMinuteBudget } from '../lib/scheduler';
import { download, exportJSON, parseBackup, toCSV } from '../lib/backup';
import { uid } from '../lib/logic';
import { clearAll } from '../lib/db';
import { createSeed } from '../seed';
import { askConfirm } from '../components/confirm';

export default function SettingsPage() {
  const store = useStore();
  const { data, today, patchSettings, mutate, persisted } = store;
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [exp, setExp] = useState<{ name: string; content: string; type: string } | null>(null);
  const offer = (name: string, content: string, type: string) => setExp({ name, content, type });

  const setBusy = (id: string, patch: Partial<BusyPeriod>) => patchSettings({ busyPeriods: s.busyPeriods.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const setRate = (id: string, patch: Partial<FxRate>) => patchSettings({ fxRates: s.fxRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const exportTasks = () => {
    const ph = new Map(data.phases.map((p) => [p.id, p.name]));
    const pg = new Map(data.programs.map((p) => [p.id, `${p.school}｜${p.programName}`]));
    const tk = new Map(data.tasks.map((t) => [t.id, t.title]));
    offer(
      `tasks-${today}.csv`,
      toCSV(
        ['id', '任務', '完成條件', '類型', '類別', '狀態', '重要性', '分鐘', '階段', '期限', '排定日', '完成時間', '前置任務', '母任務', '相關學程', '備註'],
        data.tasks.map((t) => [
          t.id, t.title, t.doneCriteria, TASK_TYPE[t.type], TASK_CATEGORY[t.category], t.status === 'done' ? '完成' : '未完成', t.priority, t.minutes,
          ph.get(t.phaseId ?? '') ?? '', t.dueDate, t.scheduledDate, t.completedAt, t.dependsOn.map((x) => tk.get(x) ?? x), tk.get(t.parentId ?? '') ?? '',
          t.programIds.map((x) => pg.get(x) ?? x), t.notes,
        ]),
      ),
      'text/csv',
    );
  };

  const exportPrograms = () => {
    offer(
      `programs-${today}.csv`,
      toCSV(
        ['id', '學校', '學程', '狀態', '國家', '領域', '學位', '課程方向', '修業時間', '語言要求', '申請材料', '作品要求', '學費金額', '學費幣別', '學費單位', '生活費金額', '生活費幣別', '生活費單位', '獎學金', '官方連結', '適用梯次', '適合原因', '疑問', '官方截止日', '來源（標題｜網址｜適用年度｜查核日）'],
        data.programs.map((p) => [
          p.id, p.school, p.programName, PROGRAM_STATUS[p.status], p.country, p.field, p.degree, p.focus, p.duration, p.languageReq, p.materialsReq, p.portfolioReq,
          p.tuition.amount ?? '未知', p.tuition.currency, p.tuition.period, p.living.amount ?? '未知', p.living.currency, p.living.period, p.scholarship, p.officialUrl, p.intakeLabel,
          p.fitReasons, p.questions,
          data.milestones.filter((m) => m.programId === p.id && m.kind === 'official').map((m) => `${m.date} ${m.title}`),
          data.sources.filter((x) => x.programId === p.id).map((x) => `${x.title}｜${x.url}｜${x.intakeLabel}｜${x.checkedAt}`),
        ]),
      ),
      'text/csv',
    );
  };

  const onImport = async (file: File) => {
    const r = parseBackup(await file.text());
    if (!r.ok) return setMsg(`匯入失敗：${r.error}`);
    if (!(await askConfirm(`用備份檔取代目前所有資料？\n備份內有 ${r.data.programs.length} 個學程、${r.data.tasks.length} 項任務。建議先匯出目前資料。`))) return;
    await store.replaceAll(r.data);
    setMsg(`已還原：${r.data.programs.length} 個學程、${r.data.tasks.length} 項任務、${r.data.assets.length} 份素材。`);
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>設定與備份</h1>
      </header>

      <Section title="資料保存" icon={DatabaseBackup}>
        <p className="notice">
          資料只保存在目前這個瀏覽器（IndexedDB），不會上傳。換電腦、換瀏覽器或清除網站資料都會看不到，請定期匯出 JSON 備份。
        </p>
        <p className="muted small">
          瀏覽器長期保存：{persisted === true ? '已允許' : persisted === false ? '未允許（空間不足時瀏覽器可能清除，更需要備份）' : '無法確認'}
        </p>
        <div className="row-actions" style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={() => offer(`master-apply-backup-${today}.json`, exportJSON(data), 'application/json')}>
            <Download size={16} />
            匯出完整備份（JSON）
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            從備份還原
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="選擇備份檔"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
              e.target.value = '';
            }}
          />
          <button className="btn" onClick={exportTasks}>
            <Download size={16} />
            任務 CSV
          </button>
          <button className="btn" onClick={exportPrograms}>
            <Download size={16} />
            選校 CSV
          </button>
        </div>
        {msg && <p className="small" role="status" style={{ marginTop: 8 }}>{msg}</p>}
      </Section>

      {exp && (
        <Modal
          title={`匯出 ${exp.name}`}
          onClose={() => setExp(null)}
          footer={
            <>
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exp.content);
                    setMsg(`已複製 ${exp.name} 的內容，可貼到文字檔保存。`);
                  } catch {
                    setMsg('瀏覽器不允許複製，請改用下載。');
                  }
                  setExp(null);
                }}
              >
                <Copy size={16} />
                複製內容
              </button>
              <button className="btn primary" onClick={() => (download(exp.name, exp.content, exp.type), setExp(null))}>
                <Download size={16} />
                下載檔案
              </button>
            </>
          }
        >
          <p>檔案大小約 {Math.ceil(new Blob([exp.content]).size / 1024)} KB。</p>
          <p className="muted small">在 Claude 的預覽框裡，瀏覽器可能會擋下載；這時請用「複製內容」，貼到文字檔並存成 {exp.name}。</p>
        </Modal>
      )}

      <Section title="排程規則" icon={CalendarCog}>
        <Field label="休息日（不排任務）">
          <MultiPick
            options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ id: String(d), label: WEEKDAYS[d] }))}
            value={s.restWeekdays.map(String)}
            onChange={(v) => (v.length < 7 ? patchSettings({ restWeekdays: v.map(Number) }) : undefined)}
          />
        </Field>
        <div className="form-grid">
          <Field label="每週時間上限（分鐘）" hint={`平均每個工作日約 ${dailyMinuteBudget(s)} 分鐘`}>
            <TextInput type="number" value={String(s.weeklyMinutes)} onChange={(v) => patchSettings({ weeklyMinutes: Math.max(15, Number(v) || 15) })} />
          </Field>
          <Field label="每日最多任務數" hint="1–3 項">
            <TextInput type="number" value={String(s.maxTasksPerDay)} onChange={(v) => patchSettings({ maxTasksPerDay: Math.min(3, Math.max(1, Number(v) || 1)) })} />
          </Field>
        </div>
        <h3 style={{ margin: '0.5rem 0' }}>忙碌期間</h3>
        <p className="muted small">期間內只會排入勾選的類別；全部不勾代表完全不排。</p>
        {s.busyPeriods.map((b) => (
          <div key={b.id} className="req" style={{ marginBottom: 8 }}>
            <div className="req-head">
              <input className="input req-name" aria-label="期間名稱" value={b.label} onChange={(e) => setBusy(b.id, { label: e.target.value })} />
              <button className="icon-btn" aria-label="刪除忙碌期間" onClick={() => patchSettings({ busyPeriods: s.busyPeriods.filter((x) => x.id !== b.id) })}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="form-grid">
              <Field label="開始">
                <input className="input" type="date" value={b.start} onChange={(e) => setBusy(b.id, { start: e.target.value })} />
              </Field>
              <Field label="結束">
                <input className="input" type="date" value={b.end} onChange={(e) => setBusy(b.id, { end: e.target.value })} />
              </Field>
            </div>
            <MultiPick
              options={Object.entries(TASK_CATEGORY).map(([id, label]) => ({ id, label: `可排：${label}` }))}
              value={b.allowCategories}
              onChange={(v) => setBusy(b.id, { allowCategories: v as TaskCategory[] })}
            />
          </div>
        ))}
        <button
          className="btn sm"
          onClick={() => patchSettings({ busyPeriods: [...s.busyPeriods, { id: uid('busy'), label: '忙碌期間', start: today, end: today, allowCategories: [] }] })}
        >
          <Plus size={16} />
          新增忙碌期間
        </button>
      </Section>

      <Section title="申請階段（暫估範圍）" icon={Layers}>
        <p className="muted small">路線圖上的階段長條。目標入學年度請到「路線圖」修改，可先預覽再套用。</p>
        {[...data.phases]
          .sort((a, b) => a.order - b.order)
          .map((p) => (
            <div className="form-grid" key={p.id} style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}>
              <Field label="階段">
                <TextInput value={p.name} onChange={(v) => store.upsert('phases', { ...p, name: v })} />
              </Field>
              <Field label="開始">
                <input className="input" type="date" value={p.start} onChange={(e) => e.target.value && store.upsert('phases', { ...p, start: e.target.value })} />
              </Field>
              <Field label="結束">
                <input className="input" type="date" value={p.end} onChange={(e) => e.target.value && store.upsert('phases', { ...p, end: e.target.value })} />
              </Field>
            </div>
          ))}
      </Section>

      <Section title="匯率（換算用）" icon={Coins}>
        <p className="muted small">費用一律保留原幣別；只有設定匯率的幣別才會顯示換算，並標示匯率、日期與來源。</p>
        {s.fxRates.map((r) => (
          <div className="form-grid" key={r.id} style={{ gridTemplateColumns: '0.7fr 1fr 1fr 1.3fr auto', alignItems: 'end' }}>
            <Field label="幣別">
              <TextInput value={r.currency} onChange={(v) => setRate(r.id, { currency: v.toUpperCase() })} />
            </Field>
            <Field label={`1 單位 = ? ${s.homeCurrency}`}>
              <TextInput type="number" value={String(r.rateToHome)} onChange={(v) => setRate(r.id, { rateToHome: Number(v) || 0 })} />
            </Field>
            <Field label="匯率日期">
              <input className="input" type="date" value={r.date} onChange={(e) => setRate(r.id, { date: e.target.value })} />
            </Field>
            <Field label="來源">
              <TextInput value={r.source} onChange={(v) => setRate(r.id, { source: v })} placeholder="例如：臺灣銀行牌告" />
            </Field>
            <button className="icon-btn" style={{ marginBottom: 12 }} aria-label="刪除匯率" onClick={() => patchSettings({ fxRates: s.fxRates.filter((x) => x.id !== r.id) })}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button className="btn sm" onClick={() => patchSettings({ fxRates: [...s.fxRates, { id: uid('fx'), currency: 'USD', rateToHome: 0, date: today, source: '' }] })}>
          <Plus size={16} />
          新增匯率
        </button>
      </Section>

      <Section title="我的背景" icon={UserRound}>
        <p className="muted small">經歷、申請動機與文章觀點由你提供，網站與 AI 不會虛構。</p>
        <Field label="姓名">
          <TextInput value={s.profile.name} onChange={(v) => patchSettings({ profile: { ...s.profile, name: v } })} />
        </Field>
        <Field label="背景">
          <TextArea value={s.profile.background} onChange={(v) => patchSettings({ profile: { ...s.profile, background: v } })} />
        </Field>
        <Field label="目標">
          <TextArea value={s.profile.goals} onChange={(v) => patchSettings({ profile: { ...s.profile, goals: v } })} />
        </Field>
        <Field label="其他">
          <TextArea value={s.profile.notes} onChange={(v) => patchSettings({ profile: { ...s.profile, notes: v } })} rows={2} />
        </Field>
      </Section>

      <Section title="AI 與搜尋" icon={Bot}>
        <p className="ai-off">
          <Bot size={16} aria-hidden />
          尚未啟用。目前沒有串接搜尋或 AI，網站不會自動查核招生資訊，所有「已查核」標示都來自你手動新增的來源。
        </p>
        <p className="muted small">
          之後串接時，AI 只負責查資料、整理要求、拆任務與檢查缺件；官方資訊更新會進入「待確認」差異比對，不會直接覆蓋你的決策。
        </p>
      </Section>

      <Section title="重設" icon={Trash2}>
        <button
          className="btn danger"
          onClick={async () => {
            if (!(await askConfirm('清除這個瀏覽器裡的所有申請資料，恢復成初始狀態？此動作無法復原，建議先匯出備份。'))) return;
            await clearAll();
            await store.replaceAll(createSeed(today));
            setMsg('已恢復初始資料。');
            mutate([], (d) => d);
          }}
        >
          恢復初始資料
        </button>
      </Section>
    </div>
  );
}
