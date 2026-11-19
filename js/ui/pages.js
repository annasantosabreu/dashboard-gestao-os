/* Páginas: Visão Geral, Equipes, Histórico, Configurações, Consulta de OS. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const M = OS.metrics, F = OS.fmt, N = OS.norm, esc = F.esc, int = F.int;
  const U = () => OS.ui, CH = () => OS.charts;
  const lab = F.label, place = F.place;

  const recordCols = (withTeam = true) => [
    { key: 'id', label: 'Número OS', val: (r) => r.id },
    { key: 'tss', label: 'Serviço', val: (r) => lab(r.tss), html: (r) => esc(lab(r.tss)) },
    { key: 'status', label: 'Status', val: (r) => r.status, html: (r) => U().statusBadge(r.status) },
    ...(withTeam ? [{ key: 'equipe', label: 'Equipe', val: (r) => r.equipe || '—' }] : []),
    { key: 'mun', label: 'Município', val: (r) => place(r.municipio), html: (r) => esc(place(r.municipio)) },
    { key: 'bairro', label: 'Bairro', val: (r) => place(r.bairro), html: (r) => esc(place(r.bairro)) },
    { key: 'prazo', label: 'Prazo', val: (r) => r.prazo || 0, html: (r) => F.date(r.prazo) },
    { key: 'dias', label: 'Dias p/ prazo', align: 'r', val: (r) => (r.dias == null ? 0 : r.dias), html: (r) => (r.dias == null ? '—' : r.dias < 0 ? `<span class="badge b-danger">${int(-r.dias)} de atraso</span>` : r.dias === 0 ? '<span class="badge b-reprog">Hoje</span>' : int(r.dias)) },
  ];
  const searchRec = (r, q) => r.id.includes(q) || N.strip(r.tss + ' ' + r.municipio + ' ' + r.bairro + ' ' + (r.equipe || '')).toLowerCase().includes(q);

  function recordsTable(ctx, recs, name, withTeam) {
    return U().dataTable({ cols: recordCols(withTeam), rows: recs, rowKey: (r) => r.id, onRow: (id) => ctx.openOS(id), search: searchRec, placeholder: 'Buscar por OS, serviço, bairro…', pageSize: 50, exporter: (fmt, rows) => OS.exporter.table(name, rows.map(OS.exporter.recordRow), ctx.exportCtx(rows.length), fmt) });
  }

  function openRecords(ctx, title, rule, recs, name) {
    const m = U().modal({ title: `${title} · ${int(recs.length)} OS`, sub: esc(rule || ''), footer: false });
    m.body.appendChild(recordsTable(ctx, recs, name || 'os', true).el);
  }

  /* ---------- Visão Geral ---------- */
  function overview(root, ctx) {
    const recs = ctx.recs, k = M.kpis(recs), P = (n) => F.pct(M.pct(n, k.total));
    const defs = [
      ['total', 'OS pendentes', k.total, ctx.all.length !== k.total ? `de ${int(ctx.all.length)} no relatório` : 'carteira completa'],
      ['comEquipe', 'Com equipe atribuída', k.comEquipe, P(k.comEquipe) + ' do total'],
      ['semEquipe', 'Sem equipe atribuída', k.semEquipe, P(k.semEquipe) + ' do total', k.pctSemEquipe >= 50 ? 'danger' : k.pctSemEquipe >= 25 ? 'warn' : ''],
      ['planejaveis', 'Planejáveis', k.planejaveis, P(k.planejaveis) + ' do total'],
      ['reprogramaveis', 'Reprogramáveis', k.reprogramaveis, P(k.reprogramaveis) + ' do total'],
      ['despachadas', 'Despachadas', k.despachadas, 'não significa executada'],
      ['vencidas', 'Prazo vencido', k.vencidas, P(k.vencidas) + ' do total', k.vencidas ? 'danger' : ''],
      ['proximas', 'Próximas do vencimento', k.proximas, 'hoje até 3 dias', k.proximas ? 'warn' : ''],
    ];
    const alerts = M.alerts(recs, ctx.prevMeta ? { total: ctx.prevMeta.summary.total } : null);
    root.innerHTML = `
      <div class="grid g-kpi">${defs.map(([id, l, v, s, tone]) => `<div class="kpi click ${tone ? 'tone-' + tone : ''}" role="button" tabindex="0" data-kpi="${id}" aria-label="${l}: ${int(v)}. Ver registros"><div class="kpi-top">${l} ${U().info(M.KPI_RULES[id])}</div><div class="kpi-val num">${int(v)}</div><div class="kpi-sub">${s}</div></div>`).join('')}</div>
      <div class="mini-kpis">
        <div class="mini"><div class="l">OS sem equipe ${U().info('Percentual de OS com Equipe vazia.')}</div><div class="v num">${F.pct(k.pctSemEquipe)}</div></div>
        <div class="mini"><div class="l">OS reprogramáveis ${U().info('Percentual de OS com Status Reprogramável.')}</div><div class="v num">${F.pct(k.pctReprog)}</div></div>
        <div class="mini"><div class="l">Tipos de serviço ${U().info('Quantidade de descrições TSS distintas. O detalhe está no gráfico de tipos de serviço.')}</div><div class="v num">${int(k.tipos)}</div></div>
        <div class="mini"><div class="l">Municípios ${U().info('Quantidade de municípios distintos. O detalhe está no gráfico por município.')}</div><div class="v num">${int(k.municipios)}</div></div>
        <div class="mini click" role="button" tabindex="0" data-kpi="comCausa"><div class="l">Com causa registrada ${U().info(M.KPI_RULES.comCausa)}</div><div class="v num">${int(k.comCausa)}</div></div>
        <div class="mini click" role="button" tabindex="0" data-kpi="urgentes"><div class="l">Ordens urgentes ${U().info(M.KPI_RULES.urgentes)}</div><div class="v num">${int(k.urgentes)}</div></div>
      </div>
      <div><div class="section-title">Pontos de atenção</div></div>
      ${alerts.length ? `<div class="alerts">${alerts.map((a, i) => `<button class="alert lv-${a.level} ${a.kpi || a.filter ? 'click' : ''}" data-alert="${i}"><span class="dot"></span><div><div class="t">${esc(a.title)}</div><div class="d">${esc(a.text)}</div></div></button>`).join('')}</div>` : '<div class="callout ok">Nenhum ponto de atenção com os filtros atuais.</div>'}
      <div class="grid g-2">
        <div class="card"><div class="card-h"><h3>OS por status</h3>${U().info('Categorias reais da coluna Status. Clique em uma barra para filtrar.')}</div><div class="card-b"><div id="c-status"></div></div></div>
        <div class="card"><div class="card-h"><h3>Prazo das OS</h3>${U().info('Faixas mutuamente exclusivas pelo Prazo de Execução em relação à data de referência.')}</div><div class="card-b"><div class="chart" id="c-prazo"></div></div></div>
        <div class="card"><div class="card-h"><h3>Tipos de serviço</h3>${U().info('Volume por Descrição TSS. São ordens pendentes, não serviços realizados.')}</div><div class="card-b"><div id="c-tss"></div></div></div>
        <div class="card"><div class="card-h"><h3>Municípios</h3></div><div class="card-b"><div id="c-mun"></div></div></div>
        <div class="card"><div class="card-h"><h3>Distribuição por <span id="seg-t">ATC</span></h3><div class="right"><div class="seg" role="group" aria-label="Segmentação"><button aria-pressed="${ctx.ui.seg === 'atc'}" data-seg="atc">ATC</button><button aria-pressed="${ctx.ui.seg === 'ato'}" data-seg="ato">ATO</button></div></div></div><div class="card-b"><div id="c-atc"></div></div></div>
        <div class="card"><div class="card-h"><h3>Motivos registrados</h3>${U().info('Coluna Causa Resultado. "Não informado" significa campo vazio, não ausência de problema.')}</div><div class="card-b"><div id="c-causa"></div></div></div>
      </div>`;
    root.querySelectorAll('[data-kpi]').forEach((el) => {
      const go = (e) => { if (e.target.closest('.info')) return; const id = el.dataset.kpi; openRecords(ctx, el.querySelector('.kpi-top, .l').textContent.replace(/\s*i$/, '').trim(), M.KPI_RULES[id], recs.filter(M.KPI_FILTER[id]), 'os_' + id); };
      el.onclick = go; el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e); } };
    });
    root.querySelectorAll('[data-alert]').forEach((b) => (b.onclick = () => {
      const a = alerts[+b.dataset.alert];
      if (a.kpi) openRecords(ctx, a.title, M.KPI_RULES[a.kpi], recs.filter(M.KPI_FILTER[a.kpi]), 'os_' + a.kpi);
      else if (a.filter) ctx.mergeFilters(a.filter);
    }));
    const tog = (id) => (it) => ctx.toggleFilter(id, it.key);
    const st = M.statusDistribution(recs).map((x) => ({ key: x.key, name: x.key, value: x.n, color: CH().STATUS_COLOR[x.key] }));
    CH().hbar(root.querySelector('#c-status'), st, { total: k.total, onClick: tog('status'), labelWidth: 110 });
    CH().columns(root.querySelector('#c-prazo'), M.bucketDistribution(recs).map((x) => ({ key: x.key, name: x.key, value: x.n, color: CH().BUCKET_COLOR[x.key] })), { onClick: tog('prazo') });
    CH().hbar(root.querySelector('#c-tss'), M.countBy(recs, (r) => r.tss).map((x) => ({ key: x.key, name: x.key, label: lab(x.key), value: x.n })), { total: k.total, onClick: tog('tss'), labelWidth: 230 });
    CH().hbar(root.querySelector('#c-mun'), M.countBy(recs, (r) => r.municipio).map((x) => ({ key: x.key, name: x.key, label: place(x.key), value: x.n })), { total: k.total, onClick: tog('municipio') });
    const drawSeg = () => {
      const f = ctx.ui.seg; root.querySelector('#seg-t').textContent = f.toUpperCase();
      CH().hbar(root.querySelector('#c-atc'), M.countBy(recs, (r) => r[f]).map((x) => ({ key: x.key, name: x.key, label: N.titleCase(x.key.replace(/^\d+ - /, '').replace(/^(ATC|ATO) /i, '')) + ' (' + (x.key.match(/^\d+/) || [''])[0] + ')', value: x.n })), { total: k.total, onClick: tog(f), labelWidth: 230 });
    };
    drawSeg();
    root.querySelectorAll('[data-seg]').forEach((b) => (b.onclick = () => { ctx.ui.seg = b.dataset.seg; root.querySelectorAll('[data-seg]').forEach((x) => x.setAttribute('aria-pressed', x === b)); drawSeg(); }));
    CH().hbar(root.querySelector('#c-causa'), M.causeDistribution(recs).map((x) => ({ key: x.key, name: x.key, label: x.key === M.NO_CAUSE ? 'Não informado' : N.sentence(x.key), value: x.n, color: x.key === M.NO_CAUSE ? '#94A3B8' : undefined })), { total: k.total, labelWidth: 200 });
  }

  /* ---------- Equipes ---------- */
  function teams(root, ctx) {
    const recs = ctx.recs, k = M.kpis(recs), T = M.teamTable(recs), rows = T.rows;
    const maxTot = rows[0], maxRep = rows.slice().sort((a, b) => b.reprog - a.reprog)[0];
    const avg = rows.length ? T.assigned / rows.length : 0;
    const kp = [
      ['Equipes identificadas', int(rows.length), 'valores distintos da coluna Equipe', 'Equipes ou responsáveis distintos, após normalizar espaços, maiúsculas e acentos.'],
      ['OS atribuídas', int(T.assigned), F.pct(M.pct(T.assigned, k.total)) + ' das pendentes', 'OS com Equipe preenchida. Atribuição não indica execução.'],
      ['Média por equipe', avg.toFixed(1).replace('.', ','), 'OS atribuídas por equipe', 'OS atribuídas ÷ equipes identificadas.'],
      ['Maior volume', maxTot ? int(maxTot.total) : '—', maxTot ? maxTot.nome : 'sem dados', 'Equipe com mais OS atribuídas.'],
      ['Mais reprogramáveis', maxRep ? int(maxRep.reprog) : '—', maxRep ? maxRep.nome : 'sem dados', 'Equipe com mais OS em status Reprogramável.'],
      ['OS sem equipe', int(k.semEquipe), F.pct(k.pctSemEquipe) + ' das pendentes', 'OS com Equipe vazia.'],
    ];
    root.innerHTML = `
      <div class="callout">Os números abaixo medem a <b>distribuição das OS pendentes</b> por equipe. Não representam produtividade de execução, que depende de relatórios de execução (módulo futuro).</div>
      <div class="grid g-kpi">${kp.map(([l, v, s, tip]) => `<div class="kpi"><div class="kpi-top">${l} ${U().info(tip)}</div><div class="kpi-val num" style="${v.length > 7 ? 'font-size:22px' : ''}">${v}</div><div class="kpi-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(s)}">${esc(s)}</div></div>`).join('')}</div>
      <div class="card"><div class="card-h"><h3>Ranking de equipes</h3><span class="sub">clique na linha para ver detalhes · marque até 5 para comparar</span></div><div class="card-b" id="rank"></div></div>
      <div class="grid g-2">
        <div class="card"><div class="card-h"><h3>Top 10 · OS atribuídas</h3></div><div class="card-b"><div id="t-top"></div></div></div>
        <div class="card"><div class="card-h"><h3>OS vencidas por equipe</h3>${U().info('Top 10 equipes por quantidade de OS com prazo vencido.')}</div><div class="card-b"><div id="t-venc"></div></div></div>
        <div class="card"><div class="card-h"><h3>Status por equipe (top 10)</h3></div><div class="card-b"><div id="t-status"></div></div></div>
        <div class="card"><div class="card-h"><h3>Comparação entre equipes</h3><span class="sub" id="cmp-sub"></span></div><div class="card-b"><div class="chart" id="t-cmp"></div></div></div>
      </div>
      <div class="card"><div class="card-h"><h3>Evolução da carteira por equipe</h3></div><div class="card-b">${U().empty('clock', 'Disponível com o histórico comparativo', `Hoje há ${ctx.snaps.length} relatório(s) importado(s). A evolução por equipe será calculada na Fase 4, comparando os snapshots por Número OS.`)}</div></div>`;
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    const tbl = U().dataTable({
      rows, rowKey: (r) => r.key, onRow: (key) => teamDrawer(ctx, byKey[key]), pageSize: 25, maxHeight: 520, sort: { key: 'total', dir: 'desc' },
      search: (r, q) => N.strip(r.nome).toLowerCase().includes(q), placeholder: 'Pesquisar equipe…',
      select: { set: ctx.ui.compare, max: 5, onChange: () => drawCmp() },
      exporter: (fmt, v) => OS.exporter.table('equipes', v.map((r) => ({ 'Equipe': r.nome, 'Total de OS atribuídas': r.total, 'Planejáveis': r.plan, 'Reprogramáveis': r.reprog, 'Despachadas': r.desp, 'Outros status': r.outros, 'OS vencidas': r.venc, 'Próximas do vencimento': r.prox, '% do total atribuído': +r.pct.toFixed(2) })), ctx.exportCtx(v.length), fmt),
      cols: [
        { key: 'sel', label: '', sortable: false, html: (r) => `<input type="checkbox" data-sel="${esc(r.key)}" aria-label="Comparar ${esc(r.nome)}" ${ctx.ui.compare.has(r.key) ? 'checked' : ''}>` },
        { key: 'nome', label: 'Equipe', val: (r) => r.nome },
        { key: 'total', label: 'Total atribuídas', align: 'r', val: (r) => r.total, html: (r) => `<b>${int(r.total)}</b>` },
        { key: 'plan', label: 'Planejáveis', align: 'r', val: (r) => r.plan, html: (r) => int(r.plan) },
        { key: 'reprog', label: 'Reprogramáveis', align: 'r', val: (r) => r.reprog, html: (r) => int(r.reprog) },
        { key: 'desp', label: 'Despachadas', align: 'r', val: (r) => r.desp, html: (r) => int(r.desp) },
        { key: 'outros', label: 'Outros status', align: 'r', val: (r) => r.outros, html: (r) => int(r.outros), tip: 'Planejada, Suspensa e OS Admitida.' },
        { key: 'venc', label: 'Vencidas', align: 'r', val: (r) => r.venc, html: (r) => (r.venc ? `<span class="badge b-danger">${int(r.venc)}</span>` : '0') },
        { key: 'prox', label: 'Próx. venc.', align: 'r', val: (r) => r.prox, html: (r) => int(r.prox), tip: 'Vencem hoje ou nos próximos 3 dias.' },
        { key: 'pct', label: '% do atribuído', align: 'r', val: (r) => r.pct, html: (r) => `<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="bar" style="width:60px"><i style="width:${Math.min(100, r.pct * 6)}%"></i></div>${F.pct(r.pct)}</div>` },
      ],
    });
    root.querySelector('#rank').appendChild(tbl.el);
    const top = rows.slice(0, 10);
    CH().hbar(root.querySelector('#t-top'), top.map((r) => ({ name: r.nome, value: r.total })), { total: T.assigned, labelWidth: 170 });
    const tv = rows.filter((r) => r.venc).sort((a, b) => b.venc - a.venc).slice(0, 10);
    if (tv.length) CH().hbar(root.querySelector('#t-venc'), tv.map((r) => ({ name: r.nome, value: r.venc, color: '#DC2626' })), { total: k.vencidas, labelWidth: 170 }); else root.querySelector('#t-venc').innerHTML = U().empty('inbox', 'Sem OS vencidas', 'Nenhuma equipe tem OS vencidas com os filtros atuais.');
    if (top.length) CH().stacked(root.querySelector('#t-status'), top.map((r) => r.nome), [['Planejável', 'plan'], ['Reprogramável', 'reprog'], ['Despachada', 'desp'], ['Outros', 'outros']].map(([n, f]) => ({ name: n, color: CH().STATUS_COLOR[n] || '#94A3B8', data: top.map((r) => r[f]) })));
    let cmpChart = null;
    function drawCmp() {
      const sel = [...ctx.ui.compare].map((x) => byKey[x]).filter(Boolean), el = root.querySelector('#t-cmp');
      root.querySelector('#cmp-sub').textContent = sel.length ? `${sel.length} selecionada(s)` : '';
      if (!sel.length) { if (cmpChart) { cmpChart.dispose(); cmpChart = null; } el.innerHTML = U().empty('users', 'Selecione equipes para comparar', 'Marque até 5 equipes na tabela de ranking.'); return; }
      el.innerHTML = '';
      cmpChart = CH().grouped(el, ['Total', 'Reprogramáveis', 'Despachadas', 'Vencidas', 'Próx. venc.'], sel.map((r) => ({ name: r.nome, data: [r.total, r.reprog, r.desp, r.venc, r.prox] })));
    }
    drawCmp();
  }

  function teamDrawer(ctx, t) {
    const mine = ctx.recs.filter((r) => r.equipeKey === t.key);
    const d = U().drawer({ title: t.nome, sub: `${int(t.total)} OS atribuídas · ${F.pct(t.pct)} do total atribuído`, actions: '<button class="btn btn-sm" disabled data-tip="Exportação em PDF chega na Fase 5">Exportar PDF</button>' });
    d.body.innerHTML = `
      <div class="stat-row"><div class="stat"><div class="l">Total</div><div class="v num">${int(t.total)}</div></div><div class="stat"><div class="l">Reprogramáveis</div><div class="v num">${int(t.reprog)}</div></div><div class="stat"><div class="l">Despachadas</div><div class="v num">${int(t.desp)}</div></div><div class="stat"><div class="l">Vencidas</div><div class="v num" style="color:var(--danger)">${int(t.venc)}</div></div></div>
      <div class="grid g-2"><div class="card"><div class="card-h"><h3>Status</h3></div><div class="card-b"><div id="d-st"></div></div></div><div class="card"><div class="card-h"><h3>Prazos</h3></div><div class="card-b"><div class="chart short" id="d-pz"></div></div></div></div>
      <div class="card"><div class="card-h"><h3>Serviços</h3></div><div class="card-b"><div id="d-sv"></div></div></div>
      <div class="card"><div class="card-h"><h3>Áreas de atuação</h3><span class="sub">ATC e bairros presentes nas OS</span></div><div class="card-b"><div class="grid g-2"><div id="d-atc"></div><div id="d-bai"></div></div></div></div>
      <div class="card"><div class="card-h"><h3>Histórico por data de referência</h3></div><div class="card-b"><div class="muted">${ctx.snaps.length > 1 ? 'A série por equipe será exibida na Fase 4.' : 'Importe relatórios de outros dias para acompanhar esta equipe ao longo do tempo.'}</div></div></div>
      <div class="card"><div class="card-h"><h3>OS relacionadas</h3></div><div class="card-b" id="d-tb"></div></div>`;
    const q = (s) => d.body.querySelector(s);
    CH().hbar(q('#d-st'), M.statusDistribution(mine).map((x) => ({ name: x.key, value: x.n, color: CH().STATUS_COLOR[x.key] })), { total: mine.length, labelWidth: 100 });
    CH().columns(q('#d-pz'), M.bucketDistribution(mine).map((x) => ({ name: x.key, value: x.n, color: CH().BUCKET_COLOR[x.key] })));
    CH().hbar(q('#d-sv'), M.countBy(mine, (r) => r.tss).map((x) => ({ name: x.key, label: lab(x.key), value: x.n })), { total: mine.length, labelWidth: 260 });
    CH().hbar(q('#d-atc'), M.countBy(mine, (r) => r.atcNome).slice(0, 6).map((x) => ({ name: x.key, label: N.titleCase(x.key), value: x.n })), { total: mine.length, labelWidth: 120 });
    CH().hbar(q('#d-bai'), M.countBy(mine, (r) => r.bairro).slice(0, 6).map((x) => ({ name: x.key, label: place(x.key), value: x.n })), { total: mine.length, labelWidth: 120 });
    q('#d-tb').appendChild(recordsTable(ctx, mine, 'equipe_' + t.key.toLowerCase().replace(/[^a-z0-9]+/g, '-'), false).el);
  }

  /* ---------- Histórico ---------- */
  function history(root, ctx) {
    const snaps = ctx.snaps.slice().sort((a, b) => a.refTs - b.refTs);
    const sub = (s) => s.summary || {};
    root.innerHTML = `
      <div class="callout">Cada importação guarda uma fotografia da carteira. Os totais abaixo vêm de cada relatório, sem somar snapshots. Dias sem relatório não são estimados.</div>
      <div class="card"><div class="card-h"><h3>Evolução diária do total de pendências</h3>${U().info('Um ponto por relatório importado, na data de referência de cada um. Se houver mais de um relatório na mesma data, o mais recentemente importado representa o dia.')}</div><div class="card-b">${snaps.length > 1 ? '<div class="chart" id="h-line"></div>' : U().empty('clock', 'Importe mais um relatório para ver a evolução', 'Com pelo menos dois relatórios em datas diferentes, o gráfico mostra o total de pendências, as OS vencidas e as OS sem equipe ao longo do tempo.', '<button class="btn btn-primary" data-import>Importar planilha</button>')}</div></div>
      <div class="card"><div class="card-h"><h3>Relatórios importados</h3></div><div class="card-b"><div class="table-wrap"><table class="data"><thead><tr><th>Data de referência</th><th>Importado em</th><th>Arquivo</th><th class="r">OS</th><th class="r">Vencidas</th><th class="r">Sem equipe</th><th class="r">Reprogramáveis</th></tr></thead><tbody>${ctx.snaps.map((s) => `<tr><td>${F.dateTime(s.refTs)} ${s.id === ctx.meta.id ? '<span class="badge b-plan">em uso</span>' : ''}</td><td>${F.dateTime(s.importedAt)}</td><td>${esc(s.fileName)}</td><td class="r">${int(sub(s).total || s.uniqueOs)}</td><td class="r">${int(sub(s).vencidas || 0)}</td><td class="r">${int(sub(s).semEquipe || 0)}</td><td class="r">${int(sub(s).reprogramaveis || 0)}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="card"><div class="card-h"><h3>Comparação entre relatórios</h3></div><div class="card-b">${U().empty('filter', 'OS novas, persistentes e que saíram da carteira', 'A comparação por Número OS (novas, persistentes, saídas e alterações de status, equipe ou prazo) chega na Fase 4. Uma OS que sai da carteira não será tratada como executada.')}</div></div>`;
    const imp = root.querySelector('[data-import]'); if (imp) imp.onclick = () => ctx.importFile();
    if (snaps.length > 1) {
      const days = snaps.map((s) => F.date(s.refTs));
      CH().lines(root.querySelector('#h-line'), days, [{ name: 'Total pendente', data: snaps.map((s) => sub(s).total), color: '#3B82F6' }, { name: 'Vencidas', data: snaps.map((s) => sub(s).vencidas), color: '#DC2626' }, { name: 'Sem equipe', data: snaps.map((s) => sub(s).semEquipe), color: '#F59E0B' }]);
    }
  }

  /* ---------- Configurações ---------- */
  function settings(root, ctx) {
    const cur = ctx.meta, theme = OS.store.pref.get('theme', 'auto'), dens = OS.store.pref.get('density', 'comfortable'), lbl = OS.store.pref.get('charts.labels', true);
    const seg = (name, val, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-set="${name}" data-v="${v}" aria-pressed="${String(val) === String(v)}">${l}</button>`).join('')}</div>`;
    const dup = {}; ctx.snaps.forEach((s) => (dup[s.hash] = (dup[s.hash] || 0) + 1));
    root.innerHTML = `
      <div class="card"><div class="card-h"><h3>Aparência</h3></div><div class="card-b"><dl class="kv" style="align-items:center"><dt>Tema</dt><dd>${seg('theme', theme, [['light', 'Claro'], ['dark', 'Escuro'], ['auto', 'Automático']])}</dd><dt>Densidade das tabelas</dt><dd>${seg('density', dens, [['comfortable', 'Confortável'], ['compact', 'Compacta']])}</dd><dt>Valores nos gráficos</dt><dd>${seg('charts.labels', lbl, [['true', 'Mostrar'], ['false', 'Ocultar']])}</dd></dl></div></div>
      <div class="card"><div class="card-h"><h3>Dados</h3></div><div class="card-b">
        <div class="callout warn" style="margin-bottom:12px">Os dados ficam armazenados somente neste navegador e podem ser perdidos se o armazenamento local for apagado. O backup e a restauração do histórico chegam na Fase 4.</div>
        ${ctx.snaps.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>Referência</th><th>Arquivo</th><th>Tipo</th><th class="r">OS</th><th>Importado em</th><th></th></tr></thead><tbody>${ctx.snaps.map((s) => `<tr><td>${F.dateTime(s.refTs)}</td><td>${esc(s.fileName)} ${dup[s.hash] > 1 ? '<span class="badge b-danger">duplicado</span>' : ''}</td><td>${esc(s.reportType)}</td><td class="r">${int(s.uniqueOs)}</td><td>${F.dateTime(s.importedAt)}</td><td style="text-align:right">${s.id === cur.id ? '<span class="badge b-plan">em uso</span>' : `<button class="btn btn-sm" data-open="${esc(s.id)}">Abrir</button>`} <button class="btn btn-sm btn-danger" data-del="${esc(s.id)}">Excluir</button></td></tr>`).join('')}</tbody></table></div><div style="margin-top:12px"><button class="btn btn-danger" data-clear>Limpar todo o histórico</button></div>` : '<div class="muted">Nenhuma importação guardada.</div>'}
      </div></div>
      <div class="card"><div class="card-h"><h3>Relatórios</h3></div><div class="card-b"><div class="muted">As preferências de exportação em PDF (nome padrão, orientação e indicadores) serão configuráveis na Fase 5. A exportação de tabelas em XLSX e CSV já está disponível nas tabelas.</div></div></div>
      <div class="card"><div class="card-h"><h3>Informações</h3></div><div class="card-b"><dl class="kv"><dt>Versão</dt><dd>0.3.0 (Fases 1 a 3)</dd><dt>Última importação</dt><dd>${cur ? F.dateTime(Math.max(...ctx.snaps.map((s) => s.importedAt))) : '—'}</dd><dt>Registros armazenados</dt><dd>${int(ctx.snaps.reduce((a, s) => a + s.rows, 0))} linhas em ${ctx.snaps.length} relatório(s)</dd></dl>
        <div class="section-title" style="margin:16px 0 8px">Limitações dos indicadores</div>
        <ul class="muted" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
          <li>O relatório é de <b>pendências</b>. Nenhum número aqui representa serviços executados. "Despachada" não é "Executada".</li>
          <li>Uma OS que deixa de aparecer em um relatório não é considerada executada.</li>
          <li>"Vencida" compara o Prazo de Execução com a data de referência por dia de calendário. A data vem do nome do arquivo e pode ser ajustada na importação.</li>
          <li>A Data Inserção não indica quando a OS entrou na carteira de pendências.</li>
          <li>"Não informado" em Causa Resultado significa campo vazio, não ausência de problema.</li>
          <li>A coluna Equipe pode conter nomes de profissionais. Endereço, PDE e Notas de Acatamento não são exibidos nas telas gerenciais.</li>
        </ul></div></div>`;
    root.querySelectorAll('[data-set]').forEach((b) => (b.onclick = () => ctx.setPref(b.dataset.set, b.dataset.v)));
    root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => ctx.openSnapshot(b.dataset.open)));
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => ctx.deleteSnapshot(b.dataset.del)));
    const c = root.querySelector('[data-clear]'); if (c) c.onclick = () => ctx.clearAll();
  }

  /* ---------- Consulta de OS ---------- */
  function osLookup(ctx, presetId) {
    const m = U().modal({ title: 'Consultar OS', sub: 'Pesquise pelo Número OS (mínimo de 4 dígitos).', size: 'md', footer: false });
    m.body.innerHTML = `<input class="input" id="osq" inputmode="numeric" placeholder="Ex.: 2643656435" aria-label="Número OS" autocomplete="off"><div id="osr" style="margin-top:14px"></div>`;
    const inp = m.body.querySelector('#osq'), out = m.body.querySelector('#osr');
    const detail = (r) => {
      const v = (x) => (x == null || x === '' ? '—' : esc(x));
      out.innerHTML = `<div class="callout" style="margin-bottom:12px"><b>Fonte dos dados:</b> ${esc(ctx.meta.fileName)}, referência de ${F.dateTime(ctx.refTs)}, importado em ${F.dateTime(ctx.meta.importedAt)}.</div>
      <dl class="kv"><dt>Número OS</dt><dd><b>${esc(r.id)}</b></dd><dt>Serviço</dt><dd>${esc(lab(r.tss))} <span class="muted">(${v(r.tssCod)})</span></dd><dt>Família</dt><dd>${esc(lab(r.familia))}</dd><dt>Status</dt><dd>${U().statusBadge(r.status)}</dd><dt>Prioridade</dt><dd>${esc(lab(r.prioridade))}</dd><dt>Equipe</dt><dd>${v(r.equipe)}</dd><dt>Município</dt><dd>${esc(place(r.municipio))}</dd><dt>Bairro</dt><dd>${esc(place(r.bairro))}</dd><dt>ATC / ATO</dt><dd>${esc(N.titleCase(r.atc))} / ${esc(N.titleCase(r.ato))}</dd><dt>Setor</dt><dd>${v(r.setor)}</dd>
      <dt>Data de inserção</dt><dd>${F.dateTime(r.inserc)}</dd><dt>Data de competência</dt><dd>${F.dateTime(r.compet)}</dd><dt>Data agendada</dt><dd>${F.dateTime(r.agend)}</dd><dt>Prazo de execução</dt><dd>${F.dateTime(r.prazo)} <span class="muted">· ${esc(r.bucket)}${r.dias != null ? ` (${r.dias < 0 ? int(-r.dias) + ' dia(s) de atraso' : r.dias === 0 ? 'vence hoje' : 'em ' + int(r.dias) + ' dia(s)'})` : ''}</span></dd><dt>Tempo residual</dt><dd>${v(r.tempoRes)}</dd><dt>Causa registrada</dt><dd>${r.causa ? esc(N.sentence(r.causa)) : 'Não informado'}</dd><dt>Arsesp</dt><dd>${r.arsesp ? 'Sim' : 'Não'}</dd></dl>
      <div class="section-title" style="margin:18px 0 8px">Histórico de mudanças</div><div class="muted">${ctx.snaps.length > 1 ? `Há ${ctx.snaps.length} relatórios importados. O histórico de alterações por OS será exibido na Fase 4.` : 'Só há um relatório importado. O histórico de mudanças aparece quando houver mais de um.'}</div>
      <div class="muted" style="margin-top:10px;font-size:12px">Endereço, PDE e notas de acatamento não são exibidos por conterem dados pessoais.</div>`;
    };
    const search = () => {
      const q = inp.value.replace(/\D/g, ''); if (q.length < 4) { out.innerHTML = '<div class="muted">Digite ao menos 4 dígitos.</div>'; return; }
      const hits = ctx.all.filter((r) => r.id.startsWith(q)).slice(0, 21);
      if (!hits.length) { out.innerHTML = U().empty('search', 'OS não encontrada', 'Nenhuma OS com esse número no relatório em uso. Ela pode ter saído da carteira ou não estar neste arquivo.'); return; }
      if (hits.length === 1 || hits[0].id === q) return detail(hits[0]);
      out.innerHTML = `<div class="muted" style="margin-bottom:6px">${hits.length > 20 ? 'Mais de 20 resultados. Refine a busca.' : hits.length + ' resultados:'}</div>` + hits.slice(0, 20).map((r) => `<button class="btn btn-ghost" style="display:flex;width:100%;justify-content:space-between" data-id="${esc(r.id)}"><span>${esc(r.id)}</span><span class="muted">${esc(lab(r.tss))}</span></button>`).join('');
      out.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => detail(ctx.all.find((r) => r.id === b.dataset.id))));
    };
    inp.oninput = search; inp.focus();
    if (presetId) { inp.value = presetId; search(); }
  }

  OS.pages = { overview, teams, history, settings, osLookup, openRecords };
})(window);
