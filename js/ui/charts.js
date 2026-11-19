/* Gráficos (Apache ECharts) com tema claro/escuro via variáveis CSS. */
(function (g) {
  const OS = (g.OS = g.OS || {});
  const reg = [];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const C = () => ({ text: css('--text'), text2: css('--text-2'), border: css('--border'), surface: css('--surface'), primary: css('--primary'), ok: css('--ok'), warn: css('--warn'), danger: css('--danger') });

  const STATUS_COLOR = { 'Planejável': '#3B82F6', 'Reprogramável': '#F59E0B', 'Despachada': '#22C55E', 'Planejada': '#8B5CF6', 'Suspensa': '#94A3B8', 'OS Admitida': '#14B8A6' };
  const BUCKET_COLOR = { 'Vencidas': '#DC2626', 'Vencem hoje': '#EA580C', 'Próximos 3 dias': '#F59E0B', 'Próximos 7 dias': '#60A5FA', 'Vencimento posterior': '#94A3B8', 'Sem prazo': '#CBD5E1' };
  const SERIES = ['#3B82F6', '#F59E0B', '#22C55E', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#64748B'];

  function base() {
    const c = C();
    return { c, textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: c.text2 }, animationDuration: 350, tooltip: { backgroundColor: c.surface, borderColor: c.border, textStyle: { color: c.text, fontSize: 12.5 }, extraCssText: 'box-shadow:0 8px 24px rgba(0,0,0,.18);border-radius:8px;' } };
  }

  function mount(el, optFn, onClick) {
    if (!el) return null;
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    const item = { chart, el, optFn };
    chart.setOption(optFn(base()));
    if (onClick) chart.on('click', (p) => onClick(p));
    const ro = new ResizeObserver(() => chart.resize()); ro.observe(el); item.ro = ro;
    reg.push(item); return chart;
  }
  const clear = () => { while (reg.length) { const i = reg.pop(); i.ro.disconnect(); i.chart.dispose(); } };
  const retheme = () => reg.forEach((i) => i.chart.setOption(i.optFn(base()), true));

  const show = () => OS.store.pref.get('charts.labels', true);
  const axisTxt = (b) => ({ color: b.c.text2, fontSize: 12 });
  const trunc = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : s);

  /* Barras horizontais. items: [{name,label?,value,color?}] */
  function hbar(el, items, o) {
    o = o || {}; const total = o.total || items.reduce((s, i) => s + i.value, 0);
    el.style.height = Math.max(200, items.length * 30 + 46) + 'px';
    return mount(el, (b) => ({
      textStyle: b.textStyle, animationDuration: b.animationDuration,
      grid: { left: 16, right: show() ? 70 : 20, top: 8, bottom: 8, containLabel: true },
      tooltip: { ...b.tooltip, trigger: 'item', formatter: (p) => `${OS.fmt.esc(items[p.dataIndex].label || p.name)}<br><b>${OS.fmt.int(p.value)}</b> OS · ${OS.fmt.pct((p.value / (total || 1)) * 100)}` },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      yAxis: { type: 'category', inverse: true, data: items.map((i) => i.label || i.name), axisTick: { show: false }, axisLine: { lineStyle: { color: b.c.border } }, axisLabel: { ...axisTxt(b), color: b.c.text, width: o.labelWidth || 170, overflow: 'truncate' } },
      series: [{ type: 'bar', barMaxWidth: 18, data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color || o.color || b.c.primary, borderRadius: [0, 4, 4, 0] } })), label: { show: show(), position: 'right', color: b.c.text2, fontSize: 12, formatter: (p) => OS.fmt.int(p.value) }, emphasis: { itemStyle: { opacity: .85 } } }],
    }), o.onClick && ((p) => o.onClick(items[p.dataIndex])));
  }

  function columns(el, items, o) {
    o = o || {}; const total = items.reduce((s, i) => s + i.value, 0);
    return mount(el, (b) => ({
      textStyle: b.textStyle, animationDuration: b.animationDuration, grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
      tooltip: { ...b.tooltip, trigger: 'item', formatter: (p) => `${OS.fmt.esc(p.name)}<br><b>${OS.fmt.int(p.value)}</b> OS · ${OS.fmt.pct((p.value / (total || 1)) * 100)}` },
      xAxis: { type: 'category', data: items.map((i) => i.name), axisTick: { show: false }, axisLine: { lineStyle: { color: b.c.border } }, axisLabel: { ...axisTxt(b), interval: 0, width: 90, overflow: 'break' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      series: [{ type: 'bar', barMaxWidth: 54, data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color || b.c.primary, borderRadius: [5, 5, 0, 0] } })), label: { show: true, position: 'top', color: b.c.text2, fontSize: 12, formatter: (p) => OS.fmt.int(p.value) } }],
    }), o.onClick && ((p) => o.onClick(items[p.dataIndex])));
  }

  /* Barras horizontais empilhadas: cats = nomes, series = [{name,color,data[]}] */
  function stacked(el, cats, series, o) {
    el.style.height = Math.max(240, cats.length * 32 + 80) + 'px';
    return mount(el, (b) => ({
      textStyle: b.textStyle, animationDuration: b.animationDuration, grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: b.c.text2 }, itemWidth: 10, itemHeight: 10, icon: 'roundRect' },
      tooltip: { ...b.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      yAxis: { type: 'category', inverse: true, data: cats, axisTick: { show: false }, axisLine: { lineStyle: { color: b.c.border } }, axisLabel: { ...axisTxt(b), color: b.c.text, width: 150, overflow: 'truncate' } },
      series: series.map((s) => ({ name: s.name, type: 'bar', stack: 't', barMaxWidth: 18, itemStyle: { color: s.color }, data: s.data })),
    }), o && o.onClick);
  }

  function grouped(el, cats, series) {
    return mount(el, (b) => ({
      textStyle: b.textStyle, animationDuration: b.animationDuration, grid: { left: 8, right: 8, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: b.c.text2 }, itemWidth: 10, itemHeight: 10, icon: 'roundRect' }, tooltip: { ...b.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: cats, axisTick: { show: false }, axisLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      series: series.map((s, i) => ({ name: s.name, type: 'bar', barMaxWidth: 26, itemStyle: { color: SERIES[i % SERIES.length], borderRadius: [4, 4, 0, 0] }, data: s.data })),
    }));
  }

  function lines(el, cats, series) {
    return mount(el, (b) => ({
      textStyle: b.textStyle, animationDuration: b.animationDuration, grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: b.c.text2 }, itemWidth: 12, itemHeight: 3, icon: 'roundRect' }, tooltip: { ...b.tooltip, trigger: 'axis' },
      xAxis: { type: 'category', data: cats, boundaryGap: false, axisLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: b.c.border } }, axisLabel: axisTxt(b) },
      series: series.map((s, i) => ({ name: s.name, type: 'line', smooth: false, symbolSize: 7, lineStyle: { width: 2.2 }, itemStyle: { color: s.color || SERIES[i % SERIES.length] }, data: s.data })),
    }));
  }

  OS.charts = { mount, clear, retheme, hbar, columns, stacked, grouped, lines, STATUS_COLOR, BUCKET_COLOR, SERIES };
})(window);
