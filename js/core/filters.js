/* Filtros globais: definições e aplicação (funções puras). */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const NO_TEAM = 'Sem equipe';

  const DEFS = [
    { id: 'status', label: 'Status', get: (r) => r.status, main: true },
    { id: 'equipe', label: 'Equipe', get: (r) => r.equipe || NO_TEAM, main: true },
    { id: 'tss', label: 'Serviço', get: (r) => r.tss, main: true },
    { id: 'municipio', label: 'Município', get: (r) => r.municipio, main: true },
    { id: 'atc', label: 'ATC', get: (r) => r.atc, main: true },
    { id: 'ato', label: 'ATO', get: (r) => r.ato, main: true },
    { id: 'prazo', label: 'Prazo', get: (r) => r.bucket, main: true },
    { id: 'familia', label: 'Família', get: (r) => r.familia },
    { id: 'bairro', label: 'Bairro', get: (r) => r.bairro },
    { id: 'setor', label: 'Setor', get: (r) => r.setor },
    { id: 'prioridade', label: 'Prioridade', get: (r) => r.prioridade },
  ];
  const DEF = Object.fromEntries(DEFS.map((d) => [d.id, d]));

  /* filters: { id: Set|Array de valores }. `skip` ignora um filtro (para contagens cruzadas). */
  function apply(recs, filters, skip) {
    const act = Object.keys(filters || {}).filter((id) => id !== skip && DEF[id] && filters[id] && (filters[id].size || filters[id].length));
    if (!act.length) return recs;
    const sets = act.map((id) => [DEF[id].get, filters[id] instanceof Set ? filters[id] : new Set(filters[id])]);
    return recs.filter((r) => sets.every(([get, s]) => s.has(get(r))));
  }

  function options(recs, filters, id) {
    const base = apply(recs, filters, id);
    const m = new Map();
    for (const r of base) { const v = DEF[id].get(r); m.set(v, (m.get(v) || 0) + 1); }
    for (const v of filters[id] || []) if (!m.has(v)) m.set(v, 0);
    const arr = [...m.entries()].map(([value, n]) => ({ value, n }));
    if (id === 'prazo') { const o = OS.metrics.BUCKETS; return arr.sort((a, b) => o.indexOf(a.value) - o.indexOf(b.value)); }
    if (id === 'status') { const o = OS.metrics.STATUS_ORDER; return arr.sort((a, b) => (o.indexOf(a.value) + 99) % 99 - (o.indexOf(b.value) + 99) % 99); }
    return arr.sort((a, b) => b.n - a.n || String(a.value).localeCompare(String(b.value), 'pt-BR'));
  }

  const activeCount = (filters) => Object.keys(filters).filter((k) => filters[k] && (filters[k].size || filters[k].length)).length;

  OS.filters = { DEFS, DEF, apply, options, activeCount, NO_TEAM };
  if (typeof module !== 'undefined') module.exports = OS.filters;
})(typeof globalThis !== 'undefined' ? globalThis : window);
