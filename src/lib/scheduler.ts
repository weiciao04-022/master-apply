import type { ISODate, Settings, Task, TaskCategory } from '../types';
import { addDays, inRange, weekday } from './dates';

const HORIZON_DAYS = 400;

export function isRestDay(date: ISODate, s: Settings): boolean {
  return s.restWeekdays.includes(weekday(date));
}

/** 這一天可不可以排入某類任務（休息日、忙碌期間） */
export function canWorkOn(date: ISODate, category: TaskCategory, s: Settings): boolean {
  if (isRestDay(date, s)) return false;
  for (const p of s.busyPeriods) {
    if (inRange(date, p.start, p.end) && !p.allowCategories.includes(category)) return false;
  }
  return true;
}

export function workDaysPerWeek(s: Settings): number {
  return Math.max(1, 7 - new Set(s.restWeekdays).size);
}

/** 每個工作日的分鐘上限，由每週時間上限平均分配 */
export function dailyMinuteBudget(s: Settings): number {
  return Math.max(15, Math.floor(s.weeklyMinutes / workDaysPerWeek(s)));
}

/** 有未完成子任務的母任務不直接排入每日 */
export function hasOpenChildren(task: Task, tasks: Task[]): boolean {
  return tasks.some((t) => t.parentId === task.id && t.status !== 'done');
}

export function isSchedulable(task: Task, tasks: Task[]): boolean {
  return task.status === 'todo' && task.type === 'mine' && !hasOpenChildren(task, tasks);
}

export function depsDone(task: Task, byId: Map<string, Task>): boolean {
  return task.dependsOn.every((id) => {
    const d = byId.get(id);
    return !d || d.status === 'done';
  });
}

interface Load {
  count: number;
  minutes: number;
}

function buildLoad(tasks: Task[], fixedIds: Set<string>): Map<ISODate, Load> {
  const load = new Map<ISODate, Load>();
  for (const t of tasks) {
    if (!fixedIds.has(t.id) || !t.scheduledDate) continue;
    const l = load.get(t.scheduledDate) ?? { count: 0, minutes: 0 };
    l.count += 1;
    l.minutes += t.minutes;
    load.set(t.scheduledDate, l);
  }
  return load;
}

function fits(l: Load | undefined, minutes: number, s: Settings, budget: number): boolean {
  const cur = l ?? { count: 0, minutes: 0 };
  if (cur.count >= s.maxTasksPerDay) return false;
  // 當天還沒排任務時，允許單一較長任務；否則不超過每日分鐘上限
  if (cur.count === 0) return true;
  return cur.minutes + minutes <= budget;
}

function sortKey(a: Task, b: Task): number {
  const ad = a.dueDate ?? '9999-12-31';
  const bd = b.dueDate ?? '9999-12-31';
  if (ad !== bd) return ad < bd ? -1 : 1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export interface PlanResult {
  tasks: Task[];
  /** 從過去日期被重新安排的任務數 */
  rescheduledOverdue: number;
  changedIds: string[];
}

/**
 * 自動排程：
 * - 只排「我需要執行」且沒有未完成子任務的任務
 * - 今天以後已排好的任務保持不動
 * - 未排程或逾期的任務依期限 → 重要性 → 建立時間排序，
 *   分散到之後的工作日，每天最多 maxTasksPerDay 項並遵守每日分鐘上限
 * - 前置任務未完成時，排在前置任務之後
 */
export function autoPlan(tasks: Task[], s: Settings, today: ISODate): PlanResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const budget = dailyMinuteBudget(s);

  const fixed = new Set<string>();
  const toPlace: Task[] = [];
  let overdue = 0;

  for (const t of tasks) {
    if (!isSchedulable(t, tasks)) continue;
    if (t.scheduledDate && t.scheduledDate >= today && canWorkOn(t.scheduledDate, t.category, s)) {
      fixed.add(t.id);
    } else if (t.scheduledDate && t.scheduledDate >= today && t.pinned) {
      // 使用者手動指定的日期，即使碰上休息日也尊重
      fixed.add(t.id);
    } else {
      if (t.scheduledDate && t.scheduledDate < today) overdue += 1;
      toPlace.push(t);
    }
  }

  const load = buildLoad(tasks, fixed);
  const placed = new Map<string, ISODate>();
  const result = new Map(tasks.map((t) => [t.id, t]));

  // 依前置關係做拓撲排序，同層依期限與重要性
  const pending = [...toPlace].sort(sortKey);
  const pendingIds = new Set(pending.map((t) => t.id));
  const ordered: Task[] = [];
  const visiting = new Set<string>();
  const visit = (t: Task) => {
    if (!pendingIds.has(t.id) || visiting.has(t.id)) return;
    visiting.add(t.id);
    for (const dep of t.dependsOn) {
      const d = byId.get(dep);
      if (d) visit(d);
    }
    pendingIds.delete(t.id);
    ordered.push(t);
  };
  pending.forEach(visit);

  const changedIds: string[] = [];
  for (const t of ordered) {
    let earliest = today;
    for (const dep of t.dependsOn) {
      const d = result.get(dep);
      if (!d || d.status === 'done') continue;
      const depDate = placed.get(dep) ?? d.scheduledDate;
      if (depDate && addDays(depDate, 1) > earliest) earliest = addDays(depDate, 1);
    }
    let date: ISODate | null = null;
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const d = addDays(earliest, i);
      if (!canWorkOn(d, t.category, s)) continue;
      if (fits(load.get(d), t.minutes, s, budget)) {
        date = d;
        break;
      }
    }
    if (date) {
      const l = load.get(date) ?? { count: 0, minutes: 0 };
      l.count += 1;
      l.minutes += t.minutes;
      load.set(date, l);
      placed.set(t.id, date);
    }
    if (date !== t.scheduledDate) {
      result.set(t.id, { ...t, scheduledDate: date, pinned: false });
      changedIds.push(t.id);
    }
  }

  return {
    tasks: tasks.map((t) => result.get(t.id)!),
    rescheduledOverdue: overdue,
    changedIds,
  };
}

/** 「延後」：移到今天之後第一個還有空位的可工作日 */
export function deferTask(task: Task, tasks: Task[], s: Settings, today: ISODate): ISODate | null {
  const budget = dailyMinuteBudget(s);
  const from = task.scheduledDate && task.scheduledDate > today ? task.scheduledDate : today;
  const others = new Set(
    tasks.filter((t) => t.id !== task.id && isSchedulable(t, tasks) && t.scheduledDate).map((t) => t.id),
  );
  const load = buildLoad(tasks, others);
  for (let i = 1; i < HORIZON_DAYS; i++) {
    const d = addDays(from, i);
    if (!canWorkOn(d, task.category, s)) continue;
    if (fits(load.get(d), task.minutes, s, budget)) return d;
  }
  return null;
}

/** 某天被排入的任務（今日清單用） */
export function tasksOn(date: ISODate, tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.type === 'mine' && t.scheduledDate === date && !hasOpenChildren(t, tasks))
    .sort(sortKey);
}
