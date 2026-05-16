## Visão geral

Construir o painel administrativo em **/app/admin**, restrito ao role `admin`, reaproveitando a estrutura já existente (`app.admin.tsx`, `usuarios`, `planos`). O foco principal é o **editor de estação em wizard passo a passo**, capaz de gerar checklists no mesmo formato rico que as estações nativas (impressos + PEP com Adequado / Parcialmente adequado / Inadequado).

O painel terá 5 abas:

```text
/app/admin
├── Visão geral        → métricas (KPIs)
├── Estações           → lista + wizard de criação/edição
├── Usuários           → já existe (papéis + assinaturas)
├── Conteúdo extra     → flashcards, resumos, feedbacks
└── Planos             → já existe
```

---

## 1. Layout e navegação

- Atualizar `src/routes/app.admin.tsx` para incluir as novas abas (Estações, Conteúdo) mantendo o guard de role admin já existente.
- Manter `/app/professor/*` funcionando como está; o admin terá rota própria com permissões totais.

---

## 2. Visão geral (KPIs)

Nova `src/routes/app.admin.index.tsx` mostrando cards com:
- Total de usuários (`profiles`)
- Assinantes ativos por plano (`user_subscriptions` + `plans`)
- Total de estações publicadas vs. rascunhos
- Tentativas nos últimos 7/30 dias
- Top 5 estações mais usadas
- Tentativas aguardando correção do professor

Consultas via `supabase.from(...).select(..., { count: 'exact' })`.

---

## 3. Estações — **parte principal** (wizard passo a passo)

### 3.1 Lista — `src/routes/app.admin.estacoes.tsx`
- Tabela com título, especialidade, dificuldade, status (publicado/rascunho), nº de itens de checklist, ações (editar / duplicar / publicar / excluir).
- Filtros por especialidade, status, busca.
- Botão **"Nova estação"** → cria registro vazio em `custom_stations` e redireciona ao wizard.

### 3.2 Wizard — `src/routes/app.admin.estacoes.$id.tsx`

Layout em **5 passos** com barra de progresso no topo e botões "Voltar / Próximo / Salvar e publicar":

**Passo 1 — Informações básicas**
- Título, especialidade, dificuldade, duração, tag (Nova/Popular/Recomendada), objetivo educacional.

**Passo 2 — Caso clínico**
- Caso clínico, tarefa do candidato, dados rápidos do paciente, materiais de apoio, perfil completo do paciente (`patient_profile` jsonb) com campos: nome, idade, queixa principal, HMA, antecedentes, medicações, alergias, hábitos, sinais vitais, espontâneo, só se perguntado, não revelar, tom emocional, dicas de atuação.

**Passo 3 — Impressos (materiais entregáveis)**
- Editor de lista de `deliverable_materials` (jsonb). Cada item: nome, tipo (Impresso/Exame/Imagem), descrição (gatilho), conteúdo, auto-entregar.
- Botão "Adicionar impresso", reordenar (drag handle simples ↑↓), remover.

**Passo 4 — Checklist PEP graduado** *(o coração)*
- Lista de itens em `station_checklist_items`.
- Cada item: categoria (Anamnese/Exame físico/Diagnóstico/Conduta/Comunicação/Procedimento), descrição, texto auxiliar, **3 níveis** padrão pré-preenchidos:
  - Adequado (pontos cheios)
  - Parcialmente adequado (metade)
  - Inadequado (0)
- Cada nível tem label, pontos e descrição editáveis (`levels` jsonb).
- Helper visual: total de pontos da estação calculado ao vivo.
- Reordenar via ↑↓ (atualiza `order_index`), duplicar item.

**Passo 5 — Revisão e publicar**
- Preview com tudo formatado igual a estação real.
- Conduta esperada, erros comuns, referências bibliográficas, observações para banca, material pós-estação.
- Toggle "Publicar para assinantes" (atualiza `custom_stations.published = true`).

### 3.3 Componentes reutilizáveis
- `src/components/admin/StationWizard.tsx` (orquestra passos e estado).
- `src/components/admin/steps/Step1Basics.tsx` … `Step5Review.tsx`.
- `src/components/admin/ChecklistItemEditor.tsx` (item com níveis PEP).
- `src/components/admin/DeliverableEditor.tsx` (impressos).

### 3.4 Persistência
- Salvar com debounce em `custom_stations` (campos escalares + jsonb).
- Itens de checklist gravados individualmente em `station_checklist_items` com upsert.
- Não exige migração — as colunas e RLS já existem.

### 3.5 Disponibilidade
- Toggle único de **publicar** (flag `published`). Estações publicadas aparecem automaticamente para todos os assinantes via a policy já existente.

---

## 4. Conteúdo extra — `src/routes/app.admin.conteudo.tsx`

Três sub-abas:
- **Flashcards**: tabela com CRUD reaproveitando lógica de `app.professor.flashcards.tsx`, com filtro por especialidade e botão publicar.
- **Resumos**: tabela com CRUD reaproveitando lógica de `app.professor.resumos.tsx`.
- **Feedbacks**: leitura simples (se houver tabela; caso contrário, placeholder com aviso).

---

## 5. Detalhes técnicos

- Todas as queries usam o cliente do browser (`@/integrations/supabase/client`) — RLS já protege.
- Validação com `zod` em todos os formulários (limites de tamanho, tipos, mínimos).
- Toasts via `sonner` para feedback.
- Sem migração de banco — tabelas e policies já cobrem o caso de uso.
- Wizard mantém estado local; salva ao avançar de passo e ao clicar "Salvar".

---

## Ordem de entrega

1. Atualizar layout `app.admin.tsx` com novas abas.
2. **Construir wizard de Estações completo** (lista + 5 passos) — prioridade do usuário.
3. Visão geral com KPIs.
4. Conteúdo extra (flashcards/resumos/feedback).

Quando aprovar, começo direto pelo item 2 (o que você quer mexer logo) e entrego o resto na sequência.