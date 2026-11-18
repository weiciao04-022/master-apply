import { COLLECTIONS, type AppData, type CollectionKey } from '../types';

/**
 * IndexedDB 儲存：每種資料各自一個 object store（以 id 為 key），
 * settings 與 schemaVersion 放在 meta store。
 * 資料只存在目前這個瀏覽器，清除網站資料就會消失，請定期匯出備份。
 */
const DB_NAME = 'master-apply';
const DB_VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const key of COLLECTIONS) {
        if (!db.objectStoreNames.contains(key)) db.createObjectStore(key, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
const getDB = () => (dbPromise ??= open());

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result as T[]);
    r.onerror = () => reject(r.error);
  });
}

function get<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}

export async function loadAll(): Promise<AppData | null> {
  const db = await getDB();
  const tx = db.transaction([...COLLECTIONS, 'meta'], 'readonly');
  const settings = await get<AppData['settings']>(tx.objectStore('meta'), 'settings');
  if (!settings) return null;
  const schemaVersion = (await get<number>(tx.objectStore('meta'), 'schemaVersion')) ?? 1;
  const out: Partial<AppData> = { settings, schemaVersion };
  for (const key of COLLECTIONS) {
    (out as Record<string, unknown>)[key] = await getAll(tx.objectStore(key));
  }
  return out as AppData;
}

/** 只覆寫有變動的資料表 */
export async function saveCollections(
  data: AppData,
  keys: (CollectionKey | 'settings')[],
): Promise<void> {
  if (keys.length === 0) return;
  const db = await getDB();
  const colKeys = keys.filter((k): k is CollectionKey => k !== 'settings');
  const tx = db.transaction([...colKeys, 'meta'], 'readwrite');
  const meta = tx.objectStore('meta');
  meta.put(data.settings, 'settings');
  meta.put(data.schemaVersion, 'schemaVersion');
  for (const key of colKeys) {
    const store = tx.objectStore(key);
    store.clear();
    for (const item of data[key] as { id: string }[]) store.put(item);
  }
  await done(tx);
}

export async function saveAll(data: AppData): Promise<void> {
  await saveCollections(data, [...COLLECTIONS, 'settings']);
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([...COLLECTIONS, 'meta'], 'readwrite');
  for (const key of [...COLLECTIONS, 'meta']) tx.objectStore(key).clear();
  await done(tx);
}

/** 要求瀏覽器盡量不要自動清除資料（不保證成功） */
export async function requestPersist(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* 忽略 */
  }
  return null;
}
