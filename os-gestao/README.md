# Gestão Operacional de OS

Sistema web local para acompanhar a carteira de ordens de serviço (OS) de operações de saneamento, em especial corte e supressão de água. Funciona no navegador, sem servidor e sem internet.

> **Status: versão 0.3.0 (Fases 1 a 3).** Estão prontos o layout, o tema claro/escuro, a importação do Excel, os indicadores, os filtros globais, os gráficos, as páginas Visão Geral e Desempenho das Equipes, a consulta de OS e a exportação de tabelas em XLSX/CSV. Ficam para as próximas entregas: comparação entre relatórios (Fase 4), PDF e backup (Fases 4 e 5), e acabamento de acessibilidade (Fase 6).

## Como abrir

1. Copie a pasta inteira (inclusive `vendor/`) para o computador.
2. Dê dois cliques em `index.html`. Use Chrome, Edge ou Firefox atualizados.
3. Clique em **Importar planilha** e escolha o relatório de pendências (`.xlsx`, `.xls` ou `.csv`).

Não é preciso instalar nada. As bibliotecas (SheetJS e Apache ECharts) já estão na pasta `vendor/`.

## Como importar

1. Selecione o arquivo. O sistema valida as colunas e mostra um resumo (linhas lidas, OS únicas, duplicadas, com e sem equipe) e uma prévia.
2. Confira a **data de referência**. Ela é lida do nome do arquivo (ex.: `RelatorioPendencias_OLS_20261118091602.xlsx` vira 18/11/2026 09:16) e pode ser ajustada. É ela que define o que está "vencido".
3. Confirme. Cada importação vira um snapshot guardado no navegador (IndexedDB). Ao reabrir, o último relatório em uso volta sozinho.

Arquivos incompatíveis são recusados com uma explicação. Se o mesmo arquivo for importado de novo, o sistema avisa e substitui a importação anterior.

## Regras dos indicadores

| Indicador | Regra |
|---|---|
| OS pendentes | Número OS únicos do relatório, após os filtros |
| Com / sem equipe | Coluna Equipe preenchida / vazia |
| Planejáveis, Reprogramáveis, Despachadas | Coluna Status. **Despachada não é executada** |
| Vencidas | Prazo de Execução anterior à data de referência (por dia de calendário) |
| Próximas do vencimento | Vencem hoje ou nos 3 dias seguintes |
| Faixas de prazo | Vencidas, hoje, 1 a 3 dias, 4 a 7 dias, depois disso. Mutuamente exclusivas |
| Causa não informada | Campo Causa Resultado vazio. Não significa ausência de problema |

Os números vêm do **relatório de pendências**. Nada neste sistema mede serviços executados.

## Limitações

- Uma OS que some de um relatório não é tratada como executada (a comparação entre relatórios chega na Fase 4).
- A Data Inserção não indica quando a OS entrou na carteira de pendências.
- A coluna Equipe pode conter nomes de profissionais. Equipes são agrupadas ignorando maiúsculas, acentos e espaços extras.
- O cabeçalho "Área de Serviço" pode chegar corrompido (ex.: "Ýrea de Serviço"). O sistema o reconhece sem alterar os valores originais.
- Endereço, PDE e Notas de Acatamento não aparecem nas telas gerenciais. As notas podem conter nomes, telefones e e-mails de clientes.
- A leitura do Excel roda na página principal (um arquivo de 14,5 mil linhas leva alguns segundos, com indicador de carregamento). O uso de Web Workers fica para a Fase 6, porque navegadores bloqueiam workers carregados de `file://`.
- Os dados ficam só no navegador. **Limpar os dados do navegador apaga o histórico.** O backup/restauração chega na Fase 4.

## Privacidade e segurança

- Nenhuma planilha ou registro é enviado a servidores. Não há chamadas externas.
- **Não versione planilhas reais.** O `.gitignore` já bloqueia `*.xlsx`, `*.xls` e `*.csv`.
- A versão do SheetJS incluída (0.18.5) é a última publicada no npm e tem uma vulnerabilidade conhecida de *prototype pollution* ao abrir arquivos maliciosos (corrigida na 0.19.3, distribuída fora do npm). Importe somente relatórios que vieram da sua operação. Para atualizar, substitua `vendor/xlsx.full.min.js` por uma versão mais nova baixada do site oficial.

## Estrutura

```
index.html
css/styles.css          tema claro/escuro por variáveis CSS
js/core/                regras de negócio (puras, testáveis em Node)
  normalize.js            cabeçalhos, datas BR, equipes, registros (preserva valores originais)
  validate.js             estrutura do arquivo, duplicidades, data de referência
  metrics.js              indicadores, faixas de prazo, ranking, alertas
  filters.js              filtros globais
  storage.js              IndexedDB (snapshots) e localStorage (preferências)
  format.js
js/ui/                  interface (componentes, gráficos, páginas, importação, exportação)
vendor/                 SheetJS e ECharts locais
tests/core.test.js      testes com dados fictícios
```

## Testes

```
npm test
```

Cobrem: OS únicas e duplicadas, zeros à esquerda, cabeçalho corrompido, datas BR, faixas de prazo, KPIs, agrupamento por equipe e status, filtros combinados, campos ausentes e alertas. Os testes de snapshots (entradas e saídas da carteira) entram com a Fase 4. Os testes usam apenas dados fictícios.
