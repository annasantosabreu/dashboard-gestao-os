/* Componentes de interface reutilizáveis (sem regras de negócio). */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const { esc } = OS.fmt;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const P = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .6 3.1 2.3 3.5 5.2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    down: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    save: '<path d="M5 3h11l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
  };
  const ic = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const info = (tip) => `<span class="info" tabindex="0" role="img" data-tip="${esc(tip)}" aria-label="${esc(tip)}">i</span>`;

  function toast(msg, type) {
    let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg; box.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity 200ms'; t.style.opacity = '0'; setTimeout(() => t.remove(), 220); }, type === 'err' ? 6000 : 3200);
  }

  function modal(o) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${o.size || ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="modal-h"><div style="flex:1;min-width:0"><h2>${esc(o.title)}</h2>${o.sub ? `<div class="sub">${o.sub}</div>` : ''}</div><button class="btn btn-ghost btn-icon" data-close aria-label="Fechar">${ic('x')}</button></div><div class="modal-b"></div>${o.footer === false ? '' : '<div class="modal-f"></div>'}</div>`;
    const prev = document.activeElement;
    const close = () => { ov.remove(); document.removeEventListener('keydown', key); if (o.onClose) o.onClose(); if (prev && prev.focus) prev.focus(); };
    const key = (e) => { if (e.key === 'Escape' && ov === [...document.querySelectorAll('.overlay')].pop()) close(); };
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(); });
    ov.querySelector('[data-close]').onclick = close;
    document.addEventListener('keydown', key);
    document.body.appendChild(ov);
    const body = ov.querySelector('.modal-b'), foot = ov.querySelector('.modal-f');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    return { el: ov, body, foot, close, setBody: (h) => { body.innerHTML = h; }, setTitle: (t) => (ov.querySelector('h2').textContent = t) };
  }

  function drawer(o) {
    const w = document.createElement('div'); w.className = 'drawer-wrap';
    w.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="modal-h"><div style="flex:1;min-width:0"><h2>${esc(o.title)}</h2>${o.sub ? `<div class="sub">${o.sub}</div>` : ''}</div><div class="actions" style="display:flex;gap:6px">${o.actions || ''}</div><button class="btn btn-ghost btn-icon" data-close aria-label="Fechar">${ic('x')}</button></div><div class="modal-b"></div></aside>`;
    const close = () => { w.remove(); document.removeEventListener('keydown', key); if (o.onClose) o.onClose(); };
    const key = (e) => { if (e.key === 'Escape' && !document.querySelector('.overlay')) close(); };
    w.addEventListener('mousedown', (e) => { if (e.target === w) close(); });
    w.querySelector('[data-close]').onclick = close; document.addEventListener('keydown', key);
    document.body.appendChild(w);
    return { el: w, body: w.querySelector('.modal-b'), close };
  }

  const empty = (icon, title, text, action) => `<div class="empty"><div class="ic">${ic(icon, 22)}</div><h3>${esc(title)}</h3><p>${text}</p>${action || ''}</div>`;
  const skeletonPage = () => `<div class="skel-page" aria-busy="true" aria-label="Carregando"><div class="grid g-kpi">${'<div class="skeleton" style="height:92px"></div>'.repeat(8)}</div><div class="grid g-2"><div class="skeleton" style="height:320px"></div><div class="skeleton" style="height:320px"></div></div></div>`;

  const statusBadge = (s) => `<span class="badge ${{ 'Planejável': 'b-plan', 'Reprogramável': 'b-reprog', 'Despachada': 'b-desp' }[s] || ''}">${esc(s)}</span>`;

  /* ---- Tabela com busca, ordenação, paginação e exportação ---- */
  function dataTable(o) {
    const st = { q: '', sort: o.sort || null, page: 0, size: o.pageSize || 50 };
    const root = document.createElement('div');
    const sel = o.select; // { set:Set, max, onChange }
    function view() {
      let rows = o.rows;
      if (st.q && o.search) { const q = OS.norm.strip(st.q).toLowerCase(); rows = rows.filter((r) => o.search(r, q)); }
      if (st.sort) {
        const c = o.cols.find((x) => x.key === st.sort.key), f = c && (c.sortVal || c.val);
        if (f) rows = [...rows].sort((a, b) => { const x = f(a), y = f(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'pt-BR'); return st.sort.dir === 'asc' ? r : -r; });
      }
      return rows;
    }
    function draw() {
      const rows = view(), pages = Math.max(1, Math.ceil(rows.length / st.size)); st.page = Math.min(st.page, pages - 1);
      const slice = rows.slice(st.page * st.size, (st.page + 1) * st.size);
      const head = o.cols.map((c) => `<th class="${c.align === 'r' ? 'r ' : ''}${c.sortable === false ? '' : 'sortable'}" data-k="${c.key}" ${st.sort && st.sort.key === c.key ? `aria-sort="${st.sort.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>${esc(c.label)}${c.tip ? ' ' + info(c.tip) : ''}${c.sortable === false ? '' : `<span class="arr">${st.sort && st.sort.key === c.key ? (st.sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>`}</th>`).join('');
      const body = slice.map((r) => `<tr class="${o.onRow ? 'click' : ''}" data-key="${esc(o.rowKey ? o.rowKey(r) : '')}">${o.cols.map((c) => `<td class="${c.align === 'r' ? 'r' : ''}">${c.html ? c.html(r) : esc(c.val(r))}</td>`).join('')}</tr>`).join('');
      const n = rows.length, a = n ? st.page * st.size + 1 : 0, b = Math.min(n, (st.page + 1) * st.size);
      root.querySelector('.tbl').innerHTML = `<div class="table-wrap" style="max-height:${o.maxHeight || 460}px"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${o.cols.length}">${empty('inbox', 'Nada encontrado', 'Nenhum registro para os filtros e a busca atuais.')}</td></tr>`}</tbody></table></div>
      <div class="pager"><span>${OS.fmt.int(a)}–${OS.fmt.int(b)} de ${OS.fmt.int(n)}</span><span class="grow"></span><button class="btn btn-sm" data-p="-1" ${st.page === 0 ? 'disabled' : ''}>Anterior</button><span>Página ${st.page + 1} de ${pages}</span><button class="btn btn-sm" data-p="1" ${st.page >= pages - 1 ? 'disabled' : ''}>Próxima</button></div>`;
    }
    root.innerHTML = `<div class="toolbar">${o.search ? `<input class="input" type="search" placeholder="${esc(o.placeholder || 'Pesquisar…')}" aria-label="Pesquisar">` : ''}<span class="muted" data-count></span><span style="flex:1"></span>${o.toolbar || ''}${o.exporter ? `<div class="dd" data-exp><button class="btn btn-sm" data-expbtn>${ic('down', 15)} Exportar</button><div class="menu" style="right:0"><button data-fmt="xlsx">Excel (.xlsx)</button><button data-fmt="csv">CSV (.csv)</button></div></div>` : ''}</div><div class="tbl"></div>`;
    draw();
    const inp = root.querySelector('input'); if (inp) inp.oninput = () => { st.q = inp.value; st.page = 0; draw(); };
    root.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-k]'); if (th && !e.target.closest('.info')) { const k = th.dataset.k, c = o.cols.find((x) => x.key === k); if (c.sortable === false) return; st.sort = st.sort && st.sort.key === k ? { key: k, dir: st.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: c.align === 'r' ? 'desc' : 'asc' }; draw(); return; }
      const pb = e.target.closest('[data-p]'); if (pb) { st.page += +pb.dataset.p; draw(); return; }
      const eb = e.target.closest('[data-expbtn]'); if (eb) { eb.nextElementSibling.classList.toggle('open'); return; }
      const fm = e.target.closest('[data-fmt]'); if (fm) { fm.parentElement.classList.remove('open'); o.exporter(fm.dataset.fmt, view()); return; }
      const cb = e.target.closest('input[data-sel]'); if (cb) { const k = cb.dataset.sel; if (cb.checked) { if (sel.set.size >= sel.max) { cb.checked = false; toast(`Selecione no máximo ${sel.max} itens para comparar.`); return; } sel.set.add(k); } else sel.set.delete(k); sel.onChange(); return; }
      const tr = e.target.closest('tbody tr[data-key]'); if (tr && o.onRow) o.onRow(tr.dataset.key);
    });
    return { el: root, redraw: draw, view };
  }

  OS.ui = Object.assign(OS.ui || {}, { $, $$, ic, info, toast, modal, drawer, empty, skeletonPage, statusBadge, dataTable });
})(window);
