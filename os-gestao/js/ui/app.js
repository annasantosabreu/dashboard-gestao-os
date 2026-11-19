/* Orquestração: estado, navegação, tema, filtros globais e ciclo de renderização. */
(function () {
  const OS = window.OS, U = OS.ui, F = OS.fmt, M = OS.metrics, FL = OS.filters, N = OS.norm, esc = F.esc;
  const PAGES = { overview: ['Visão Geral', 'dash'], teams: ['Desempenho das Equipes', 'users'], history: ['Histórico Diário', 'clock'], settings: ['Configurações', 'gear'] };
  const S = { all: [], meta: null, snaps: [], refTs: 0, prevMeta: null, filters: {}, page: 'overview', more: false, ui: { seg: 'atc', compare: new Set() }, loading: false };
  const $ = U.$;
  const mq = matchMedia('(prefers-color-scheme: dark)');

  /* ---------- Tema ---------- */
  function applyTheme() {
    const p = OS.store.pref.get('theme', 'auto'), dark = p === 'dark' || (p === 'auto' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.density = OS.store.pref.get('density', 'comfortable');
    OS.charts.retheme();
  }
  mq.addEventListener('change', () => OS.store.pref.get('theme', 'auto') === 'auto' && applyTheme());

  /* ---------- Contexto entregue às páginas ---------- */
  const recs = () => FL.apply(S.all, S.filters);
  const filtersText = () => FL.DEFS.filter((d) => S.filters[d.id] && S.filters[d.id].size).map((d) => `${d.label}: ${[...S.filters[d.id]].join(', ')}`).join(' | ');
  function ctx() {
    return {
      all: S.all, recs: recs(), meta: S.meta, snaps: S.snaps, refTs: S.refTs, prevMeta: S.prevMeta, filters: S.filters, ui: S.ui,
      toggleFilter, mergeFilters, openOS: (id) => OS.pages.osLookup(ctx(), id), importFile: () => OS.importer.open(api),
      exportCtx: (n) => ({ refTs: S.refTs, fileName: S.meta && S.meta.fileName, filtersText: filtersText(), total: n }),
      setPref, openSnapshot, deleteSnapshot, clearAll,
    };
  }

  /* ---------- Filtros ---------- */
  function toggleFilter(id, value) {
    const s = S.filters[id] || (S.filters[id] = new Set());
    s.has(value) ? s.delete(value) : s.add(value); if (!s.size) delete S.filters[id];
    onFiltersChanged(true);
  }
  function mergeFilters(obj) { Object.keys(obj).forEach((id) => (S.filters[id] = new Set(obj[id]))); onFiltersChanged(true); U.toast('Filtro aplicado.'); }
  function clearFilters() { S.filters = {}; onFiltersChanged(true); }
  const showLabel = (id, v) => (['atc', 'ato', 'municipio', 'bairro'].includes(id) ? N.titleCase(v) : F.label(v));

  function ddHtml(d) { return `<div class="dd" data-f="${d.id}"><button class="btn dd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="lbl">${d.label}</span><span class="cnt"></span>${U.ic('chev', 14)}</button><div class="dd-panel"><input class="input" placeholder="Buscar em ${d.label.toLowerCase()}…" aria-label="Buscar"><div class="dd-list" role="listbox" aria-multiselectable="true"></div><div class="dd-foot"><button class="btn btn-sm btn-ghost" data-clr>Limpar</button><button class="btn btn-sm" data-done>Fechar</button></div></div></div>`; }

  function renderFilterbar() {
    const bar = $('#filterbar'); if (!bar) return;
    const hide = S.page === 'settings' || S.page === 'history' || !S.all.length;
    bar.hidden = hide; if (hide) return;
    bar.innerHTML = `<div class="filter-row"><span class="filter-label">${U.ic('filter', 14)} Filtros</span>${FL.DEFS.filter((d) => d.main).map(ddHtml).join('')}<button class="btn dd-btn" data-more aria-expanded="${S.more}">Mais filtros ${U.ic('chev', 14)}</button><span class="filter-info" id="finfo"></span></div>
      <div class="filter-row" id="more" ${S.more ? '' : 'hidden'}>${FL.DEFS.filter((d) => !d.main).map(ddHtml).join('')}</div>
      <div class="filter-row" id="chiprow"><div class="chips" id="chips"></div><span style="flex:1"></span><button class="btn btn-sm btn-ghost" data-act="clear">Limpar filtros</button><button class="btn btn-sm btn-ghost" data-act="save">${U.ic('save', 14)} Salvar seleção</button><button class="btn btn-sm btn-ghost" data-act="restore">Restaurar padrão</button></div>`;
    bar.querySelectorAll('.dd').forEach(wireDd);
    bar.querySelector('[data-more]').onclick = (e) => { S.more = !S.more; bar.querySelector('#more').hidden = !S.more; e.currentTarget.setAttribute('aria-expanded', S.more); };
    bar.querySelector('[data-act="clear"]').onclick = clearFilters;
    bar.querySelector('[data-act="save"]').onclick = () => { OS.store.pref.set('filters.saved', Object.fromEntries(Object.entries(S.filters).map(([k, v]) => [k, [...v]]))); U.toast('Seleção de filtros salva como padrão.', 'ok'); };
    bar.querySelector('[data-act="restore"]').onclick = () => { const s = OS.store.pref.get('filters.saved', null); S.filters = s ? Object.fromEntries(Object.entries(s).map(([k, v]) => [k, new Set(v)])) : {}; onFiltersChanged(true); U.toast(s ? 'Filtros padrão restaurados.' : 'Não há seleção salva. Filtros limpos.'); };
    updateFilterUi();
  }

  function wireDd(dd) {
    const id = dd.dataset.f, btn = dd.querySelector('.dd-btn'), list = dd.querySelector('.dd-list'), q = dd.querySelector('input');
    let opts = [];
    const draw = () => {
      const t = N.strip(q.value).toLowerCase(), cur = S.filters[id] || new Set();
      const shown = opts.filter((o) => !t || N.strip(showLabel(id, o.value)).toLowerCase().includes(t));
      list.innerHTML = shown.length ? shown.map((o, i) => `<label class="dd-opt" role="option"><input type="checkbox" data-v="${esc(o.value)}" ${cur.has(o.value) ? 'checked' : ''}><span title="${esc(showLabel(id, o.value))}">${esc(showLabel(id, o.value))}</span><span class="n num">${F.int(o.n)}</span></label>`).join('') : '<div class="muted" style="padding:8px">Nada encontrado.</div>';
    };
    btn.onclick = (e) => {
      e.stopPropagation(); const was = dd.classList.contains('open'); closeMenus();
      if (!was) { opts = FL.options(S.all, S.filters, id); q.value = ''; draw(); dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); q.focus(); }
    };
    q.oninput = draw;
    list.onchange = (e) => { const cb = e.target; if (cb.dataset.v == null) return; const s = S.filters[id] || (S.filters[id] = new Set()); cb.checked ? s.add(cb.dataset.v) : s.delete(cb.dataset.v); if (!s.size) delete S.filters[id]; onFiltersChanged(false); };
    dd.querySelector('[data-clr]').onclick = () => { delete S.filters[id]; draw(); onFiltersChanged(false); };
    dd.querySelector('[data-done]').onclick = closeMenus;
    dd.querySelector('.dd-panel').onclick = (e) => e.stopPropagation();
  }
  function closeMenus() { document.querySelectorAll('.dd.open').forEach((d) => { d.classList.remove('open'); d.querySelector('.dd-btn').setAttribute('aria-expanded', 'false'); }); document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open')); }
  document.addEventListener('click', (e) => { if (!e.target.closest('.dd-panel') && !e.target.closest('[data-expbtn]')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  function updateFilterUi() {
    const bar = $('#filterbar'); if (!bar || bar.hidden) return;
    bar.querySelectorAll('.dd').forEach((dd) => { const n = (S.filters[dd.dataset.f] || { size: 0 }).size; dd.querySelector('.cnt').textContent = n ? ' · ' + n : ''; dd.querySelector('.dd-btn').classList.toggle('on', n > 0); });
    const chips = [];
    FL.DEFS.forEach((d) => (S.filters[d.id] ? [...S.filters[d.id]].forEach((v) => chips.push(`<span class="chip">${d.label}: ${esc(showLabel(d.id, v))}<button aria-label="Remover filtro ${esc(d.label)}: ${esc(v)}" data-rm="${d.id}" data-v="${esc(v)}">${U.ic('x', 12)}</button></span>`)) : 0));
    const cr = bar.querySelector('#chips'); cr.innerHTML = chips.join('') || '<span class="muted" style="font-size:12.5px">Nenhum filtro ativo.</span>';
    cr.onclick = (e) => { const b = e.target.closest('[data-rm]'); if (b) toggleFilter(b.dataset.rm, b.dataset.v); };
    const n = recs().length; bar.querySelector('#finfo').innerHTML = `<b class="num">${F.int(n)}</b> de ${F.int(S.all.length)} OS`;
    bar.querySelector('[data-act="clear"]').disabled = !chips.length;
  }
  function onFiltersChanged(refreshDd) {
    if (refreshDd) renderFilterbar(); else updateFilterUi();
    renderPage();
  }

  /* ---------- Shell, header e navegação ---------- */
  function renderShell() {
    const collapsed = OS.store.pref.get('collapsed', false);
    const app = $('#app'); app.classList.toggle('collapsed', collapsed);
    app.innerHTML = `<aside class="sidebar" aria-label="Navegação"><div class="brand"><div class="brand-mark">OS</div><div class="brand-text"><div class="brand-name">Gestão de OS</div><div class="brand-sub">Operações de saneamento</div></div></div>
      ${Object.entries(PAGES).filter(([k]) => k !== 'settings').map(([k, [l, i]]) => `<button class="nav-item" data-nav="${k}" title="${l}">${U.ic(i)}<span class="nav-label">${l}</span></button>`).join('')}
      <div class="nav-spacer"></div>
      <div class="sidebar-note">Os dados ficam somente neste navegador e não são enviados a servidores.</div>
      <button class="nav-item" data-nav="settings" title="Configurações">${U.ic('gear')}<span class="nav-label">Configurações</span></button>
      <button class="nav-item" id="collapse" title="Recolher menu" aria-label="Recolher ou expandir menu">${U.ic('panel')}<span class="nav-label">Recolher menu</span></button></aside>
      <div class="main"><header class="header"><h1 id="title"></h1><div class="header-meta" id="meta"></div><div class="header-actions" id="actions"></div></header><div class="content"><section class="filterbar" id="filterbar" aria-label="Filtros globais" hidden></section><div id="page"></div></div></div>`;
    app.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => go(b.dataset.nav)));
    $('#collapse').onclick = () => { const c = app.classList.toggle('collapsed'); OS.store.pref.set('collapsed', c); setTimeout(() => window.dispatchEvent(new Event('resize')), 260); };
  }

  function renderHeader() {
    $('#title').textContent = PAGES[S.page][0];
    document.querySelectorAll('[data-nav]').forEach((b) => (b.dataset.nav === S.page ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    const m = S.meta;
    $('#meta').innerHTML = m ? `<span>Referência da carteira: <b>${F.dateTime(S.refTs)}</b></span><span>Última importação: <b>${F.dateTime(m.importedAt)}</b></span><span>Registros analisados: <b class="num">${F.int(S.all.length)}</b></span>` : '<span>Nenhum relatório importado.</span>';
    const theme = OS.store.pref.get('theme', 'auto'), dark = document.documentElement.dataset.theme === 'dark';
    $('#actions').innerHTML = `<button class="btn" data-a="os">${U.ic('search', 16)} Consultar OS</button><button class="btn btn-primary" data-a="import">${U.ic('upload', 16)} Importar planilha</button><span data-tip="A exportação em PDF chega na Fase 5"><button class="btn" disabled>${U.ic('pdf', 16)} Exportar PDF</button></span>
      <div class="dd" style="position:relative"><button class="btn btn-icon" data-a="theme" aria-label="Alterar tema" aria-haspopup="menu">${U.ic(dark ? 'moon' : 'sun', 17)}</button><div class="menu" role="menu">${[['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']].map(([v, l]) => `<button role="menuitemradio" aria-checked="${theme === v}" data-theme="${v}">${l}${theme === v ? ' ✓' : ''}</button>`).join('')}</div></div>`;
    const a = $('#actions');
    a.querySelector('[data-a="os"]').onclick = () => (S.all.length ? OS.pages.osLookup(ctx()) : U.toast('Importe uma planilha para consultar OS.'));
    a.querySelector('[data-a="import"]').onclick = () => OS.importer.open(api);
    a.querySelector('[data-a="theme"]').onclick = (e) => { e.stopPropagation(); const mn = e.currentTarget.nextElementSibling, o = mn.classList.contains('open'); closeMenus(); if (!o) mn.classList.add('open'); };
    a.querySelectorAll('[data-theme]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); setPref('theme', b.dataset.theme); }));
  }

  function go(p) { S.page = p; render(); window.scrollTo(0, 0); }

  function setPref(k, v) {
    if (k === 'charts.labels') v = v === 'true' || v === true;
    OS.store.pref.set(k, v);
    if (k === 'theme' || k === 'density') applyTheme();
    renderHeader(); renderPage();
  }

  /* ---------- Página ---------- */
  function renderPage() {
    const root = $('#page'); if (!root) return;
    OS.charts.clear();
    if (S.loading) { root.innerHTML = U.skeletonPage(); return; }
    if (!S.all.length && S.page !== 'settings') {
      root.innerHTML = `<div class="card">${U.empty('inbox', 'Nenhum relatório importado', 'Importe o relatório de pendências (XLSX, XLS ou CSV) para ver os indicadores. Os dados ficam apenas neste navegador.', '<button class="btn btn-primary" data-imp>Importar planilha</button>')}</div>`;
      root.querySelector('[data-imp]').onclick = () => OS.importer.open(api); return;
    }
    try { OS.pages[S.page](root, ctx()); }
    catch (e) { console.error(e); root.innerHTML = `<div class="callout err"><b>Erro ao montar a página.</b><br>${esc(e.message)}</div>`; }
  }
  function render() { renderHeader(); renderFilterbar(); renderPage(); }

  /* ---------- Dados ---------- */
  async function openSnapshot(id) {
    S.loading = true; renderPage();
    try {
      const snap = await OS.store.getSnapshot(id); if (!snap) throw new Error('Importação não encontrada.');
      await new Promise((r) => setTimeout(r, 20));
      const rv = OS.validate.validateRecords(OS.norm.normalizeRows(snap.headers, snap.rows));
      S.all = M.annotate(rv.records, snap.meta.refTs); S.meta = snap.meta; S.refTs = snap.meta.refTs;
      S.snaps = await OS.store.listSnapshots();
      S.prevMeta = S.snaps.filter((x) => x.refTs < S.meta.refTs).sort((a, b) => b.refTs - a.refTs)[0] || null;
      S.filters = {}; S.ui.compare = new Set();
      await OS.store.setKV('current', id);
    } catch (e) { console.error(e); U.toast('Não foi possível abrir a importação: ' + e.message, 'err'); }
    S.loading = false; render();
  }
  function confirmDlg(title, text, ok) {
    return new Promise((res) => { let done = false; const m = U.modal({ title, size: 'sm', onClose: () => !done && res(false) }); m.body.innerHTML = `<p>${text}</p>`; m.foot.innerHTML = `<button class="btn" data-n>Cancelar</button><button class="btn btn-primary" data-y>${ok}</button>`; m.foot.querySelector('[data-n]').onclick = () => m.close(); m.foot.querySelector('[data-y]').onclick = () => { done = true; m.close(); res(true); }; });
  }
  async function afterRemoval() {
    S.snaps = await OS.store.listSnapshots();
    if (S.meta && !S.snaps.find((s) => s.id === S.meta.id)) { if (S.snaps[0]) return openSnapshot(S.snaps[0].id); S.all = []; S.meta = null; S.prevMeta = null; S.filters = {}; await OS.store.setKV('current', null); }
    render();
  }
  async function deleteSnapshot(id) {
    if (!(await confirmDlg('Excluir importação', 'Esta importação será removida deste navegador. Essa ação não pode ser desfeita.', 'Excluir'))) return;
    await OS.store.deleteSnapshot(id); U.toast('Importação excluída.', 'ok'); await afterRemoval();
  }
  async function clearAll() {
    if (!(await confirmDlg('Limpar todo o histórico', 'Todas as importações guardadas neste navegador serão removidas. Essa ação não pode ser desfeita.', 'Limpar tudo'))) return;
    await OS.store.clearSnapshots(); U.toast('Histórico removido.', 'ok'); await afterRemoval();
  }

  const api = { openSnapshot };

  async function boot() {
    applyTheme(); renderShell();
    if (typeof echarts === 'undefined' || typeof XLSX === 'undefined') { $('#page').innerHTML = '<div class="callout err">Não foi possível carregar as bibliotecas locais da pasta "vendor". Verifique se a pasta foi copiada junto com o sistema.</div>'; return; }
    S.loading = true; render();
    try {
      S.snaps = await OS.store.listSnapshots();
      const cur = await OS.store.getKV('current'), pick = S.snaps.find((s) => s.id === cur) || S.snaps[0];
      S.loading = false;
      if (pick) await openSnapshot(pick.id); else render();
    } catch (e) { console.error(e); S.loading = false; render(); U.toast('Armazenamento local indisponível: ' + e.message, 'err'); }
  }
  window.OS.app = { S, go };
  boot();
})();
