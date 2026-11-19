/* Normalização: cabeçalhos, datas BR, equipes e registros. Preserva o valor original (rec.raw). */
(function (g) {
  const OS = (g.OS = g.OS || {});

  const EXPECTED = ['Unidade Executante','Número OS','Código TSS','Descrição TSS','Família','Prioridade','Status','Equipe','PDE','Endereço','Número','Complemento','Bairro','Município','Cod. Município','Setor','Rota','Quadra','Local','Vila','SubLocal','ATC','ATO','Área de Serviço','Grupo de Faturamento','Data Inserção','Data de Competência','Data Agendada','Prazo de Execução','Tempo Residual','Notas de Acatamento','Causa Resultado','Contrato','Arsesp'];

  const strip = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const keyOf = (s) => strip(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const KEYMAP = {};
  EXPECTED.forEach((c) => (KEYMAP[keyOf(c)] = c));

  /* Cabeçalho -> nome canônico. Trata a coluna "Área de Serviço" corrompida (ex.: "Ýrea de Serviço"). */
  function canonicalHeader(h) {
    const k = keyOf(h);
    if (KEYMAP[k]) return KEYMAP[k];
    if (/rea de servico$/.test(k)) return 'Área de Serviço';
    return null;
  }

  const blank = (v) => v == null || String(v).trim() === '';
  const clean = (v) => (blank(v) ? null : String(v).trim());

  function parseBRDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : v.getTime();
    if (blank(v)) return null;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [d, mo, y, h, mi, se] = [+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)];
      const dt = new Date(y, mo - 1, d, h, mi, se);
      if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d) return dt.getTime();
      return null;
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)).getTime();
    return null;
  }

  const PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  const ACRONYMS = new Set(['atc', 'ato', 'pos', 'os', 'sac', 'ccf', 'arsesp']);
  const acr = (w) => (ACRONYMS.has(w) ? w.toUpperCase() : w);
  function titleCase(s) {
    return String(s).toLowerCase().split(' ').map((w, i) => (ACRONYMS.has(w) ? w.toUpperCase() : i > 0 && PARTICLES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  }
  /* Chave de agrupamento da equipe: sem acentos, maiúscula, espaços colapsados. */
  const teamKey = (s) => strip(s).toUpperCase().replace(/\s+/g, ' ').trim();
  const teamName = (s) => titleCase(String(s).replace(/\s+/g, ' ').trim());
  const sentence = (s) => { const t = String(s).toLowerCase().split(' ').map(acr).join(' '); return t.charAt(0).toUpperCase() + t.slice(1); };
  const afterDash = (s) => { const i = String(s).indexOf(' - '); return i >= 0 ? s.slice(i + 3) : s; };

  /* headers: array de strings da planilha; rows: array de arrays. */
  function normalizeRows(headers, rows) {
    const idx = {};
    headers.forEach((h, i) => { const c = canonicalHeader(h); if (c && !(c in idx)) idx[c] = i; });
    const get = (r, c) => (c in idx ? r[idx[c]] : undefined);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const equipe = clean(get(r, 'Equipe'));
      const atc = clean(get(r, 'ATC')) || 'Não informado';
      const ato = clean(get(r, 'ATO')) || 'Não informado';
      const pr = clean(get(r, 'Prioridade')) || 'Não informado';
      out.push({
        idx: i,
        raw: r,
        id: String(get(r, 'Número OS') == null ? '' : get(r, 'Número OS')).trim(),
        tssCod: clean(get(r, 'Código TSS')),
        tss: clean(get(r, 'Descrição TSS')) || 'Não informado',
        familia: clean(get(r, 'Família')) || 'Não informado',
        prioridade: pr,
        urgente: /urg/i.test(strip(pr)),
        status: clean(get(r, 'Status')) || 'Não informado',
        equipe: equipe ? teamName(equipe) : null,
        equipeKey: equipe ? teamKey(equipe) : null,
        bairro: clean(get(r, 'Bairro')) || 'Não informado',
        municipio: clean(get(r, 'Município')) || 'Não informado',
        setor: clean(get(r, 'Setor')) || 'Não informado',
        atc, ato, atcNome: afterDash(atc), atoNome: afterDash(ato),
        inserc: parseBRDate(get(r, 'Data Inserção')),
        compet: parseBRDate(get(r, 'Data de Competência')),
        agend: parseBRDate(get(r, 'Data Agendada')),
        prazo: parseBRDate(get(r, 'Prazo de Execução')),
        tempoRes: clean(get(r, 'Tempo Residual')),
        causa: clean(get(r, 'Causa Resultado')),
        temNotas: !blank(get(r, 'Notas de Acatamento')),
        arsesp: /^s/i.test(String(get(r, 'Arsesp') || '').trim()),
      });
    }
    return out;
  }

  OS.norm = { EXPECTED, canonicalHeader, parseBRDate, normalizeRows, teamKey, teamName, titleCase, sentence, strip, blank };
  if (typeof module !== 'undefined') module.exports = OS.norm;
})(typeof globalThis !== 'undefined' ? globalThis : window);
