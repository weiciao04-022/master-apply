import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, CollectionKey, Settings, Task } from './types';
import { COLLECTIONS } from './types';
import { loadAll, requestPersist, saveCollections, saveAll } from './lib/db';
import { createSeed, SCHEMA_VERSION } from './seed';
import { autoPlan } from './lib/scheduler';
import { todayISO } from './lib/dates';

type Key = CollectionKey | 'settings';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Store {
  data: AppData;
  today: string;
  saveState: SaveState;
  persisted: boolean | null;
  /** 修改資料：keys 為會變動的資料表，存檔只寫這些表 */
  mutate: (keys: Key[], fn: (d: AppData) => AppData) => void;
  upsert: <K extends CollectionKey>(key: K, item: AppData[K][number]) => void;
  remove: (key: CollectionKey, id: string) => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  replaceAll: (d: AppData) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

/** 任務或設定變動後重新排入未排程與逾期的任務 */
function syncParents(tasks: Task[]): Task[] {
  const kids = new Map<string, Task[]>();
  for (const t of tasks) if (t.parentId) kids.set(t.parentId, [...(kids.get(t.parentId) ?? []), t]);
  if (kids.size === 0) return tasks;
  let changed = false;
  const out = tasks.map((t) => {
    const c = kids.get(t.id);
    if (!c) return t;
    const allDone = c.every((x) => x.status === 'done');
    if (allDone && t.status !== 'done') {
      changed = true;
      const last = c.map((x) => x.completedAt ?? '').sort().at(-1) || new Date().toISOString();
      return { ...t, status: 'done' as const, completedAt: last };
    }
    if (!allDone && t.status === 'done') {
      changed = true;
      return { ...t, status: 'todo' as const, completedAt: null };
    }
    return t;
  });
  return changed ? out : tasks;
}

function plan(d: AppData, today: string, markDay: boolean): AppData {
  const synced = syncParents(d.tasks);
  if (synced !== d.tasks) d = { ...d, tasks: synced };
  const r = autoPlan(d.tasks, d.settings, today);
  if (r.changedIds.length === 0 && !markDay) return d;
  return {
    ...d,
    tasks: r.tasks,
    settings: markDay
      ? { ...d.settings, lastPlannedOn: today, lastReplanCount: r.rescheduledOverdue }
      : d.settings,
  };
}

/** 刪除時一併整理關聯資料，避免留下懸空 ID */
function cascadeRemove(d: AppData, key: CollectionKey, id: string): { data: AppData; keys: Key[] } {
  const next: AppData = { ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) } as AppData;
  const keys: Key[] = [key];
  if (key === 'programs') {
    next.sources = d.sources.filter((x) => x.programId !== id);
    next.revisions = d.revisions.filter((x) => x.programId !== id);
    next.requirements = d.requirements.filter((x) => x.programId !== id);
    next.applications = d.applications.filter((x) => x.programId !== id);
    next.milestones = d.milestones.filter((x) => x.programId !== id);
    next.tasks = d.tasks.map((t) => ({ ...t, programIds: t.programIds.filter((p) => p !== id) }));
    next.recommenders = d.recommenders.map((r) => {
      const s = { ...r.submissions };
      delete s[id];
      return { ...r, submissions: s };
    });
    keys.push('sources', 'revisions', 'requirements', 'applications', 'milestones', 'tasks', 'recommenders');
  }
  if (key === 'assets') {
    next.requirements = d.requirements.map((r) => (r.assetId === id ? { ...r, assetId: null } : r));
    next.tasks = d.tasks.map((t) => ({ ...t, assetIds: t.assetIds.filter((a) => a !== id) }));
    keys.push('requirements', 'tasks');
  }
  if (key === 'tasks') {
    const doomed = new Set([id]);
    // 一併刪除子任務
    let grew = true;
    while (grew) {
      grew = false;
      for (const t of d.tasks) if (t.parentId && doomed.has(t.parentId) && !doomed.has(t.id)) { doomed.add(t.id); grew = true; }
    }
    next.tasks = d.tasks
      .filter((t) => !doomed.has(t.id))
      .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((x) => !doomed.has(x)) }));
    next.reviews = d.reviews.map((r) => ({ ...r, focusTaskIds: r.focusTaskIds.filter((x) => !doomed.has(x)) }));
    keys.push('reviews');
  }
  if (key === 'sources') {
    next.milestones = d.milestones.map((m) => (m.sourceId === id ? { ...m, sourceId: null } : m));
    next.revisions = d.revisions.map((r) => (r.sourceId === id ? { ...r, sourceId: null } : r));
    keys.push('milestones', 'revisions');
  }
  if (key === 'phases') {
    next.tasks = d.tasks.map((t) => (t.phaseId === id ? { ...t, phaseId: null } : t));
    keys.push('tasks');
  }
  return { data: next, keys };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [today, setToday] = useState(todayISO());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dirty = useRef(new Set<Key>());
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef<AppData | null>(null);

  const flush = useCallback(async () => {
    const d = latest.current;
    if (!d || dirty.current.size === 0) return;
    const keys = [...dirty.current];
    dirty.current.clear();
    setSaveState('saving');
    try {
      await saveCollections(d, keys);
      setSaveState('saved');
    } catch (e) {
      console.error(e);
      keys.forEach((k) => dirty.current.add(k));
      setSaveState('error');
    }
  }, []);

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 250);
  }, [flush]);

  // 載入
  useEffect(() => {
    (async () => {
      try {
        let d = await loadAll();
        const t = todayISO();
        if (!d) {
          d = createSeed(t);
          d = plan(d, t, true);
          await saveAll(d);
        } else {
          d = { ...d, schemaVersion: SCHEMA_VERSION };
          for (const k of COLLECTIONS) if (!Array.isArray(d[k])) (d as unknown as Record<string, unknown>)[k] = [];
          // 舊資料補上回答方式
          if (d.tasks.some((t) => !t.answerType)) {
            d = { ...d, tasks: d.tasks.map((t) => (t.answerType ? t : { ...t, answerType: t.notes || /備註|紀錄|寫下/.test(t.doneCriteria) ? 'text' : 'check', answeredAt: t.notes ? t.createdAt : null })) };
            await saveCollections(d, ['tasks']);
          }
          // 舊版文字：「備註」改名為「我的紀錄」
          if (d.tasks.some((t) => t.doneCriteria.includes('備註'))) {
            d = { ...d, tasks: d.tasks.map((t) => ({ ...t, doneCriteria: t.doneCriteria.replace('在備註寫下', '在「我的紀錄」寫下').replace('寫在備註', '寫在「我的紀錄」') })) };
            await saveCollections(d, ['tasks']);
          }
          if (d.settings.lastPlannedOn !== t) {
            d = plan(d, t, true);
            await saveCollections(d, ['tasks', 'settings']);
          }
        }
        latest.current = d;
        setData(d);
        setPersisted(await requestPersist());
      } catch (e) {
        console.error(e);
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  // 跨日時重新排程
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = todayISO();
      setToday((prev) => {
        if (prev !== t && latest.current) {
          const d = plan(latest.current, t, true);
          latest.current = d;
          setData(d);
          dirty.current.add('tasks');
          dirty.current.add('settings');
          schedule();
        }
        return t;
      });
    }, 60_000);
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush, schedule]);

  const mutate = useCallback(
    (keys: Key[], fn: (d: AppData) => AppData) => {
      const cur = latest.current;
      if (!cur) return;
      let next = fn(cur);
      const allKeys = new Set(keys);
      if (allKeys.has('tasks') || allKeys.has('settings')) {
        const planned = plan(next, todayISO(), false);
        if (planned !== next) allKeys.add('tasks');
        next = planned;
      }
      latest.current = next;
      setData(next);
      allKeys.forEach((k) => dirty.current.add(k));
      schedule();
    },
    [schedule],
  );

  const store = useMemo<Store | null>(() => {
    if (!data) return null;
    return {
      data,
      today,
      saveState,
      persisted,
      mutate,
      upsert: (key, item) =>
        mutate([key], (d) => {
          const list = d[key] as { id: string }[];
          const exists = list.some((x) => x.id === (item as { id: string }).id);
          return {
            ...d,
            [key]: exists ? list.map((x) => (x.id === (item as { id: string }).id ? item : x)) : [...list, item],
          } as AppData;
        }),
      remove: (key, id) => {
        const cur = latest.current!;
        const { keys } = cascadeRemove(cur, key, id);
        mutate(keys, (d) => cascadeRemove(d, key, id).data);
      },
      patchTask: (id, patch) =>
        mutate(['tasks'], (d) => ({ ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      patchSettings: (patch) => mutate(['settings'], (d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      replaceAll: async (d) => {
        window.clearTimeout(timer.current);
        dirty.current.clear();
        const planned = plan(d, todayISO(), true);
        await saveAll(planned);
        latest.current = planned;
        setData(planned);
        setSaveState('saved');
      },
    };
  }, [data, today, saveState, persisted, mutate]);

  if (loadError)
    return (
      <div className="boot">
        <p>無法開啟瀏覽器資料庫（IndexedDB）：{loadError}</p>
        <p>若使用無痕模式或關閉了網站資料，請改用一般視窗。</p>
      </div>
    );
  if (!store) return <div className="boot">載入中…</div>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
