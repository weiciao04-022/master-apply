import { COLLECTIONS, type AppData } from '../types';
import { SCHEMA_VERSION } from '../seed';

export function exportJSON(data: AppData): string {
  return JSON.stringify({ app: 'master-apply', exportedAt: new Date().toISOString(), data }, null, 2);
}

/** 驗證匯入的備份檔，回傳資料或錯誤訊息 */
export function parseBackup(text: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '檔案不是有效的 JSON' };
  }
  const obj = raw as { app?: string; data?: AppData };
  const data = obj?.data ?? (raw as AppData);
  if (!data || typeof data !== 'object' || !data.settings) {
    return { ok: false, error: '找不到 settings，這不像是本網站的備份檔' };
  }
  for (const key of COLLECTIONS) {
    if (data[key] === undefined) (data as unknown as Record<string, unknown[]>)[key] = [];
    if (!Array.isArray(data[key])) return { ok: false, error: `${key} 欄位格式錯誤` };
  }
  if ((data.schemaVersion ?? 0) > SCHEMA_VERSION) {
    return { ok: false, error: '備份檔版本比網站新，請先更新網站' };
  }
  return { ok: true, data: { ...data, schemaVersion: SCHEMA_VERSION } };
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join('; ') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  // 加 BOM，讓 Excel 正確讀取中文
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
