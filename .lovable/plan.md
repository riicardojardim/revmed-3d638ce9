# Importador de Checklists via PDF (Admin)

Nova página em `/app/admin/estacoes/importar` que processa **vários PDFs de uma vez**, usa IA pra detectar e separar cada checklist dentro do PDF, mantém o texto **100% literal** e salva tudo nas tabelas existentes (`custom_stations` + `station_checklist_items`).

## Fluxo do usuário

1. Admin entra em **Estações → Importar PDFs**
2. Arrasta 1+ PDFs (até 10 por vez, 20MB cada)
3. Cada PDF aparece numa fila com status: `Lendo PDF → Analisando com IA → Pronto`
4. Quando termina, mostra um **preview agrupado** com todas as estações detectadas (PDF de origem, título, especialidade, nº de itens do checklist)
5. Admin pode:
   - Expandir cada estação e ver/editar todos os campos antes de salvar
   - Desmarcar estações que não quer importar
   - Reprocessar um PDF individual
6. Botão **"Importar X estações"** → salva tudo como rascunho (não publicado) e redireciona pra lista de estações

## Como a IA processa (estratégia anti-alucinação)

Como o PDF não tem padrão fixo, fazemos em **2 passos** pra garantir texto literal:

**Passo 1 — Segmentação:** mando o texto bruto extraído do PDF pra IA com instrução: *"Identifique onde cada estação clínica começa e termina. Retorne APENAS os índices de caractere de início/fim de cada uma. Não reescreva nada."*  
Retorno: `[{start: 0, end: 1823}, {start: 1824, end: 3500}, ...]`

**Passo 2 — Extração estruturada por estação:** pra cada fatia, mando o texto da estação isolado e peço pra IA preencher os campos (`title`, `specialty`, `difficulty`, `clinical_case`, `candidate_task`, `patient_info`, `patient_script`, `evaluator_notes`, `scoring_criteria`, `competencies`, `post_materials`, `checklist_items[]`) **copiando trechos literais do texto fornecido**. Schema Zod com `Output.object` da AI SDK força JSON estruturado.

Prompt explícito: *"NUNCA reescreva, parafraseie ou resuma. Copie o texto exatamente como aparece, incluindo pontuação. Se um campo não existir no texto, deixe null."*

Modelo: `google/gemini-2.5-pro` (contexto grande + bom em extração literal). Fallback para `gemini-3-flash-preview` se der rate limit.

## Detalhes técnicos

**Extração de PDF:** biblioteca `unpdf` (pure JS, funciona no Cloudflare Worker — `pdf-parse` e `pdfjs-dist` quebram).

**Server functions** (em `src/lib/checklist-import.functions.ts`):
- `extractPdfText({ pdfBase64 })` → retorna texto + nº páginas
- `segmentStations({ rawText })` → IA retorna ranges
- `extractStation({ stationText })` → IA retorna objeto estruturado tipado
- `bulkInsertStations({ stations })` → insere em `custom_stations` + `station_checklist_items` numa transação, todas como `published: false`

Tudo protegido por middleware que valida `has_role(user, 'admin')`.

**UI:**
- `src/routes/app.admin.estacoes.importar.tsx` — página com dropzone + fila + preview
- Processamento client-side em paralelo (max 3 PDFs simultâneos), barra de progresso por arquivo
- Preview usa `<Accordion>` com formulário editável idêntico ao do editor de estação existente

**Limites e custo:**
- Cada PDF é processado individualmente pra não estourar contexto
- Aviso visual de custo estimado antes de processar ("~X requisições de IA")
- Erros por estação não bloqueiam o resto (parcial > nada)

## O que NÃO muda

- Tabelas `custom_stations` e `station_checklist_items` — uso o schema atual
- Fluxo de edição/publicação individual continua igual
- Nada relacionado a fluxos de aluno, simulação, salas

## Arquivos

**Novos:**
- `src/routes/app.admin.estacoes.importar.tsx`
- `src/lib/checklist-import.functions.ts`
- `src/lib/pdf-extract.server.ts`

**Modificados:**
- `src/routes/app.admin.estacoes.index.tsx` — adicionar botão "Importar PDFs"

**Dependência nova:** `unpdf` (~150KB, edge-compatible)

---

Posso seguir com essa abordagem? Se topar, eu já começo pelos server functions + extrator de PDF, depois monto a UI.
