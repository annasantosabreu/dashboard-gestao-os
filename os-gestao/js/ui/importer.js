/* Fluxo de importação: ler → validar → resumo → confirmar. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const { esc, int, date, dateTime } = Object.assign({}, OS.fmt, OS.fmt);
  const U = () => OS.ui;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function decodeText(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
  }

  async function parseFile(file) {
    const buf = await file.arrayBuffer();
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) throw new Error('Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.');
    await delay(30);
    const wb = ext === 'csv' ? XLSX.read(decodeText(buf), { type: 'string', raw: true }) : XLSX.read(buf, { type: 'array' });
    let best = null;
    for (const name of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
      if (!aoa.length) continue;
      let h = aoa.slice(0, 10).findIndex((row) => row.some((c) => OS.norm.canonicalHeader(c) === 'Número OS'));
      const found = h >= 0; if (h < 0) h = 0;
      const cand = { sheet: name, headers: aoa[h].map((c) => String(c)), rows: aoa.slice(h + 1).filter((r) => r.some((c) => String(c).trim() !== '')), found };
      if (!best || (cand.found && !best.found)) best = cand;
      if (cand.found) break;
    }
    if (!best) throw new Error('O arquivo está vazio ou não contém planilhas legíveis.');
    return { buf, ...best };
  }

  async function open(app) {
    const m = U().modal({ title: 'Importar planilha', sub: 'Os dados ficam somente neste navegador. Nada é enviado a servidores.', size: 'md', footer: true });
    const foot = m.foot;
    const setFoot = (h) => { foot.innerHTML = h; };
    const drop = () => {
      m.setBody(`<label class="drop" id="drop" tabindex="0"><div class="ic" style="display:inline-grid;margin-bottom:8px;color:var(--primary)">${U().ic('upload', 28)}</div><div style="font-weight:600">Selecione ou arraste o relatório de pendências</div><div class="muted" style="margin-top:4px">Formatos aceitos: XLSX, XLS e CSV</div><input type="file" id="file" accept=".xlsx,.xls,.csv" hidden></label><div class="callout" style="margin-top:12px">Dica: use o relatório "RelatorioPendencias" exatamente como é gerado pelo sistema. A data de referência é lida do nome do arquivo e você pode ajustá-la antes de confirmar.</div>`);
      setFoot('<button class="btn" data-close2>Cancelar</button>'); foot.querySelector('[data-close2]').onclick = m.close;
      const d = m.body.querySelector('#drop'), f = m.body.querySelector('#file');
      f.onchange = () => f.files[0] && handle(f.files[0]);
      d.ondragover = (e) => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over');
      d.ondrop = (e) => { e.preventDefault(); d.classList.remove('over'); e.dataTransfer.files[0] && handle(e.dataTransfer.files[0]); };
      d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.click(); } };
    };
    const fail = (msg) => { m.setBody(`<div class="callout err"><b>Não foi possível importar.</b><br>${esc(msg)}</div>`); setFoot('<button class="btn" data-again>Escolher outro arquivo</button>'); foot.querySelector('[data-again]').onclick = drop; };

    async function handle(file) {
      m.setBody(`<div style="display:flex;flex-direction:column;gap:10px"><div style="font-weight:600">Lendo e validando "${esc(file.name)}"…</div><div class="skeleton" style="height:16px"></div><div class="skeleton" style="height:16px;width:70%"></div><div class="skeleton" style="height:120px"></div><div class="muted">Arquivos com mais de 10 mil linhas podem levar alguns segundos.</div></div>`);
      setFoot('');
      try {
        await delay(40);
        const p = await parseFile(file);
        const sv = OS.validate.validateStructure(p.headers);
        if (!sv.ok) return fail(sv.messages.join(' '));
        await delay(10);
        const recs = OS.norm.normalizeRows(p.headers, p.rows);
        const rv = OS.validate.validateRecords(recs);
        if (!rv.unique) return fail('Nenhuma linha com Número OS válido foi encontrada.');
        const hash = await OS.store.hashBuffer(p.buf);
        const guess = OS.validate.guessReferenceDate(file.name, rv.records);
        const list = await OS.store.listSnapshots();
        summary(file, p, sv, rv, hash, guess, list);
      } catch (e) { console.error(e); fail(e.message || String(e)); }
    }

    function summary(file, p, sv, rv, hash, guess, list) {
      const same = list.find((x) => x.hash === hash);
      const pad = (n) => String(n).padStart(2, '0'); const gd = new Date(guess.ts);
      const dtVal = `${gd.getFullYear()}-${pad(gd.getMonth() + 1)}-${pad(gd.getDate())}`, tmVal = `${pad(gd.getHours())}:${pad(gd.getMinutes())}`;
      const warns = [];
      if (sv.level === 'warn') warns.push(...sv.messages);
      if (rv.dupIds.length) warns.push(`${int(rv.dupIds.length)} linha(s) com Número OS repetido serão ignoradas (vale a primeira ocorrência).`);
      if (rv.invalidIds.length) warns.push(`${int(rv.invalidIds.length)} linha(s) sem Número OS válido serão ignoradas.`);
      const bad = rv.invalidDates['Prazo de Execução'] + rv.invalidDates['Data Inserção'];
      if (bad) warns.push(`Datas não reconhecidas: ${rv.invalidDates['Prazo de Execução']} em Prazo de Execução e ${rv.invalidDates['Data Inserção']} em Data Inserção. Essas OS ficam sem faixa de prazo.`);
      if (same) warns.push(`Este arquivo já foi importado em ${dateTime(same.importedAt)}. Confirmar substitui a importação anterior.`);
      const prev = list.filter((x) => x.hash !== hash);
      const k = OS.metrics.kpis(OS.metrics.annotate(rv.records.slice(), guess.ts));
      m.setBody(`
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="callout ok"><b>Arquivo válido.</b> ${esc(sv.reportType)} reconhecido.</div>
          ${warns.map((w) => `<div class="callout warn">${esc(w)}</div>`).join('')}
          <div class="stat-row"><div class="stat"><div class="l">Linhas lidas</div><div class="v num">${int(rv.total)}</div></div><div class="stat"><div class="l">OS únicas</div><div class="v num">${int(rv.unique)}</div></div><div class="stat"><div class="l">Com equipe</div><div class="v num">${int(k.comEquipe)}</div></div><div class="stat"><div class="l">Sem equipe</div><div class="v num">${int(k.semEquipe)}</div></div></div>
          <dl class="kv"><dt>Arquivo</dt><dd>${esc(file.name)}</dd><dt>Planilha lida</dt><dd>${esc(p.sheet)}</dd>
          <dt>Data de referência</dt><dd style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="date" class="input" id="refd" value="${dtVal}" style="width:150px"><input type="time" class="input" id="reft" value="${tmVal}" style="width:110px"><span class="muted">origem: ${esc(guess.source)}</span></dd></dl>
          <div><div class="muted" style="margin-bottom:6px;font-weight:600">Prévia (primeiros registros)</div><div class="table-wrap" style="max-height:200px"><table class="data"><thead><tr><th>Número OS</th><th>Serviço</th><th>Status</th><th>Equipe</th><th>Município</th><th>Prazo</th></tr></thead><tbody>${rv.records.slice(0, 5).map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(OS.fmt.label(r.tss))}</td><td>${esc(r.status)}</td><td>${esc(r.equipe || '—')}</td><td>${esc(OS.fmt.place(r.municipio))}</td><td>${date(r.prazo)}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="muted" style="font-size:12.5px">Equipes aparecem como estão na planilha. Endereços, PDE e notas de acatamento não são exibidos em tabelas gerenciais.${prev.length ? ` Já existem ${prev.length} importação(ões) guardada(s).` : ''}</div>
        </div>`);
      setFoot(`<button class="btn" data-cancel>Cancelar</button><button class="btn btn-primary" data-ok>${same ? 'Substituir importação' : 'Confirmar importação'}</button>`);
      foot.querySelector('[data-cancel]').onclick = m.close;
      foot.querySelector('[data-ok]').onclick = async (ev) => {
        const btn = ev.currentTarget; btn.disabled = true; btn.textContent = 'Salvando…';
        try {
          const d = m.body.querySelector('#refd').value, t = m.body.querySelector('#reft').value || '00:00';
          let refTs = guess.ts; if (d) { const [y, mo, da] = d.split('-').map(Number), [h, mi] = t.split(':').map(Number); refTs = new Date(y, mo - 1, da, h, mi).getTime(); }
          if (same) await OS.store.deleteSnapshot(same.id);
          const recs2 = OS.metrics.annotate(rv.records.slice(), refTs), kk = OS.metrics.kpis(recs2);
          const snap = { id: `s${refTs}-${hash.slice(0, 8)}`, headers: p.headers, rows: p.rows, meta: { id: `s${refTs}-${hash.slice(0, 8)}`, fileName: file.name, hash, importedAt: Date.now(), refTs, rows: rv.total, uniqueOs: rv.unique, reportType: sv.reportType, sheet: p.sheet, summary: { total: kk.total, comEquipe: kk.comEquipe, semEquipe: kk.semEquipe, vencidas: kk.vencidas, reprogramaveis: kk.reprogramaveis, planejaveis: kk.planejaveis, despachadas: kk.despachadas } } };
          await OS.store.saveSnapshot(snap);
          m.close();
          await app.openSnapshot(snap.id);
          U().toast(`Importação concluída: ${int(rv.unique)} OS.`, 'ok');
        } catch (e) { console.error(e); U().toast('Falha ao salvar no navegador: ' + (e.message || e), 'err'); btn.disabled = false; btn.textContent = 'Tentar novamente'; }
      };
    }
    drop();
  }
  OS.importer = { open };
})(window);
