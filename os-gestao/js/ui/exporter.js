/* Exportação de tabelas filtradas (XLSX / CSV). Gera sempre com a data de referência. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const { fmt } = OS;

  function recordRow(r) {
    return {
      'Número OS': r.id, 'Código TSS': r.tssCod || '', 'Descrição TSS': r.tss, 'Família': r.familia, 'Prioridade': r.prioridade, 'Status': r.status,
      'Equipe': r.equipe || '', 'Município': r.municipio, 'Bairro': r.bairro, 'ATC': r.atc, 'ATO': r.ato, 'Setor': r.setor,
      'Data Inserção': fmt.dateTime(r.inserc), 'Prazo de Execução': fmt.dateTime(r.prazo), 'Tempo Residual': r.tempoRes || '',
      'Dias até o prazo': r.dias == null ? '' : r.dias, 'Faixa de prazo': r.bucket, 'Causa Resultado': r.causa || 'Não informado',
    };
  }

  function save(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* rows: array de objetos. ctx: { refTs, fileName, filtersText, total } */
  function table(name, rows, ctx, format) {
    const day = fmt.isoDay(ctx.refTs), file = `${name}_ref-${day}`;
    const ws = XLSX.utils.json_to_sheet(rows);
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
      save(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), file + '.csv');
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      const info = [['Data de referência da carteira', fmt.dateTime(ctx.refTs)], ['Arquivo de origem', ctx.fileName || ''], ['Filtros ativos', ctx.filtersText || 'Nenhum'], ['Registros exportados', rows.length], ['Gerado em', fmt.dateTime(Date.now())], ['Observação', 'Relatório de pendências: não representa serviços executados.']];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'Informações');
      const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      save(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), file + '.xlsx');
    }
  }
  OS.exporter = { recordRow, table, save };
})(window);
