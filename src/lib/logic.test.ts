import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addDays, addYears, diffDays, startOfWeek, weekday } from './dates';
import { autoPlan, canWorkOn, dailyMinuteBudget, deferTask, tasksOn } from './scheduler';
import { applyIntakeChange, convertMoney, materialProgress, moneyText, previewIntakeChange } from './logic';
import { exportJSON, parseBackup, toCSV } from './backup';
import { clearAll, loadAll, saveAll, saveCollections } from './db';
import { createSeed } from '../seed';
import type { Settings, Task } from '../types';

const TODAY = '2026-11-18'; // 週三

const baseSettings = (): Settings => ({ ...createSeed(TODAY).settings, busyPeriods: [] });

function mk(id: string, extra: Partial<Task> = {}): Task {
  return {
    id, title: id, doneCriteria: '', minutes: 20, category: 'research', type: 'mine', status: 'todo', priority: 2,
    phaseId: null, dueDate: null, scheduledDate: null, pinned: false, dependsOn: [], assetIds: [], programIds: [],
    parentId: null, completedAt: null, deferCount: 0, notes: '', createdAt: '2026-01-01T00:00:00Z', ...extra,
  };
}

describe('日期計算', () => {
  it('加減日跨月跨年', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(diffDays('2027-01-01', '2026-12-25')).toBe(7);
  });
  it('閏年平移', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
  });
  it('星期與週起始（週一）', () => {
    expect(weekday(TODAY)).toBe(3);
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
  });
});

describe('排程', () => {
  it('預設週四、週日休息', () => {
    const s = baseSettings();
    expect(canWorkOn('2026-11-19', 'research', s)).toBe(false); // 週四
    expect(canWorkOn('2026-11-22', 'research', s)).toBe(false); // 週日
    expect(canWorkOn('2026-11-20', 'research', s)).toBe(true);
  });

  it('忙碌期間只排允許的類別', () => {
    const s = createSeed(TODAY).settings; // 至 12/24 只排英文
    expect(canWorkOn('2026-11-20', 'research', s)).toBe(false);
    expect(canWorkOn('2026-11-20', 'english', s)).toBe(true);
    expect(canWorkOn('2026-12-25', 'research', s)).toBe(true);
  });

  it('每日最多 3 項、逾期任務分散而非全部堆到隔天', () => {
    const s = baseSettings();
    const tasks = Array.from({ length: 8 }, (_, i) => mk('t' + i, { scheduledDate: '2026-11-10', minutes: 15 }));
    const r = autoPlan(tasks, s, TODAY);
    expect(r.rescheduledOverdue).toBe(8);
    const perDay = new Map<string, number>();
    for (const t of r.tasks) perDay.set(t.scheduledDate!, (perDay.get(t.scheduledDate!) ?? 0) + 1);
    for (const n of perDay.values()) expect(n).toBeLessThanOrEqual(3);
    for (const d of perDay.keys()) expect(canWorkOn(d, 'research', s)).toBe(true);
    expect(perDay.size).toBeGreaterThanOrEqual(3);
  });

  it('遵守每日分鐘上限', () => {
    const s = { ...baseSettings(), weeklyMinutes: 100 }; // 5 個工作日 → 每天 20 分
    expect(dailyMinuteBudget(s)).toBe(20);
    const r = autoPlan([mk('a', { minutes: 20 }), mk('b', { minutes: 20 })], s, TODAY);
    expect(r.tasks[0].scheduledDate).not.toBe(r.tasks[1].scheduledDate);
  });

  it('前置任務先排，後續任務排在之後', () => {
    const s = baseSettings();
    const r = autoPlan([mk('b', { dependsOn: ['a'], dueDate: '2026-11-19' }), mk('a', { dueDate: '2026-12-01' })], s, TODAY);
    const a = r.tasks.find((t) => t.id === 'a')!;
    const b = r.tasks.find((t) => t.id === 'b')!;
    expect(b.scheduledDate! > a.scheduledDate!).toBe(true);
  });

  it('等待他人／待查證／有子任務的母任務不排入每日', () => {
    const s = baseSettings();
    const r = autoPlan(
      [mk('w', { type: 'waiting' }), mk('v', { type: 'verify' }), mk('p'), mk('c', { parentId: 'p' })],
      s, TODAY,
    );
    const by = Object.fromEntries(r.tasks.map((t) => [t.id, t.scheduledDate]));
    expect(by.w).toBeNull();
    expect(by.v).toBeNull();
    expect(by.p).toBeNull();
    expect(by.c).toBe(TODAY);
    expect(tasksOn(TODAY, r.tasks).map((t) => t.id)).toEqual(['c']);
  });

  it('未來已排好的任務不被挪動', () => {
    const s = baseSettings();
    const r = autoPlan([mk('x', { scheduledDate: '2026-11-27' })], s, TODAY);
    expect(r.changedIds).toEqual([]);
  });

  it('延後到下一個有空位的工作日', () => {
    const s = baseSettings();
    const tasks = [mk('a', { scheduledDate: TODAY }), mk('f1', { scheduledDate: '2026-11-20' }), mk('f2', { scheduledDate: '2026-11-20' }), mk('f3', { scheduledDate: '2026-11-20' })];
    // 11/19 週四休息、11/20 已滿 3 項 → 11/21
    expect(deferTask(tasks[0], tasks, s, TODAY)).toBe('2026-11-21');
  });

  it('初始資料：12/24 前今日只會出現英文任務', () => {
    const d = createSeed(TODAY);
    const r = autoPlan(d.tasks, d.settings, TODAY);
    for (const t of r.tasks) {
      if (t.scheduledDate && t.scheduledDate <= '2026-12-24') expect(t.category).toBe('english');
    }
    expect(tasksOn(TODAY, r.tasks).length).toBeLessThanOrEqual(3);
  });
});

describe('入學年度變更', () => {
  it('預覽：暫估與自訂期限平移，官方截止日標示重新查核', () => {
    const d = createSeed(TODAY);
    d.milestones.push({ id: 'off', title: '官方截止', date: '2027-12-15', kind: 'official', programId: null, sourceId: null, note: '' });
    const ch = previewIntakeChange(d, 2029, TODAY);
    const off = ch.find((c) => c.id === 'off')!;
    expect(off.action).toBe('recheck');
    expect(off.to).toBe('2027-12-15');
    expect(ch.find((c) => c.id === 'ms_shortlist')!.to).toBe('2028-06-30');
    const after = applyIntakeChange(d, 2029, ch);
    expect(after.settings.intakeYear).toBe(2029);
    expect(after.milestones.find((m) => m.id === 'off')!.date).toBe('2027-12-15');
    expect(after.phases.find((p) => p.id === 'ph_submit')!.start).toBe('2028-11-01');
    expect(after.programs[0].intakeLabel).toBe('2029 Fall');
  });
  it('年度不變時沒有變更', () => {
    expect(previewIntakeChange(createSeed(TODAY), 2028, TODAY)).toEqual([]);
  });
});

describe('材料與費用', () => {
  it('完成度以必要材料為分母，已上傳與已提交分開', () => {
    const reqs = [
      { id: '1', programId: 'p', name: 'CV', kind: 'cv' as const, required: true, assetId: 'a', uploaded: true, submitted: true, note: '' },
      { id: '2', programId: 'p', name: 'SOP', kind: 'sop' as const, required: true, assetId: null, uploaded: true, submitted: false, note: '' },
      { id: '3', programId: 'p', name: '選填', kind: 'other' as const, required: false, assetId: null, uploaded: false, submitted: false, note: '' },
    ];
    const m = materialProgress('p', reqs, (id) => id === 'a');
    expect(m).toMatchObject({ total: 2, ready: 1, uploaded: 2, submitted: 1 });
    expect(m.missing.map((r) => r.id)).toEqual(['2']);
  });
  it('未知費用不當成 0，換算標示匯率與日期', () => {
    expect(moneyText({ amount: null, currency: 'USD', period: '', note: '' })).toBe('未知（待查）');
    expect(convertMoney({ amount: null, currency: 'USD', period: '', note: '' }, [], 'TWD')).toBeNull();
    const s = convertMoney({ amount: 1000, currency: 'USD', period: '', note: '' }, [{ id: 'r', currency: 'USD', rateToHome: 32.5, date: '2026-11-18', source: '台銀' }], 'TWD');
    expect(s).toContain('32,500');
    expect(s).toContain('2026-11-18');
  });
});

describe('備份與儲存', () => {
  it('JSON 匯出後可完整還原', () => {
    const d = createSeed(TODAY);
    const r = parseBackup(exportJSON(d));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(d);
  });
  it('拒絕錯誤檔案', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"foo":1}').ok).toBe(false);
  });
  it('CSV 正確跳脫逗號、引號與換行', () => {
    const csv = toCSV(['a', 'b'], [['x,y', 'say "hi"\nok']]);
    expect(csv).toBe('﻿a,b\r\n"x,y","say ""hi""\nok"');
  });
  it('IndexedDB 寫入後重新讀取（模擬重新整理）', async () => {
    await clearAll();
    expect(await loadAll()).toBeNull();
    const d = createSeed(TODAY);
    await saveAll(d);
    const loaded = await loadAll();
    expect(loaded!.tasks.length).toBe(d.tasks.length);
    expect(loaded!.settings.profile.name).toBe('黃暐喬');
    const changed = { ...d, tasks: d.tasks.slice(1) };
    await saveCollections(changed, ['tasks']);
    expect((await loadAll())!.tasks.length).toBe(d.tasks.length - 1);
  });
});
