(function (g) {
  const OS = (g.OS = g.OS || {});
  const nf = new Intl.NumberFormat('pt-BR');
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  OS.fmt = {
    int: (n) => nf.format(n),
    pct: (n, d = 1) => n.toFixed(d).replace('.', ',') + '%',
    date: (ts) => { if (ts == null) return '—'; const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; },
    dateTime: (ts) => { if (ts == null) return '—'; const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; },
    isoDay: (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; },
    esc,
    /* Rótulos de exibição (os valores originais seguem intactos nos filtros). */
    place: (s) => OS.norm.titleCase(String(s)),
    label: (s) => { const t = String(s); return t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t) ? OS.norm.sentence(t) : t; },
  };
  if (typeof module !== 'undefined') module.exports = OS.fmt;
})(typeof globalThis !== 'undefined' ? globalThis : window);
