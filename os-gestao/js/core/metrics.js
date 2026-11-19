/* Indicadores: funções puras, sem acesso ao DOM. */
(function (g) {
  const OS = (g.OS = g.OS || {});

  const STATUS_ORDER = ['Planejável', 'Reprogramável', 'Despachada', 'Planejada', 'Suspensa', 'OS Admitida'];
  const BUCKETS = ['Vencidas', 'Vencem hoje', 'Próximos 3 dias', 'Próximos 7 dias', 'Vencimento posterior'];
  const NO_BUCKET = 'Sem prazo';
  const NO_TEAM = 'Sem equipe';
  const NO_CAUSE = 'Não informado';

  const dayStart = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  /* Diferença em dias de calendário entre o prazo e a data de referência. */
  const dayDiff = (prazo, ref) => Math.round((dayStart(prazo) - dayStart(ref)) / 864e5);

  /* Faixas mutuamente exclusivas (cada OS cai em exatamente uma). */
  function bucketOf(dias) {
    if (dias == null) return NO_BUCKET;
    if (dias < 0) return BUCKETS[0];
    if (dias === 0) return BUCKETS[1];
    if (dias <= 3) return BUCKETS[2];
    if (dias <= 7) return BUCKETS[3];
    return BUCKETS[4];
  }

  /* Calcula, uma vez por importação, os campos dependentes da data de referência. */
  function annotate(recs, refTs) {
    for (const r of recs) { r.dias = r.prazo == null ? null : dayDiff(r.prazo, refTs); r.bucket = bucketOf(r.dias); }
    return recs;
  }

  function countBy(recs, fn) {
    const m = new Map();
    for (const r of recs) { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key), 'pt-BR'));
  }

  const pct = (a, b) => (b ? (a / b) * 100 : 0);

  const KPI_RULES = {
    total: 'Todas as OS do relatório de pendências após os filtros ativos. Cada Número OS é contado uma vez.',
    comEquipe: 'OS com a coluna "Equipe" preenchida. Não indica execução, apenas atribuição.',
    semEquipe: 'OS com a coluna "Equipe" vazia.',
    planejaveis: 'OS com Status "Planejável" (aguardando planejamento).',
    reprogramaveis: 'OS com Status "Reprogramável" (precisam de nova programação).',
    despachadas: 'OS com Status "Despachada". Despachada não significa executada.',
    vencidas: 'Prazo de Execução anterior à data de referência (comparação por dia de calendário).',
    proximas: 'Prazo de Execução entre a data de referência (hoje) e 3 dias depois, inclusive. Não inclui as vencidas.',
    urgentes: 'OS com Prioridade "URGÊNCIA".',
    comCausa: 'OS com a coluna "Causa Resultado" preenchida.',
  };

  function kpis(recs) {
    const k = { total: recs.length, comEquipe: 0, planejaveis: 0, reprogramaveis: 0, despachadas: 0, vencidas: 0, proximas: 0, urgentes: 0, comCausa: 0 };
    const tipos = new Set(), mun = new Set();
    for (const r of recs) {
      if (r.equipe) k.comEquipe++;
      if (r.status === 'Planejável') k.planejaveis++;
      else if (r.status === 'Reprogramável') k.reprogramaveis++;
      else if (r.status === 'Despachada') k.despachadas++;
      if (r.dias != null) { if (r.dias < 0) k.vencidas++; else if (r.dias <= 3) k.proximas++; }
      if (r.urgente) k.urgentes++;
      if (r.causa) k.comCausa++;
      tipos.add(r.tss); mun.add(r.municipio);
    }
    k.semEquipe = k.total - k.comEquipe;
    k.pctSemEquipe = pct(k.semEquipe, k.total);
    k.pctReprog = pct(k.reprogramaveis, k.total);
    k.tipos = tipos.size; k.municipios = mun.size;
    return k;
  }

  /* Predicados usados para abrir o detalhamento de cada KPI. */
  const KPI_FILTER = {
    total: () => true, comEquipe: (r) => !!r.equipe, semEquipe: (r) => !r.equipe,
    planejaveis: (r) => r.status === 'Planejável', reprogramaveis: (r) => r.status === 'Reprogramável',
    despachadas: (r) => r.status === 'Despachada', vencidas: (r) => r.dias != null && r.dias < 0,
    proximas: (r) => r.dias != null && r.dias >= 0 && r.dias <= 3, urgentes: (r) => r.urgente, comCausa: (r) => !!r.causa,
  };

  function statusDistribution(recs) {
    const c = countBy(recs, (r) => r.status);
    const rank = (s) => { const i = STATUS_ORDER.indexOf(s); return i < 0 ? 99 : i; };
    return c.sort((a, b) => rank(a.key) - rank(b.key));
  }
  const bucketDistribution = (recs) => {
    const m = Object.fromEntries(BUCKETS.map((b) => [b, 0])); let sem = 0;
    for (const r of recs) { if (r.bucket === NO_BUCKET) sem++; else m[r.bucket]++; }
    const out = BUCKETS.map((b) => ({ key: b, n: m[b] }));
    if (sem) out.push({ key: NO_BUCKET, n: sem });
    return out;
  };
  const causeDistribution = (recs) => countBy(recs, (r) => r.causa || NO_CAUSE);

  /* Ranking de equipes (somente OS com equipe atribuída). */
  function teamTable(recs) {
    const m = new Map(); let assigned = 0;
    for (const r of recs) {
      if (!r.equipe) continue;
      assigned++;
      let t = m.get(r.equipeKey);
      if (!t) m.set(r.equipeKey, (t = { key: r.equipeKey, nome: r.equipe, total: 0, plan: 0, reprog: 0, desp: 0, outros: 0, venc: 0, prox: 0 }));
      t.total++;
      if (r.status === 'Planejável') t.plan++; else if (r.status === 'Reprogramável') t.reprog++; else if (r.status === 'Despachada') t.desp++; else t.outros++;
      if (r.dias != null) { if (r.dias < 0) t.venc++; else if (r.dias <= 3) t.prox++; }
    }
    const rows = [...m.values()];
    rows.forEach((t) => (t.pct = pct(t.total, assigned)));
    return { rows: rows.sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR')), assigned };
  }

  /* Alertas determinísticos. prev = { total, vencidas, reprog } do relatório anterior, se houver. */
  function alerts(recs, prev) {
    const out = [], k = kpis(recs);
    if (!k.total) return out;
    const f = OS.fmt ? OS.fmt.int : (n) => String(n);
    const p1 = (n) => n.toFixed(1).replace('.', ',') + '%';
    const semPlan = recs.filter((r) => !r.equipe && r.status === 'Planejável').length;
    const semOutros = k.semEquipe - semPlan;
    if (k.pctSemEquipe >= 25)
      out.push({ level: k.pctSemEquipe >= 50 ? 'high' : 'mid', title: 'Volume de OS sem equipe', text: `${f(k.semEquipe)} OS (${p1(k.pctSemEquipe)}) não têm equipe. ${f(semPlan)} são Planejáveis e ${f(semOutros)} estão em outros status.`, kpi: 'semEquipe' });
    const rsq = recs.filter((r) => !r.equipe && r.status === 'Reprogramável').length;
    if (rsq) out.push({ level: 'mid', title: 'Reprogramáveis sem equipe', text: `${f(rsq)} OS reprogramáveis estão sem equipe e precisam de nova atribuição.`, filter: { status: ['Reprogramável'], equipe: [NO_TEAM] } });
    if (k.vencidas) {
      let maxAtraso = 0; for (const r of recs) if (r.dias != null && -r.dias > maxAtraso) maxAtraso = -r.dias;
      out.push({ level: pct(k.vencidas, k.total) >= 20 ? 'high' : 'mid', title: 'Ordens com prazo vencido', text: `${f(k.vencidas)} OS (${p1(pct(k.vencidas, k.total))}) estão vencidas. O maior atraso é de ${f(maxAtraso)} dias.`, kpi: 'vencidas' });
    }
    if (k.proximas) out.push({ level: 'info', title: 'Vencimentos próximos', text: `${f(k.proximas)} OS vencem hoje ou nos próximos 3 dias.`, kpi: 'proximas' });
    const atc = countBy(recs, (r) => r.atcNome)[0];
    if (atc && pct(atc.n, k.total) >= 15)
      out.push({ level: pct(atc.n, k.total) >= 25 ? 'mid' : 'info', title: 'Concentração por ATC', text: `${OS.norm.titleCase(atc.key)} concentra ${f(atc.n)} OS (${p1(pct(atc.n, k.total))} da carteira).`, filter: { atc: recs.filter((r) => r.atcNome === atc.key).slice(0, 1).map((r) => r.atc) } });
    if (k.pctReprog >= 15) {
      const top = causeDistribution(recs.filter((r) => r.status === 'Reprogramável' && r.causa))[0];
      out.push({ level: k.pctReprog >= 30 ? 'high' : 'mid', title: 'Parcela relevante de reprogramáveis', text: `${f(k.reprogramaveis)} OS (${p1(k.pctReprog)}) estão reprogramáveis.` + (top ? ` Causa mais frequente: ${OS.norm.sentence(top.key)} (${f(top.n)}).` : ''), kpi: 'reprogramaveis' });
    }
    if (k.urgentes) out.push({ level: 'mid', title: 'Ordens urgentes', text: `${f(k.urgentes)} OS com prioridade de urgência na carteira.`, kpi: 'urgentes' });
    if (prev && prev.total) {
      const d = k.total - prev.total;
      if (d !== 0) out.push({ level: d > 0 ? 'mid' : 'ok', title: d > 0 ? 'Carteira cresceu' : 'Carteira reduziu', text: `${d > 0 ? '+' : '−'}${f(Math.abs(d))} OS em relação à importação anterior (${f(prev.total)}).` });
    }
    const rank = { high: 0, mid: 1, info: 2, ok: 3 };
    return out.sort((a, b) => rank[a.level] - rank[b.level]);
  }

  OS.metrics = { STATUS_ORDER, BUCKETS, NO_BUCKET, NO_TEAM, NO_CAUSE, KPI_RULES, KPI_FILTER, dayDiff, bucketOf, annotate, countBy, kpis, statusDistribution, bucketDistribution, causeDistribution, teamTable, alerts, pct };
  if (typeof module !== 'undefined') module.exports = OS.metrics;
})(typeof globalThis !== 'undefined' ? globalThis : window);
