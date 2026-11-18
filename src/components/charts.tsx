import type { Task } from '../types';
import { addDays, fmt, startOfWeek, toISO } from '../lib/dates';

export function completionsByDay(tasks: Task[]): Map<string, number> {
  const parents = new Set(tasks.map((t) => t.parentId).filter(Boolean));
  const m = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== 'done' || !t.completedAt || parents.has(t.id)) continue;
    const d = toISO(new Date(t.completedAt));
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

/** 熱度日曆：只呈現累積完成，不計算連續天數 */
export function Heatmap({ tasks, today, weeks = 16 }: { tasks: Task[]; today: string; weeks?: number }) {
  const counts = completionsByDay(tasks);
  const start = addDays(startOfWeek(today), -7 * (weeks - 1));
  const cols: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
  }
  let total = 0;
  for (const c of cols) for (const d of c) total += counts.get(d) ?? 0;
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : 3);
  return (
    <figure className="heatmap">
      <div className="heatmap-grid" role="img" aria-label={`近 ${weeks} 週共完成 ${total} 項任務`}>
        <div className="heatmap-days" aria-hidden>
          <span>一</span>
          <span />
          <span>三</span>
          <span />
          <span>五</span>
          <span />
          <span>日</span>
        </div>
        {cols.map((c, i) => (
          <div className="heatmap-col" key={i}>
            {c.map((d) => {
              const n = counts.get(d) ?? 0;
              return (
                <span
                  key={d}
                  className={`hm-cell l${level(n)} ${d > today ? 'future' : ''} ${d === today ? 'is-today' : ''}`}
                  title={`${fmt(d)}：完成 ${n} 項`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <figcaption className="muted small">
        近 {weeks} 週累積完成 <strong>{total}</strong> 項（只計最小步驟）。顏色越深代表當天完成越多。
      </figcaption>
    </figure>
  );
}
