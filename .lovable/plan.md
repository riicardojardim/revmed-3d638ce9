## Objetivo

Transformar a entrada "Salas" em uma central de checklists/simulados parecida com a referência (Pense Revalida), onde o usuário pode:

1. Buscar e iniciar um checklist (estação) individual
2. Criar um **Simulado** combinando vários checklists em sequência
3. Só avançar pro próximo checklist do simulado quando o PEP do atual estiver 100% preenchido

---

## Mudanças

### 1. Nova tela "Central de Estações" (substitui o destino atual de "Salas")

Layout em duas colunas igual à referência:

- **Esquerda** — "Buscar um checklist"
  - Campo de busca por tema
  - Lista "Sugestões de Temas" (5–8 estações) com colunas: Tema · Realizado · Média do resultado · Ação "Iniciar"
  - Badge colorido com a especialidade (PE, CR, PR, etc.)
- **Direita** — Painel "Opções"
  - Indicador "X checklists atualizados"
  - Botão **Todos os Checklists** → abre listagem completa filtrável
  - Botão **Criar Simulado** → abre o builder

A sidebar "Salas" passa a apontar pra essa rota. As salas de treino multi-participante (atual `/app/sala/...`) continuam funcionando — só muda o destino do link do menu.

### 2. Builder de Simulado

Modal/página onde o usuário:

- Dá um nome ao simulado
- Seleciona N checklists (checkbox na lista, com busca/filtro)
- Define ordem (drag-to-reorder ou ordem de seleção)
- Clica "Iniciar Simulado"

### 3. Execução do Simulado (regra de bloqueio)

- Roda os checklists na ordem escolhida, um de cada vez, usando a mesma tela de PEP atual
- Barra de progresso no topo: "Estação 2 de 5"
- Botão **Próxima estação** fica **desabilitado** enquanto houver itens do PEP sem nota
  - Tooltip: "Preencha todos os itens do PEP para avançar"
- Ao terminar a última, mostra tela de resumo (nota por estação + nota total)

### 4. Persistência

Nova tabela `simulados`:

- `name`, `station_ids` (array em ordem), `current_index`, `status` (em_andamento/concluido), `scores` (jsonb), `created_by`

RLS: dono enxerga/edita os seus.

---

## Detalhes técnicos

- Rota nova: `src/routes/app.checklists.tsx` (central)
- Rota nova: `src/routes/app.simulado.$id.tsx` (execução)
- Componente: `SimuladoBuilder` (modal)
- Reaproveita `loadStation` e o componente de PEP já existente em `app.sala.$code.paciente.tsx` — extraindo a parte do checklist para um componente compartilhado `<StationChecklist />`
- Regra de "PEP completo": todos os `checks[itemId]` definidos (já temos `totals.scored === totals.count`)
- Migration nova pra tabela `simulados`

---

## Antes de eu começar

Confirma 3 coisas pra eu não errar o escopo:

1. **"Salas" no menu** deve passar a abrir a nova central, **substituindo** a tela atual de criar sala de treino com participantes? Ou a sala de treino continua acessível por outro lugar?
2. O **Simulado** é individual (só o usuário sozinho) ou também precisa suportar multi-participante (ator/candidato como nas salas atuais)?
3. Por enquanto posso começar usando as estações já existentes (mock + `custom_stations`) como a fonte da listagem, certo?