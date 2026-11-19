/* Armazenamento local (IndexedDB). Preferências leves ficam em localStorage. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const DB = 'os-gestao', VER = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!g.indexedDB) return rej(new Error('IndexedDB indisponível neste navegador.'));
      const rq = indexedDB.open(DB, VER);
      rq.onupgradeneeded = () => {
        const db = rq.result;
        if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
      };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode), s = t.objectStore(store);
      let out; const r = fn(s);
      if (r) r.onsuccess = () => (out = r.result);
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  };

  /* Snapshot = metadados + cabeçalhos originais + linhas originais (valores de origem preservados). */
  const saveSnapshot = (snap) => tx('snapshots', 'readwrite', (s) => s.put(snap));
  const getSnapshot = (id) => tx('snapshots', 'readonly', (s) => s.get(id));
  const deleteSnapshot = (id) => tx('snapshots', 'readwrite', (s) => s.delete(id));
  const clearSnapshots = () => tx('snapshots', 'readwrite', (s) => s.clear());
  async function listSnapshots() {
    const all = await tx('snapshots', 'readonly', (s) => s.getAll());
    return (all || []).map((x) => x.meta).sort((a, b) => b.refTs - a.refTs || b.importedAt - a.importedAt);
  }
  const setKV = (key, value) => tx('kv', 'readwrite', (s) => s.put({ key, value }));
  const getKV = async (key) => { const r = await tx('kv', 'readonly', (s) => s.get(key)); return r ? r.value : undefined; };

  async function hashBuffer(buf) {
    try {
      if (g.crypto && crypto.subtle) {
        const d = await crypto.subtle.digest('SHA-256', buf);
        return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* cai no hash simples */ }
    let h = 2166136261; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); }
    return 'fnv-' + (h >>> 0).toString(16) + '-' + u.length;
  }

  const pref = {
    get: (k, d) => { try { const v = localStorage.getItem('os.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem('os.' + k, JSON.stringify(v)); } catch (e) { /* ignora */ } },
  };

  OS.store = { saveSnapshot, getSnapshot, deleteSnapshot, clearSnapshots, listSnapshots, setKV, getKV, hashBuffer, pref };
  if (typeof module !== 'undefined') module.exports = OS.store;
})(typeof globalThis !== 'undefined' ? globalThis : window);
