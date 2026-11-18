import type {
  AppData,
  FxRate,
  ISODate,
  Milestone,
  Money,
  Phase,
  Program,
  Requirement,
  Task,
} from '../types';
import { addYears } from './dates';

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ───────── 入學年度變更預覽 ─────────
export interface ShiftChange {
  entity: 'phase' | 'milestone' | 'task';
  id: string;
  title: string;
  kindLabel: string;
  from: ISODate | null;
  to: ISODate | null;
  /** 官方截止日不自動平移，只標記需重新查核 */
  action: 'shift' | 'recheck' | 'keep';
  note: string;
}

export function previewIntakeChange(data: AppData, newYear: number, today: ISODate): ShiftChange[] {
  const delta = newYear - data.settings.intakeYear;
  if (delta === 0) return [];
  const out: ShiftChange[] = [];
  for (const p of [...data.phases].sort((a, b) => a.order - b.order)) {
    out.push({
      entity: 'phase',
      id: p.id,
      title: `階段：${p.name}`,
      kindLabel: '暫估',
      from: p.start,
      to: addYears(p.start, delta),
      action: 'shift',
      note: `結束 ${p.end} → ${addYears(p.end, delta)}`,
    });
  }
  for (const m of [...data.milestones].sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.kind === 'official') {
      out.push({
        entity: 'milestone',
        id: m.id,
        title: m.title,
        kindLabel: '官方截止日',
        from: m.date,
        to: m.date,
        action: 'recheck',
        note: '官方日期依入學年度公布，不自動推算；保留原日期並標記待重新查核',
      });
    } else {
      out.push({
        entity: 'milestone',
        id: m.id,
        title: m.title,
        kindLabel: m.kind === 'self' ? '自訂期限' : '暫估',
        from: m.date,
        to: addYears(m.date, delta),
        action: 'shift',
        note: '',
      });
    }
  }
  for (const t of data.tasks) {
    if (t.status === 'done' || !t.dueDate) continue;
    const to = addYears(t.dueDate, delta);
    // 平移到今天之前的期限沒有意義，保留原值
    if (to < today) {
      out.push({ entity: 'task', id: t.id, title: t.title, kindLabel: '任務期限', from: t.dueDate, to: t.dueDate, action: 'keep', note: '平移後早於今天，保留原期限' });
    } else {
      out.push({ entity: 'task', id: t.id, title: t.title, kindLabel: '任務期限', from: t.dueDate, to, action: 'shift', note: '' });
    }
  }
  return out;
}

export function applyIntakeChange(data: AppData, newYear: number, changes: ShiftChange[]): AppData {
  const map = new Map(changes.map((c) => [c.entity + c.id, c]));
  const delta = newYear - data.settings.intakeYear;
  const phases: Phase[] = data.phases.map((p) =>
    map.get('phase' + p.id) ? { ...p, start: addYears(p.start, delta), end: addYears(p.end, delta) } : p,
  );
  const milestones: Milestone[] = data.milestones.map((m) => {
    const c = map.get('milestone' + m.id);
    if (!c) return m;
    if (c.action === 'recheck')
      return { ...m, note: (m.note ? m.note + '｜' : '') + `入學年度改為 ${newYear}，需重新查核` };
    return { ...m, date: c.to ?? m.date };
  });
  const tasks: Task[] = data.tasks.map((t) => {
    const c = map.get('task' + t.id);
    return c && c.action === 'shift' ? { ...t, dueDate: c.to } : t;
  });
  const label = `${newYear} ${data.settings.intakeTerm}`;
  const programs: Program[] = data.programs.map((p) => ({ ...p, intakeLabel: label }));
  return {
    ...data,
    settings: { ...data.settings, intakeYear: newYear },
    phases,
    milestones,
    tasks,
    programs,
  };
}

// ───────── 材料完成度 ─────────
export interface MaterialProgress {
  /** 分母：必要材料數 */
  total: number;
  ready: number;
  uploaded: number;
  submitted: number;
  missing: Requirement[];
}

export function materialProgress(
  programId: string,
  reqs: Requirement[],
  assetReady: (assetId: string | null) => boolean,
): MaterialProgress {
  const required = reqs.filter((r) => r.programId === programId && r.required);
  return {
    total: required.length,
    ready: required.filter((r) => assetReady(r.assetId)).length,
    uploaded: required.filter((r) => r.uploaded).length,
    submitted: required.filter((r) => r.submitted).length,
    missing: required.filter((r) => !r.submitted),
  };
}

export function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

// ───────── 費用 ─────────
export function moneyText(m: Money): string {
  if (m.amount === null) return '未知（待查）';
  return `${m.currency} ${m.amount.toLocaleString('en-US')}${m.period ? ` / ${m.period}` : ''}`;
}

export function convertMoney(m: Money, rates: FxRate[], home: string): string | null {
  if (m.amount === null) return null;
  if (m.currency === home) return null;
  const r = rates.find((x) => x.currency.toUpperCase() === m.currency.toUpperCase());
  if (!r) return null;
  const v = Math.round(m.amount * r.rateToHome);
  return `≈ ${home} ${v.toLocaleString('en-US')}（匯率 ${r.rateToHome}，${r.date}${r.source ? '，' + r.source : ''}）`;
}

// ───────── 階段進度 ─────────
export function phaseProgress(phaseId: string, tasks: Task[]) {
  const list = tasks.filter((t) => t.phaseId === phaseId && t.type !== 'waiting' && !tasks.some((c) => c.parentId === t.id));
  return { done: list.filter((t) => t.status === 'done').length, total: list.length };
}
