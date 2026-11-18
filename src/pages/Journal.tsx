import { useMemo, useState } from 'react';
import { Copy, Download, Search } from 'lucide-react';
import { useStore } from '../store';
import type { AnswerType, AppData } from '../types';
import { TASK_CATEGORY } from '../labels';
import { Empty } from '../components/ui';
import { HeartFolder } from '../components/kawaii';
import { download } from '../lib/backup';
import { fmt, toISO } from '../lib/dates';
import { programHref } from '../lib/route';
import { TaskForm } from '../components/tasks';
import type { Task } from '../types';

type Source = 'task' | 'program' | 'review' | 'asset';
const SOURCE_LABEL: Record<Source, string> = { task: '任務回答', program: '學程筆記', review: '每週心得', asset: '素材筆記' };

export interface Entry {
  id: string;
  source: Source;
  title: string;
  question: string;
  answerType: AnswerType;
  body: string;
  date: string;
  tags: string[];
  href?: string;
  task?: Task;
}

/** 把散在各處、由使用者自己寫的文字整理成一份清單 */
export function collectEntries(d: AppData): Entry[] {
  const out: Entry[] = [];
  const pname = (id: string) => {
    const p = d.programs.find((x) => x.id === id);
    return p ? p.school : '';
  };
  for (const t of d.tasks) {
    if (!t.notes?.trim()) continue;
    out.push({
      id: t.id,
      source: 'task',
      title: t.title,
      question: t.doneCriteria || t.title,
      answerType: t.answerType ?? 'text',
      body: t.notes,
      date: toISO(new Date(t.answeredAt ?? t.createdAt)),
      tags: [TASK_CATEGORY[t.category], ...t.programIds.map(pname).filter(Boolean), t.status === 'done' ? '已完成' : '進行中'],
      task: t,
    });
  }
  for (const p of d.programs) {
    if (p.fitReasons.trim())
      out.push({ id: p.id + '_fit', source: 'program', title: `${p.school}｜${p.programName}`, question: '我的適合原因', answerType: 'text', body: p.fitReasons, date: p.updatedAt.slice(0, 10), tags: [p.school], href: programHref(p.id) });
    if (p.questions.trim())
      out.push({ id: p.id + '_q', source: 'program', title: `${p.school}｜${p.programName}`, question: '我的疑問', answerType: 'text', body: p.questions, date: p.updatedAt.slice(0, 10), tags: [p.school], href: programHref(p.id) });
  }
  for (const r of d.reviews) {
    if (r.note.trim())
      out.push({ id: r.id, source: 'review', title: `${fmt(r.weekStart)} 這週`, question: '本週心得', answerType: 'text', body: r.note, date: r.weekStart, tags: ['回顧'], href: '#review' });
  }
  for (const a of d.assets) {
    const text = a.notes;
    if (text.trim()) out.push({ id: a.id, source: 'asset', title: a.title, question: '素材筆記', answerType: 'text', body: text, date: a.updatedAt, tags: ['文件'], href: '#docs' });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function bodyToMarkdown(e: Entry): string {
  if (e.answerType === 'list') return e.body.split('\n').filter((x) => x.trim()).map((x, i) => `${i + 1}. ${x}`).join('\n');
  if (e.answerType === 'date') return fmt(e.body);
  return e.body;
}

export function toMarkdown(entries: Entry[], title: string): string {
  const lines = [`# ${title}`, '', `匯出時間：${new Date().toLocaleString('zh-TW')}　共 ${entries.length} 筆`, ''];
  for (const s of Object.keys(SOURCE_LABEL) as Source[]) {
    const list = entries.filter((e) => e.source === s);
    if (!list.length) continue;
    lines.push(`## ${SOURCE_LABEL[s]}`, '');
    for (const e of list) {
      lines.push(`### ${e.title}`, `- 問題：${e.question}`, `- 日期：${fmt(e.date)}`, `- 標籤：${e.tags.join('、')}`, '', bodyToMarkdown(e), '');
    }
  }
  return lines.join('\n');
}

function Body({ e }: { e: Entry }) {
  if (e.answerType === 'list')
    return (
      <ol className="entry-list">
        {e.body
          .split('\n')
          .filter((x) => x.trim())
          .map((x, i) => (
            <li key={i}>{x}</li>
          ))}
      </ol>
    );
  if (e.answerType === 'link')
    return (
      <a href={e.body} target="_blank" rel="noreferrer" className="ext">
        {e.body}
      </a>
    );
  if (e.answerType === 'date') return <p>{fmt(e.body, true)}</p>;
  return <p className="pre">{e.body}</p>;
}

export default function Journal() {
  const { data, today } = useStore();
  const all = useMemo(() => collectEntries(data), [data]);
  const [q, setQ] = useState('');
  const [source, setSource] = useState<Source | ''>('');
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);

  const list = all.filter((e) => {
    if (source && e.source !== source) return false;
    if (!q.trim()) return true;
    const hay = `${e.title} ${e.question} ${e.body} ${e.tags.join(' ')}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`已複製${what} ♡`);
    } catch {
      setMsg('瀏覽器不允許複製，請改用下載');
    }
  };

  const filtered = q.trim() || source;

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">你在網站上寫過的所有內容，都會自動整理到這裡</p>
          <h1>紀錄庫</h1>
        </div>
        <div className="head-actions">
          <button className="btn primary" disabled={all.length === 0} onClick={() => download(`我的申請紀錄-${today}.md`, toMarkdown(all, '我的申請紀錄庫'), 'text/markdown')}>
            <Download size={16} />
            一鍵下載全部
          </button>
          <button className="btn" disabled={all.length === 0} onClick={() => copy(toMarkdown(all, '我的申請紀錄庫'), '全部紀錄')}>
            <Copy size={16} />
            全部複製
          </button>
        </div>
      </header>

      <div className="folder-desk" role="group" aria-label="依來源篩選">
        <button className={`folder ${source === '' ? 'on' : ''}`} aria-pressed={source === ''} onClick={() => setSource('')}>
          <HeartFolder open={source === ''} />
          <span className="folder-name">全部</span>
          <span className="folder-count">{all.length}</span>
        </button>
        {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
          <button key={s} className={`folder ${source === s ? 'on' : ''}`} aria-pressed={source === s} onClick={() => setSource(source === s ? '' : s)}>
            <HeartFolder open={source === s} />
            <span className="folder-name">{SOURCE_LABEL[s]}</span>
            <span className="folder-count">{all.filter((e) => e.source === s).length}</span>
          </button>
        ))}
      </div>

      <div className="search-row">
        <Search size={18} aria-hidden />
        <input className="input" type="search" placeholder="搜尋紀錄：例如 TOEFL、Columbia、作品" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋紀錄" />
        {filtered && (
          <button className="btn sm" onClick={() => download(`我的申請紀錄-篩選-${today}.md`, toMarkdown(list, '我的申請紀錄（篩選結果）'), 'text/markdown')} disabled={list.length === 0}>
            <Download size={15} />
            下載這 {list.length} 筆
          </button>
        )}
      </div>
      {msg && (
        <p className="small" role="status">
          {msg}
        </p>
      )}

      {list.length === 0 ? (
        <Empty icon={Search} title={all.length === 0 ? '還沒有紀錄' : '找不到符合的紀錄'}>
          {all.length === 0 && <p>在任務卡上回答問題、列清單或存連結，內容就會出現在這裡。</p>}
        </Empty>
      ) : (
        <div className="entries">
          {list.map((e) => (
            <article key={e.id} className="card entry">
              <div className="entry-head">
                <span className="entry-source">{SOURCE_LABEL[e.source]}</span>
                <span className="muted small">{fmt(e.date)}</span>
              </div>
              <h2 className="entry-title">{e.title}</h2>
              <div className="bubble from-app small-bubble">{e.question}</div>
              <div className="bubble from-me small-bubble">
                <Body e={e} />
              </div>
              <div className="badges">
                {e.tags.map((t) => (
                  <span key={t} className="badge">
                    {t}
                  </span>
                ))}
              </div>
              <div className="row-actions">
                <button className="btn ghost sm" onClick={() => copy(`${e.title}\n${e.question}\n\n${bodyToMarkdown(e)}`, '這筆紀錄')}>
                  <Copy size={15} />
                  複製
                </button>
                {e.task ? (
                  <button className="btn ghost sm" onClick={() => setEditing(e.task!)}>
                    修改
                  </button>
                ) : (
                  e.href && (
                    <a className="btn ghost sm" href={e.href}>
                      前往
                    </a>
                  )
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <TaskForm task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
