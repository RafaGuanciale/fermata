# Protocolo: como construir uma unidade do curso

Leia inteiro antes de começar. O curso é o coração do Estudo no Fermata. O aluno é o Rafael: adulto iniciante, autodidata, em São Paulo, piano digital de 88 teclas por MIDI, acostumado ao formato bootcamp (1 hora por tema). Ele quer **teoria em texto de verdade** (não só exercícios) e **exercícios no teclado que desafiem**, por exemplo: "toque Dó maior, depois Ré menor…", e não só cliques.

## Fontes

- `docs/curso/PLANO.md`: a pesquisa completa. A seção "O currículo lição a lição" tem, para cada unidade, a tabela de lições (título, teoria, prática com códigos de exercício, critério). O catálogo de 33 tipos de exercício (A1…R1) e a tabela de repertório por nível também estão lá. **Siga a tabela da unidade**; adapte só o que o motor não mede (ver "Limites").
- `src/course/units/u01.ts`: a Unidade 1 pronta. É o modelo de tom, tamanho e estrutura. Copie o estilo.
- `src/course/types.ts`: o formato dos dados (Unit, Lesson, Block, Exercise, Item, SongSpec).
- `src/course/gens.ts`: geradores prontos (findNote, findAll, findExact, readNote, intervalAbove, playChord + parseChord, degreeByEar, cadence, echo, choice, mix, fingerNote, direction, stepOrLeap).
- `src/course/tasks.ts`: tarefas no tempo (melodyTask, rhythmTask, randomRhythm, twoHandTask).

## O que entregar por unidade

Um arquivo `src/course/units/uNN.ts` (NN com dois dígitos) com `export default` de uma `Unit`. A lista de unidades pega o arquivo sozinha (`import.meta.glob`), não edite `src/course/index.ts`.

Cada lição tem:

1. `objectives`: 2 a 4 frases "Consigo…", mensuráveis.
2. `blocks` em ordem de leitura, alternando teoria e prática:
   - `text` com título: **8 a 12 minutos de leitura no total da lição**, em seções curtas (conceito, regra, por que soa assim). Escreva como um bom professor: claro, concreto, com exemplos no teclado (nomes de notas reais). Cada seção de texto deve levar a um exercício logo depois.
   - `callout` (erro comum, por que soa assim, dica, saúde) quando ajuda. Pelo menos um "erro comum" por lição.
   - `keys` (teclado ilustrado) para mostrar formas e posições.
   - `example` (exemplo resolvido): 2 a 4 passos que o app toca e acende no teclado. Obrigatório quando há construção (acorde, escala, intervalo, cadência).
   - `exercise` (prática guiada, com dicas): 3 a 6 por lição, variados. Pelo menos um exercício **de produção no teclado** que desafie (construir acorde, intervalo, escala, transpor, tocar no tempo), não só reconhecer. Ids estáveis e únicos: `lNN-algo`.
   - `song`: música da unidade para tocar no estúdio (popup "Tocar a música", com partitura, cascata e modo Estudar).
3. `review`: 1 a 4 geradores de itens curtos desta lição. Eles voltam no aquecimento das lições seguintes (revisão espaçada). Prefira itens respondidos tocando; `choice` só para conceito que não se toca.
4. `checkpoint`: 1 a 3 exercícios **sem dicas**, instâncias novas, misturando 1 ou 2 habilidades antigas. Portão: 85% (use o critério da tabela do PLANO quando ele for mensurável). Lição só conclui passando.
5. `project` (mini-projeto) na última lição da unidade, e opcional nas outras: briefing, passos, rubrica e, se der, um exercício que meça parte dele.
6. `exit`: 2 ou 3 geradores rápidos (ticket de saída).

Cada unidade tem `songs` (todas as músicas usadas) e `final` (o projeto final: a música que fecha o módulo). **Projetos finais pedidos pelo Rafael** (domínio público, arranjo seu, simplificado para o nível):

| Unidade | Projeto final |
|---|---|
| 1 | Ode to Joy (pronto) |
| 2 | Ode to Joy com mão esquerda, ou uma peça de método de 16 compassos (Reinagle/Beyer) |
| 3 | Amazing Grace com acordes (cifra I–IV–V7) |
| 4 | Canon in D (Pachelbel), simplificado com baixo e acordes |
| 5 | Für Elise, tema A (Lá menor) |
| 6 | Uma canção em I–V–vi–IV pela cifra (arranjo próprio, melodia original ou folclórica) |
| 7 | Prelude in C, BWV 846 (Bach), primeiros 8 compassos simplificados |
| 8 | The Entertainer (Joplin) simplificado + blues de 12 compassos |
| 9 | Minuet in G, BWV Anh. 114 |
| 10 | Clementi, Sonatina Op. 36 nº 1, 1º movimento (trecho) |
| 11 | Odeon (Ernesto Nazareth, 1909), simplificado, com groove brasileiro na mão esquerda. Não use músicas protegidas (Asa Branca e bossa nova são protegidas) |
| 12 | Gymnopédie nº 1 (Satie) + arranjo próprio |

Regras das músicas:
- **Só domínio público** (compositor morto há mais de 70 anos e obra publicada antes de 1929) ou melodia folclórica, sempre num arranjo escrito por você. Nunca transcreva uma edição moderna nem música protegida.
- Escreva em `SongSpec`: `right` e `left` por compasso separados por `|`, notas "C4", "F#4", "Bb3", duração após ":" (semínima = 1), "r" pausa, acorde "C3+E3+G3:4". O teste confere se cada compasso soma certo e se as mãos têm o mesmo número de compassos.
- Simplifique para o nível da unidade (mãos, extensão, figuras que já foram ensinadas). Diga em `arrangement` o que foi simplificado.
- `bpm` = andamento alvo para passar (modesto: o aluno é iniciante), `hands` = mãos exigidas, `pass.accuracy` = 0,85 (ou 0,9 em peças curtas).

## Limites do motor (adapte, não invente feature sem testar)

O motor mede: notas e acordes (com baixo/inversão), sequências, tempo (janelas em ms), legato/staccato pelo soltar das teclas, força (velocity, com calibração), improviso (notas no conjunto, pausas, nota final, notas-alvo), perguntas de escolha, pedal (CC64: direto e legato; com duas mãos, a troca conta só nos ataques da esquerda), condução de vozes (`lead`), 5ª e 8ª paralelas com o baixo no estilo coral, equilíbrio entre as mãos (`balance`), uniformidade (`evenness`), swing (`swingTask`).
O motor **não** mede ainda: dedilhado, postura, simultaneidade fina de acordes no tempo (E4), voicing (topo mais forte que o resto). Para esses, use o exercício mais próximo (por exemplo, um acorde por vez com `playChord`, ou `items` com sequência de acordes exigindo o baixo) e explique a parte não medida no texto ou na rubrica do projeto.
Se precisar de um tipo de exercício novo, só crie se couber em poucas horas, com função pura em `src/course/judge.ts` ou `gens.ts` **e teste** em `src/course/course.test.ts`. O pedal (CC64) é o primeiro candidato (Unidade 3): exige ler `0xB0 64` em `parseMidiMessage`/`NoteInputProvider` sem quebrar o resto.

## Lições da revisão das unidades 2 a 9 (obrigatório)

Uma revisão independente achou estes erros repetidos. Não os repita:

- **Quiz:** as opções são embaralhadas pelo motor; escreva a certa em `answer` sem se preocupar com a posição. **Nunca cobre num quiz o que só a lição seguinte ensina.**
- **Pauta:** desenha acordes empilhados (melodias com "C4+E4+G4"), ligaduras (`~` em `tiedMelodyTask`), armadura e acidentes. Em tarefas de duas mãos, a pauta mostra só a direita: **escreva na legenda (`caption`) o que a esquerda toca**, compasso a compasso, quando não for óbvio.
- **Tons com bemol:** passe `fifths: -1` (Fá), `-2` (Si♭) etc. em toda tarefa e música no tom, senão a pauta escreve Lá♯ no lugar de Si♭.
- **Duas mãos nunca na mesma tecla ao mesmo tempo** (comping, cânone, acompanhamento): uma tecla presa não pode ser atacada de novo.
- **Músicas (`SongSpec`):** não há ligadura entre compassos; uma nota longa que atravessa a barra vira nota + pausa, não duas notas iguais.
- **Escalas:** sobem 8 notas e descem sem repetir a de cima; a tônica final fecha o compasso.
- **Checkpoints de itens** contam o item inteiro: 1 erro numa escala zera o item. Com 6 a 10 itens, deixe a meta perdoar um (por exemplo, 10 itens a 0,9).
- **Números do texto = números do exercício:** BPM, passadas (`reps`), janelas, metas. Se o texto diz "60 BPM", a tarefa roda a 60 BPM.
- **Dedilhados e fatos:** confira duas vezes (dedilhado de cromática, de tríades quebradas, de escalas de 2 oitavas; inversões; nomes de cadência). Um erro aqui ensina errado.
- **Projeto final:** prepare as dificuldades da música numa lição antes (um texto curto e um ou dois exercícios de trechos).
- **Pelo menos um callout de erro comum por lição.**
- O robô (`src/course/playthrough.test.ts`) toca a resposta certa de todo exercício: se ele falhar, o exercício é impossível. Rode `npm test` e conserte o conteúdo, não o robô.

## Regras dos exercícios (auditoria de 2026-10-12, obrigatório)

- Janela de tempo de pelo menos ±50 ms (o atraso do cabo e da calibração come o resto). O teste `exercises.test.ts` cobra.
- Meta em número inteiro: rodadas de perguntas aceitam um erro quando a meta não é 100% (`needCount` arredonda: 85% de 6 = 5). Não escreva rodada de 3 perguntas com meta abaixo de 100% esperando que aceite erro.
- Todo exercício no tempo mostra a linha "O que conta" (`rulesLine`), com a explicação de legato, uniformidade, pedal, dinâmica. O enunciado não precisa repetir, mas não pode contradizer.
- O resultado sempre diz o motivo real da reprovação ("99% no tempo, mas faltou o legato") e fica na tela quando o exercício reinicia (BPM novo, desenho novo).
- O teclado do exercício mostra a tecla apertada na hora (`pressed`); dica e "onde tocar" são contorno (`next`); notas achadas são cheias (`lit`).
- Treino nunca é decoreba: todo aquecimento e todo item de técnica sorteiam tom, desenho, ordem ou progressão a cada passada (o teste "todo aquecimento e toda técnica mudam" cobra), e cada degrau da escada de BPM traz um desenho novo.

## Estilo do texto (obrigatório)

- PT-BR, "você", frases curtas, sem emoji, vírgula decimal, número com unidade ("72 BPM", "2 tempos").
- Nomes em português com a cifra quando ajudar: "Sol (G)", "Fá♯", "Si♭". Use ♯ e ♭ no texto, `#` e `b` só no código das notas.
- Nada de encher linguiça: cada parágrafo ensina algo que vai ser usado no exercício seguinte.
- Fatos de teoria corretos. Na dúvida, prefira a formulação do PLANO.

## Passo a passo de uma rodada

1. Clone e prepare: `npm ci`.
2. Leia `docs/curso/STATUS.md`. Escolha a primeira unidade "a fazer" (ou "em construção" há mais de 3 horas). Marque "em construção" com data e hora, faça commit e push **antes** de escrever (assim duas rodadas não pegam a mesma unidade).
3. Leia a tabela da unidade no PLANO e o `u01.ts`.
4. Escreva `uNN.ts`. Comece pelas músicas e pelo esqueleto das lições; depois o texto e os exercícios lição por lição. **Faça commit e push a cada 2 ou 3 lições prontas** (com a unidade exportando só as lições prontas; a unidade fica visível no app com as lições que tiver). Assim um corte no limite de uso perde pouco.
5. Antes de cada push: `npm run typecheck && npx eslint src --quiet && npm test && npm run build`. Tudo verde, sempre. Nunca faça push quebrado: isso derruba o app em produção (a Vercel publica a cada push).
6. Fim: STATUS "pronta" + uma linha no Diário (o que entrou, o que ficou de fora e por quê). Commit e push.
7. Sobrou limite de uso? Comece a próxima unidade "a fazer" seguindo o mesmo passo a passo.

Commit: `git add -A && git commit -m "feat(curso): unidade N — <o que entrou>"` com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; depois `git pull --rebase origin main && git push origin main` (conflito: pull --rebase de novo, até 2 vezes; nunca force push).

Não mexa em código fora de `src/course/` sem necessidade. Se mexer (por exemplo, para o pedal), teste o que já existia.
