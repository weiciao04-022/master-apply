import { useState } from 'react';
import { FilePlus2, FolderOpen, History, Mail, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useStore } from '../store';
import type { Asset, AssetKind, AssetStatus, AssetVersion, Recommender, RecResponse, RecSubmission } from '../types';
import { ASSET_KIND, ASSET_STATUS, REC_RESPONSE, REC_SUBMISSION } from '../labels';
import { Badge, Empty, ExtLink, Field, Modal, Section, Select, TextArea, TextInput } from '../components/ui';
import { fmt } from '../lib/dates';
import { uid } from '../lib/logic';
import { askConfirm } from '../components/confirm';
import { programHref } from '../lib/route';

function AssetModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [a, setA] = useState(asset);
  const exists = data.assets.some((x) => x.id === a.id);
  const set = (x: Partial<Asset>) => setA((c) => ({ ...c, ...x }));
  const [link, setLink] = useState('');
  return (
    <Modal
      title={exists ? '編輯素材' : '新增素材'}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <button className="btn danger ghost" onClick={() => void askConfirm(`刪除「${a.title}」？學程材料的對應會被清空。`).then((ok) => ok && (remove('assets', a.id), onClose()))}>
              <Trash2 size={16} />
              刪除
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button
            className="btn primary"
            disabled={!a.title.trim()}
            onClick={() => {
              const today = new Date();
              const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const versions = !exists && link.trim() ? [{ version: 'v1', date: iso, link: link.trim(), note: '' }] : a.versions;
              upsert('assets', { ...a, versions, updatedAt: iso });
              onClose();
            }}
          >
            儲存
          </button>
        </>
      }
    >
      <Field label="名稱">
        <TextInput value={a.title} onChange={(v) => set({ title: v })} required />
      </Field>
      <div className="form-grid">
        <Field label="類型">
          <Select<AssetKind> value={a.kind} onChange={(v) => set({ kind: v })} options={ASSET_KIND} />
        </Field>
        <Field label="完成狀態">
          <Select<AssetStatus> value={a.status} onChange={(v) => set({ status: v })} options={ASSET_STATUS} />
        </Field>
      </div>
      {!exists && (
        <Field label="外部連結（選填）" hint="Google Drive、作品網址等，不必把檔案搬進來">
          <TextInput type="url" value={link} onChange={setLink} placeholder="https://" />
        </Field>
      )}
      <Field label="待修改事項">
        <TextArea value={a.todo} onChange={(v) => set({ todo: v })} rows={2} />
      </Field>
      <Field label="備註">
        <TextArea value={a.notes} onChange={(v) => set({ notes: v })} rows={2} />
      </Field>
    </Modal>
  );
}

function VersionModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { today, upsert } = useStore();
  const [v, setV] = useState<AssetVersion>({ version: `v${asset.versions.length + 1}`, date: today, link: asset.versions.at(-1)?.link ?? '', note: '' });
  return (
    <Modal
      title={`新增版本：${asset.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={!v.version.trim()} onClick={() => (upsert('assets', { ...asset, versions: [...asset.versions, v], updatedAt: v.date }), onClose())}>
            加入版本
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="版本">
          <TextInput value={v.version} onChange={(x) => setV({ ...v, version: x })} />
        </Field>
        <Field label="更新日期">
          <input className="input" type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
        </Field>
      </div>
      <Field label="外部連結">
        <TextInput type="url" value={v.link} onChange={(x) => setV({ ...v, link: x })} placeholder="https://" />
      </Field>
      <Field label="這版改了什麼">
        <TextArea value={v.note} onChange={(x) => setV({ ...v, note: x })} rows={2} />
      </Field>
    </Modal>
  );
}

function AssetCard({ a, onEdit, onVersion }: { a: Asset; onEdit: () => void; onVersion: () => void }) {
  const { data } = useStore();
  const latest = a.versions.at(-1);
  const uses = data.requirements.filter((r) => r.assetId === a.id);
  return (
    <article className="card asset-card">
      <div className="badges">
        <Badge tone={a.status === 'ready' ? 'ok' : a.status === 'notStarted' ? 'warn' : 'plain'}>{ASSET_STATUS[a.status]}</Badge>
        <Badge>{ASSET_KIND[a.kind]}</Badge>
      </div>
      <h4>{a.title}</h4>
      <p className="small">
        {latest ? (
          <>
            目前 <strong>{latest.version}</strong>・{fmt(latest.date)}
            {latest.link && (
              <>
                ・<ExtLink href={latest.link}>開啟</ExtLink>
              </>
            )}
          </>
        ) : (
          <span className="muted">尚無版本或連結</span>
        )}
      </p>
      <p className="small">
        <strong>適用學程：</strong>
        {uses.length === 0
          ? <span className="muted">尚未對應</span>
          : [...new Set(uses.map((r) => data.programs.find((p) => p.id === r.programId)))].filter(Boolean).map((p) => (
              <a key={p!.id} href={programHref(p!.id)} style={{ marginRight: 8 }}>
                {p!.school}
              </a>
            ))}
      </p>
      {a.todo && (
        <p className="small criteria">
          <strong>待修改：</strong>
          {a.todo}
        </p>
      )}
      {a.versions.length > 1 && (
        <details>
          <summary className="small">
            <History size={12} /> 版本紀錄（{a.versions.length}）
          </summary>
          <ul className="versions">
            {[...a.versions].reverse().map((v, i) => (
              <li key={i}>
                {v.version}・{fmt(v.date)} {v.link && <ExtLink href={v.link}>連結</ExtLink>} {v.note && <span className="muted">— {v.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="row-actions">
        <button className="btn sm" onClick={onVersion}>
          <FilePlus2 size={15} />
          新版本
        </button>
        <button className="btn ghost sm" onClick={onEdit}>
          <Pencil size={15} />
          編輯
        </button>
      </div>
    </article>
  );
}

function RecommenderModal({ rec, onClose }: { rec: Recommender; onClose: () => void }) {
  const { data, upsert, remove } = useStore();
  const [r, setR] = useState(rec);
  const exists = data.recommenders.some((x) => x.id === r.id);
  const set = (x: Partial<Recommender>) => setR((c) => ({ ...c, ...x }));
  return (
    <Modal
      title={exists ? '編輯推薦人' : '新增推薦人'}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <button className="btn danger ghost" onClick={() => void askConfirm(`刪除推薦人「${r.name}」？`).then((ok) => ok && (remove('recommenders', r.id), onClose()))}>
              <Trash2 size={16} />
              刪除
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" disabled={!r.name.trim()} onClick={() => (upsert('recommenders', r), onClose())}>
            儲存
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="姓名">
          <TextInput value={r.name} onChange={(v) => set({ name: v })} required />
        </Field>
        <Field label="關係">
          <TextInput value={r.relation} onChange={(v) => set({ relation: v })} placeholder="例如：系上教授、實習主管" />
        </Field>
        <Field label="聯絡方式">
          <TextInput value={r.contact} onChange={(v) => set({ contact: v })} />
        </Field>
        <Field label="邀請狀態">
          <Select<RecResponse> value={r.response} onChange={(v) => set({ response: v })} options={REC_RESPONSE} />
        </Field>
        <Field label="邀請日期">
          <input className="input" type="date" value={r.invitedAt ?? ''} onChange={(e) => set({ invitedAt: e.target.value || null })} />
        </Field>
        <Field label="答覆日期">
          <input className="input" type="date" value={r.repliedAt ?? ''} onChange={(e) => set({ repliedAt: e.target.value || null })} />
        </Field>
      </div>
      <Field label="負責哪些學程（勾選後在表格中追蹤提交狀態）">
        <div className="multipick">
          {data.programs.map((p) => {
            const on = r.submissions[p.id] !== undefined;
            return (
              <button
                type="button"
                key={p.id}
                className={`chip ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  const s = { ...r.submissions };
                  if (on) delete s[p.id];
                  else s[p.id] = 'notRequested';
                  set({ submissions: s });
                }}
              >
                {p.school}｜{p.programName}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="備註">
        <TextArea value={r.notes} onChange={(v) => set({ notes: v })} rows={2} />
      </Field>
    </Modal>
  );
}

export default function Docs() {
  const { data, today, upsert } = useStore();
  const [editing, setEditing] = useState<Asset | null>(null);
  const [versioning, setVersioning] = useState<Asset | null>(null);
  const [rec, setRec] = useState<Recommender | null>(null);
  const kinds = Object.keys(ASSET_KIND) as AssetKind[];
  const blank = (kind: AssetKind = 'newsWork'): Asset => ({ id: uid('as'), kind, title: '', status: 'notStarted', versions: [], todo: '', notes: '', updatedAt: today });

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">共用素材庫：一份素材可對應到多個學程的材料清單</p>
          <h1>文件與作品中心</h1>
        </div>
        <button className="btn primary" onClick={() => setEditing(blank())}>
          <Plus size={18} />
          新增素材
        </button>
      </header>

      {data.assets.length === 0 && <Empty icon={FolderOpen} title="素材庫是空的" />}
      {kinds.map((k) => {
        const list = data.assets.filter((a) => a.kind === k);
        if (list.length === 0) return null;
        return (
          <div className="asset-group" key={k}>
            <h3>
              {ASSET_KIND[k]}（{list.length}）
            </h3>
            <div className="card-grid">
              {list.map((a) => (
                <AssetCard key={a.id} a={a} onEdit={() => setEditing(a)} onVersion={() => setVersioning(a)} />
              ))}
            </div>
          </div>
        );
      })}

      <Section
        title="推薦信追蹤"
        icon={Mail}
        action={
          <button className="btn sm" onClick={() => setRec({ id: uid('rec'), name: '', relation: '', contact: '', response: 'notAsked', invitedAt: null, repliedAt: null, submissions: {}, notes: '' })}>
            <UserPlus size={16} />
            新增推薦人
          </button>
        }
      >
        <p className="muted small">這裡只追蹤邀請、答覆與提交狀態。推薦信由推薦人自行撰寫與提交，網站不會代寫或寄信。</p>
        {data.recommenders.length === 0 ? (
          <p className="muted">尚未新增推薦人。</p>
        ) : (
          <div className="table-wrap">
            <table className="table rec-table">
              <thead>
                <tr>
                  <th>推薦人</th>
                  <th>邀請狀態</th>
                  {data.programs.map((p) => (
                    <th key={p.id}>{p.school}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recommenders.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button className="link-btn" onClick={() => setRec(r)}>
                        {r.name}
                      </button>
                      <span className="muted small block">{r.relation}</span>
                    </td>
                    <td>
                      <Select<RecResponse> ariaLabel={`${r.name} 邀請狀態`} value={r.response} onChange={(v) => upsert('recommenders', { ...r, response: v })} options={REC_RESPONSE} />
                      <span className="muted small block">
                        邀請 {fmt(r.invitedAt)}・答覆 {fmt(r.repliedAt)}
                      </span>
                    </td>
                    {data.programs.map((p) => (
                      <td key={p.id}>
                        {r.submissions[p.id] === undefined ? (
                          <span className="muted small">不負責</span>
                        ) : (
                          <Select<RecSubmission>
                            ariaLabel={`${r.name} ${p.school} 提交狀態`}
                            value={r.submissions[p.id]}
                            onChange={(v) => upsert('recommenders', { ...r, submissions: { ...r.submissions, [p.id]: v } })}
                            options={REC_SUBMISSION}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {editing && <AssetModal asset={editing} onClose={() => setEditing(null)} />}
      {versioning && <VersionModal asset={versioning} onClose={() => setVersioning(null)} />}
      {rec && <RecommenderModal rec={rec} onClose={() => setRec(null)} />}
    </div>
  );
}
