
# Plano: Flashcards estilo Pense Revalida (Admin + UX do aluno)

Vou implementar a criação/gestão de flashcards no painel **Admin** seguindo o layout que você mostrou (lista de decks → cover image roxa + título → cards internos com **Pergunta / Resposta** e botões "Errei / Difícil / Fácil"). Também vou ajustar a página do aluno (`/app/flashcards`) para usar esse mesmo visual.

## 1. Banco (migration)

Hoje a tabela `flashcards` é "card solto". Vou adicionar a noção de **deck** como entidade com capa, e os cards passam a pertencer a um deck.

- Nova tabela `flashcard_decks`:
  - `id`, `created_by`, `title` (ex.: "AVC Isquêmico"), `specialty` (CM, CR, GO, PR, PS, etc. — usa as siglas que já aparecem no badge colorido), `topic` (opcional), `cover_image_url` (capa roxa), `description`, `published`, `position` (ordenação), `created_at`, `updated_at`.
  - RLS: `select` para qualquer autenticado quando `published=true`; admin/professor podem CRUD.
- Em `flashcards`:
  - adicionar `deck_id uuid references flashcard_decks(id) on delete cascade` (nullable para retrocompatibilidade) + `position int default 0`.
  - migrar os flashcards existentes que tenham `deck text` para um deck novo agrupado por `(created_by, specialty, deck)`.
- Storage bucket `flashcard-covers` (público para leitura) para as capas. RLS de upload: só admin/professor.

## 2. Admin → nova aba "Flashcards"

- Adicionar item `Flashcards` em `app.admin.tsx` (ao lado de Estações/Conteúdo).
- Nova rota `src/routes/app.admin.flashcards.tsx`:
  - **Lista de decks** (como a primeira screenshot): badge de especialidade colorido (CM azul, CR azul, GO rosa, PR laranja, PS rosa…), título, contagem de cards, "média/nota" placeholder, botão **Editar** e **Publicar/Despublicar**.
  - Filtro "Todas as Áreas" + busca.
  - Botão **+ Novo Deck**.
- Nova rota `src/routes/app.admin.flashcards.$id.tsx` (editor do deck):
  - Topo: upload da capa (preview roxa estilo Pense Revalida), título, especialidade (select), tópico, publicado.
  - Lista de cards do deck (drag-to-reorder simples por botões ↑↓), cada card com **Pergunta** + **Resposta** (textarea) + remover.
  - Botão **+ Adicionar card**.
  - Salvamento por card (debounced) + botão "Salvar tudo".

## 3. Página do aluno (`/app/flashcards`)

Refazer no estilo das suas screenshots:

1. **Tela 1 — lista de decks** (`425 Flashcards`): tabela com badge de sigla, nome, média, nota, botão **Iniciar**. Filtro "Todas as Áreas".
2. **Tela 2 — capa do deck**: card centralizado com `cover_image_url`, título em caixa alta, botão **Iniciar Flashcard**.
3. **Tela 3 — pergunta**: card roxo "Pergunta — 1 | N" + texto centralizado + botão **Ver Resposta** + setas ‹ ›.
4. **Tela 4 — resposta**: card amarelo claro com a resposta + "Como foi sua resposta?" com 3 botões redondos (vermelho/amarelo/verde) que alimentam o algoritmo de revisão espaçada já existente (`flashcard_reviews`: 0/3/5).
5. Botão **Fechar** volta para a lista.

Tokens: tudo via `src/styles.css` (sem cores hardcoded). Roxo/violeta = `--primary` ou novo `--flashcard` se necessário.

## 4. Mantém compatibilidade

- A lógica de revisão espaçada (`flashcard_reviews`) continua igual; só muda a navegação.
- A página do professor (`/app/professor/flashcards`) continua funcionando para cards "soltos" (sem deck) por enquanto, mas ganha um aviso "Use o admin de decks para o novo layout".

## Entrega

Você vai ter, no admin: aba **Flashcards** → lista de decks → editor de deck com upload de capa e cards Pergunta/Resposta. E o aluno vai ver exatamente o fluxo das screenshots (lista → capa → pergunta → resposta com feedback).

Posso seguir?
