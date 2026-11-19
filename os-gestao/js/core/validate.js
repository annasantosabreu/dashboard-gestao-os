/* Validação da estrutura do arquivo e dos registros. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const N = () => OS.norm;

  const CRITICAL = ['Número OS', 'Descrição TSS', 'Status', 'Equipe', 'Prazo de Execução', 'Município', 'ATC', 'ATO', 'Prioridade', 'Data Inserção'];

  function validateStructure(headers) {
    const present = new Set(), unknown = [];
    headers.forEach((h) => { const c = N().canonicalHeader(h); if (c) present.add(c); else if (String(h || '').trim()) unknown.push(String(h)); });
    const missing = N().EXPECTED.filter((c) => !present.has(c));
    const missingCritical = missing.filter((c) => CRITICAL.includes(c));
    const isPend = present.has('Tempo Residual') && present.has('Prazo de Execução') && present.has('Status') && present.has('Número OS');
    const reportType = isPend ? 'Relatório de pendências' : 'Tipo não reconhecido';
    const messages = [];
    let level = 'ok';
    if (missingCritical.length) {
      level = 'error';
      messages.push('Este arquivo não parece o relatório de pendências esperado. Faltam colunas essenciais: ' + missingCritical.join(', ') + '.');
    } else {
      if (missing.length) { level = 'warn'; messages.push('Colunas não encontradas (não essenciais): ' + missing.join(', ') + '.'); }
      if (unknown.length) { level = level === 'ok' ? 'warn' : level; messages.push('Colunas novas serão preservadas, mas não usadas nos indicadores: ' + unknown.join(', ') + '.'); }
    }
    return { level, ok: level !== 'error', missing, missingCritical, unknown, reportType, messages };
  }

  function validateRecords(recs) {
    const seen = new Set(), dupIds = [], invalidIds = [];
    const invalidDates = { 'Data Inserção': 0, 'Prazo de Execução': 0 };
    const unique = [];
    for (const r of recs) {
      if (!/^\d+$/.test(r.id)) { invalidIds.push(r.idx + 2); continue; }
      if (seen.has(r.id)) { dupIds.push(r.id); continue; }
      seen.add(r.id);
      unique.push(r);
      if (r.inserc == null) invalidDates['Data Inserção']++;
      if (r.prazo == null) invalidDates['Prazo de Execução']++;
    }
    return { total: recs.length, records: unique, unique: unique.length, dupIds, invalidIds, invalidDates };
  }

  /* Data de referência: timestamp do nome do arquivo (…_AAAAMMDDhhmmss) ou maior Data Inserção. */
  function guessReferenceDate(fileName, recs) {
    const m = String(fileName || '').match(/(20\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]); if (!isNaN(d)) return { ts: d.getTime(), source: 'nome do arquivo' }; }
    let max = 0; for (const r of recs) if (r.inserc && r.inserc > max) max = r.inserc;
    return max ? { ts: max, source: 'maior Data Inserção do arquivo' } : { ts: Date.now(), source: 'data atual (não foi possível inferir)' };
  }

  OS.validate = { validateStructure, validateRecords, guessReferenceDate, CRITICAL };
  if (typeof module !== 'undefined') module.exports = OS.validate;
})(typeof globalThis !== 'undefined' ? globalThis : window);
