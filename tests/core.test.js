/* Testes dos módulos de negócio. Usam apenas dados FICTÍCIOS. Execute: npm test */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const load = (f) => require(path.join(__dirname, '..', 'js', 'core', f));
load('format.js'); const N = load('normalize.js'); const V = load('validate.js'); const M = load('metrics.js'); const F = load('filters.js');

const H = N.EXPECTED;
const REF = new Date(2026, 10, 18, 9, 16).getTime();
function row(o) {
  const d = { 'Número OS': '1', 'Descrição TSS': 'CORTAR LIGAÇÃO DE ÁGUA POR DEBITO', 'Status': 'Planejável', 'Equipe': '', 'Prioridade': 'NORMAL', 'Município': 'CIDADE A', 'ATC': '1 - ATC NORTE', 'ATO': '2 - ATO NORTE', 'Data Inserção': '10/11/2026 08:00', 'Prazo de Execução': '25/11/2026 08:00', 'Tempo Residual': '7d', 'Causa Resultado': '', ...o };
  return H.map((h) => (h in d ? d[h] : ''));
}
const build = (rows) => { const v = V.validateRecords(N.normalizeRows(H, rows)); M.annotate(v.records, REF); return v; };

test('contagem de OS únicas e duplicadas na importação', () => {
  const v = build([row({ 'Número OS': '100' }), row({ 'Número OS': '101' }), row({ 'Número OS': '100' }), row({ 'Número OS': 'abc' })]);
  assert.equal(v.total, 4); assert.equal(v.unique, 2); assert.deepEqual(v.dupIds, ['100']); assert.equal(v.invalidIds.length, 1);
});

test('identificadores preservam zeros à esquerda como texto', () => {
  const v = build([row({ 'Número OS': '0012345' })]);
  assert.equal(v.records[0].id, '0012345');
});

test('cabeçalho "Área de Serviço" corrompido é reconhecido sem alterar valores', () => {
  assert.equal(N.canonicalHeader('Ýrea de Serviço'), 'Área de Serviço');
  assert.equal(N.canonicalHeader('Ã\u0081rea de Serviço'), 'Área de Serviço');
  assert.equal(N.canonicalHeader('  número   os '), 'Número OS');
  const r = N.normalizeRows(['Número OS', 'Ýrea de Serviço'], [['1', 'ÁREA X']])[0];
  assert.equal(r.raw[1], 'ÁREA X');
});

test('validação de estrutura rejeita arquivo incompatível com explicação', () => {
  const bad = V.validateStructure(['Nome', 'Valor']);
  assert.equal(bad.ok, false); assert.match(bad.messages[0], /Faltam colunas essenciais/);
  assert.equal(V.validateStructure(H).level, 'ok');
  assert.equal(V.validateStructure(H).reportType, 'Relatório de pendências');
  assert.equal(V.validateStructure([...H, 'Coluna Nova']).level, 'warn');
});

test('datas brasileiras e valores vazios', () => {
  assert.equal(N.parseBRDate('29/10/2026 04:08'), new Date(2026, 9, 29, 4, 8).getTime());
  assert.equal(N.parseBRDate('31/02/2026 00:00'), null);
  assert.equal(N.parseBRDate(' '), null); assert.equal(N.parseBRDate(''), null); assert.equal(N.parseBRDate(null), null);
});

test('faixas de prazo são mutuamente exclusivas e somam o total', () => {
  const prazos = ['17/11/2026 10:00', '18/11/2026 23:00', '19/11/2026 08:00', '21/11/2026 08:00', '22/11/2026 08:00', '25/11/2026 08:00', '26/11/2026 08:00', ''];
  const v = build(prazos.map((p, i) => row({ 'Número OS': String(i + 1), 'Prazo de Execução': p })));
  const d = M.bucketDistribution(v.records), by = Object.fromEntries(d.map((x) => [x.key, x.n]));
  assert.equal(by['Vencidas'], 1); assert.equal(by['Vencem hoje'], 1); assert.equal(by['Próximos 3 dias'], 2);
  assert.equal(by['Próximos 7 dias'], 2); assert.equal(by['Vencimento posterior'], 1); assert.equal(by['Sem prazo'], 1);
  assert.equal(d.reduce((s, x) => s + x.n, 0), v.unique);
});

test('KPIs: com/sem equipe, status, vencidas e próximas', () => {
  const v = build([
    row({ 'Número OS': '1', Equipe: 'Ana Souza', Status: 'Despachada', 'Prazo de Execução': '10/11/2026 08:00' }),
    row({ 'Número OS': '2', Equipe: '', Status: 'Planejável' }),
    row({ 'Número OS': '3', Equipe: 'Bia Lima', Status: 'Reprogramável', 'Prazo de Execução': '20/11/2026 08:00', 'Causa Resultado': 'MORADOR AUSENTE' }),
    row({ 'Número OS': '4', Prioridade: 'URGÊNCIA' }),
  ]);
  const k = M.kpis(v.records);
  assert.equal(k.total, 4); assert.equal(k.comEquipe, 2); assert.equal(k.semEquipe, 2); assert.equal(k.comEquipe + k.semEquipe, k.total);
  assert.equal(k.despachadas, 1); assert.equal(k.reprogramaveis, 1); assert.equal(k.planejaveis, 2);
  assert.equal(k.vencidas, 1); assert.equal(k.proximas, 1); assert.equal(k.urgentes, 1); assert.equal(k.comCausa, 1);
});

test('agrupamento por equipe normaliza maiúsculas, acentos e espaços', () => {
  const v = build([row({ 'Número OS': '1', Equipe: 'JOSÉ  da Silva' }), row({ 'Número OS': '2', Equipe: 'jose da silva ' }), row({ 'Número OS': '3', Equipe: 'Maria Dias' })]);
  const t = M.teamTable(v.records);
  assert.equal(t.rows.length, 2); assert.equal(t.assigned, 3); assert.equal(t.rows[0].total, 2);
  assert.equal(Math.round(t.rows.reduce((s, r) => s + r.pct, 0)), 100);
});

test('agrupamento por status mantém as categorias reais da planilha', () => {
  const v = build(['Planejável', 'Planejável', 'Suspensa', 'OS Admitida'].map((s, i) => row({ 'Número OS': String(i + 1), Status: s })));
  assert.deepEqual(M.statusDistribution(v.records).map((x) => [x.key, x.n]), [['Planejável', 2], ['Suspensa', 1], ['OS Admitida', 1]]);
});

test('causa vazia é "Não informado"', () => {
  const v = build([row({ 'Número OS': '1' }), row({ 'Número OS': '2', 'Causa Resultado': 'FIM DO DIA' })]);
  assert.deepEqual(M.causeDistribution(v.records).map((x) => x.key).sort(), ['FIM DO DIA', 'Não informado']);
});

test('filtros combinados, incluindo "Sem equipe"', () => {
  const v = build([
    row({ 'Número OS': '1', Equipe: 'Ana', Status: 'Reprogramável' }), row({ 'Número OS': '2', Equipe: '', Status: 'Reprogramável' }),
    row({ 'Número OS': '3', Equipe: '', Status: 'Planejável' }), row({ 'Número OS': '4', Equipe: 'Ana', Status: 'Planejável', 'Município': 'CIDADE B' }),
  ]).records;
  assert.equal(F.apply(v, { status: new Set(['Reprogramável']), equipe: new Set(['Sem equipe']) }).length, 1);
  assert.equal(F.apply(v, { equipe: new Set(['Ana']), municipio: new Set(['CIDADE B']) }).length, 1);
  assert.equal(F.apply(v, {}).length, 4);
  const opts = F.options(v, { status: new Set(['Planejável']) }, 'status'); // contagens ignoram o próprio filtro
  assert.equal(opts.find((o) => o.value === 'Reprogramável').n, 2);
});

test('campos ausentes não quebram os indicadores', () => {
  const v = build([row({ 'Número OS': '1', Status: '', Equipe: '', Município: '', ATC: '', 'Prazo de Execução': '', 'Data Inserção': '' })]);
  const k = M.kpis(v.records);
  assert.equal(k.total, 1); assert.equal(k.vencidas, 0); assert.equal(v.records[0].status, 'Não informado'); assert.equal(v.records[0].bucket, 'Sem prazo');
  assert.deepEqual(M.kpis([]).total, 0); assert.deepEqual(M.alerts([], null), []);
});

test('data de referência vem do nome do arquivo', () => {
  const g = V.guessReferenceDate('RelatorioPendencias_OLS_20261118091602.xlsx', []);
  assert.equal(g.ts, new Date(2026, 10, 18, 9, 16, 2).getTime()); assert.equal(g.source, 'nome do arquivo');
});

test('alertas determinísticos: sem equipe e vencidas', () => {
  const v = build(Array.from({ length: 10 }, (_, i) => row({ 'Número OS': String(i + 1), 'Prazo de Execução': '01/11/2026 08:00' })));
  const a = M.alerts(v.records, { total: 5 });
  assert.ok(a.some((x) => x.title === 'Volume de OS sem equipe' && x.level === 'high'));
  assert.ok(a.some((x) => x.title === 'Ordens com prazo vencido'));
  assert.ok(a.some((x) => x.title === 'Carteira cresceu'));
});
