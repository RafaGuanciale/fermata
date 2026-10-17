# Fermata — guia para quem for mexer no código

App web pessoal de estudo de piano do Rafael. Marca endossada: "Fermata, um projeto Permana". Rafael não escreve o código: revisa funcionalidades e pede ajustes. Fale com ele em português (PT-BR), direto, explicando trade-offs.

## Regras do código

- React + TypeScript + Vite, React Router v6, Dexie (IndexedDB). O app é offline-first: telas leem e gravam só no Dexie.
- Backend: funções da Vercel em `api/` (TypeScript, imports relativos com `.js`, arquivos em `api/_lib` não viram rota). Login repassado ao Permana; dados no banco `fermata` do Atlas; partituras no Vercel Blob privado.
- Sincronização: `src/sync/engine.ts` instala hooks no Dexie (preenchem `uid` e `mt` e põem na fila `outbox`). Tabela nova que precise sincronizar entra em `SYNC_TABLES` (cliente e `api/_lib/protocol.ts`) e no mapa de campos locais de `src/sync/serialize.ts`.
- Metrônomo: um só, no `MetronomeProvider`; use `useMetronome()` para ler BPM e tempo atual.
- Treino: ligado ao curso. `src/course/track.ts` define, por unidade, aquecimento, técnica (escada de andamento que continua de onde parou, registros `tec-<id>` na tabela `runs`), leitura e ouvido; a página é `PracticeHubPage`. `src/training/timing.ts` julga passadas e faz a escada; `clickTrack.ts` agenda os cliques.
- Consulta: `src/reference/data.ts` (acordes, escalas, campo harmônico, intervalos, termos; puro e testado) e `ReferencePage`. A escolha fica na URL (`/consulta/acordes?raiz=F%23&tipo=m7`), então dá para linkar de uma lição.
- CSS: um arquivo por bloco em `src/styles/`, todos importados em `src/index.css`. Nunca importar CSS dentro de componente.
- BEM: `bloco__elemento`, modificador com um hífen (`button-primary`, `sideNav__link-active`).
- Cores: só as seis bases em `tokens.css` (`--color-champagne`, `--color-khaki`, `--color-off-white`, `--color-petrol`, `--color-ebony`, `--color-blush`). Todo o resto é token derivado com `color-mix()`. Nunca hex solto em componente.
- Tema escuro é o padrão; o claro é `data-theme="light"` no `<html>`. Testar os dois.
- Feedback de acerto é petróleo/azul, erro é blush, sempre com ícone e palavra (nunca verde para acerto).
- Lógica que decide algo vai em função pura com teste (`src/music`, `src/drill`, `src/db/stats.ts`). Componentes só desenham.
- Notas são números MIDI (Dó central = 60). Nomes em português ("Fá♯") e notação científica ("F♯4").
- Toda entrada de nota passa pelo `NoteInputProvider` (MIDI, clique, teclado do computador). Telas usam `useNoteInput()` (notas seguradas) ou `useNoteOn()`; nunca sabem a origem.
- Layout: barra lateral em todas as páginas (completa ≥1100px, ícones no tablet, barra inferior <720px) e o teclado fixo (`KeyboardDock`) embaixo. Treino e leitor de partitura abrem num popup com moldura (`ImmersiveFrame`) por cima da página de origem: o link passa `state={{ background: location }}` e o `App` desenha a página de fundo mais o popup. Tela cheia de verdade só pelo botão dentro do popup.
- Progresso: `src/progress/PracticeClock.tsx` grava os minutos na tabela `practice` (um registro por dia e aparelho), só onde vale (`practiceRoutes.ts`: onde se toca, minuto com nota; em lições e consulta, também o minuto lendo); `src/progress/stats.ts` calcula tudo o que a página mostra.
- Modo foco da lição: `src/pages/CourseFocusPage.tsx` (rota `/curso/foco/:n/:lessonId`, popup imersivo), passos montados por `src/course/focus.ts`; estado da lição compartilhado em `src/course/useLesson.ts` e partes em `src/course/ui/LessonParts.tsx`.
- Recompensas: `src/celebrate/` (estrelas e sequência em `rewards.ts`, som de piano em `sound.ts` com liga/desliga, faíscas e estrelas em `Celebrate.tsx`). Elegante, sem ranking nem punição; respeita "reduzir movimento".
- Curso (Estudo): conteúdo em `src/course/units/uNN.ts`, motor em `src/course/` (tipos, geradores, julgamento, progresso, telas em `ui/`). Como escrever uma unidade: `docs/curso/PROTOCOLO.md`; plano completo: `docs/curso/PLANO.md`; andamento: `docs/curso/STATUS.md`.
- Som do app ao vivo: `src/audio/LiveSound.tsx` (botão "Som do piano / Som do app" no teclado fixo) toca o que se toca, com força e pedal, por `startLiveNote` em `synth.ts`.
- Dedilhado: `src/music/fingering.ts` sugere o dedo de cada nota (programação dinâmica com as regras de Parncutt, mão esquerda espelhada). Arcade (`chartFingers`, opção "Dedos nas notas"), pauta dos exercícios (`src/course/fingers.ts`, junto com as dicas) e partitura (`src/score/fingering.ts`, só se o arquivo não trouxer dedilhado; opção "Dedos"). É sugestão automática: se mudar as regras, rode os testes de escalas e músicas conhecidas.
- Tocar livre e gravações: `/tocar` (`src/pages/FreePlayPage.tsx`, popup) mostra o acorde pelo nome (`identifyChord`), um rolo que sobe das teclas e grava. Gravação é MIDI, não áudio: tabela `recordings` (sincroniza), notas compactadas por `src/recording/take.ts` (puro e testado: captura, pedal, números, comparação, exportar .mid), `useRecorder` grava da entrada de notas, `repo.ts` guarda, `RecordingsPanel` lista, toca, baixa e compara duas. No Tocar a música, passada com 80% ou mais oferece "Guardar esta passada como marco" (com precisão, andamento e tempo médio); o botão Marcos mostra e compara os da música. Minutos no Tocar livre contam no total e ficam em `practice.free`.
- Trechos que voltam: `src/progress/weakSpots.ts` (puro e testado) transforma o trecho com mais erro de cada passada do Tocar junto (`weakFrom`/`weakTo`, e `from`/`to` do trecho tocado nos runs) numa fila de revisão em 1, 3, 7 e 14 dias. `ReviewSpots` mostra os que vencem no Hoje e todos no Progresso; o link abre a música já no trecho.
- Extras de treino: metrônomo que some (`gap` no `MetronomeProvider`, `src/metronome/pulse.ts` mede no Tocar livre se você adianta ou atrasa sem o clique); Ouvir e tocar de volta (`/treino/eco`, `src/ear/echo.ts`, frase cresce ao acertar, registro `eco` em runs); acompanhamento no Tocar livre (`src/backing/backing.ts` e `useBacking`: baixo e acordes em loop no andamento do metrônomo, com a escala para improvisar); aviso de pausa depois de 45 minutos seguidos (`src/progress/breaks.ts`, `BreakReminder`).
- Tela acesa: `KeepAwake` (Screen Wake Lock) impede o notebook de escurecer e suspender enquanto houve atividade no app (nota, clique, tecla) nos últimos 15 minutos e a aba está visível (`src/hooks/keepAwake.ts`). Tocar no piano MIDI não conta como atividade para o sistema; por isso existe.
- Som de piano: `src/audio/synth.ts` usa amostras do Salamander Grand Piano (CC BY 3.0) em `public/samples/piano`.
- Arcade: `src/arcade/arcade.ts` (puro e testado) faz o gráfico por dificuldade, julga, conta notas longas e o multiplicador. Fácil = a melodia inteira mais devagar (`makeEasy`: tira enfeites, desacelera até 50%, só corta notas se ainda ficar denso e nunca mais de 30%; se precisar cortar mais, a música fica sem fácil); médio = melodia no andamento original; difícil = melodia + baixo. Andamento nunca acima do original (as músicas do app usam o andamento das gravações de referência; `tempoScale` corrige MIDIs mais rápidos). Palcos (Descoberta, Alternativo, Principal) saem de `difficultyScore`, igual para músicas do app e importadas (`library.ts`). Toda música tem `title` e `artist`; nas importadas, `guessNames` tenta pelo nome do arquivo e a pessoa completa no menu. Músicas do app: `songs.ts` (escritas à mão, `bass` do mesmo tamanho) e `charts/*.json` (só melodia e baixo de MIDIs de obras em domínio público; `loadEasy` usa um arranjo fácil feito por gente). O repositório é público: música protegida entra só pelo "Importar MIDI" (`midi.ts`, tabela `arcadeMidi`, sincronizada só com a conta, em base64); nunca pôr no código notas ou arquivos de música protegida.
- Som das notas: `LiveSoundProvider` toca o que a pessoa toca em todas as telas, ligado por padrão a 30%; volume no `SoundButton` (rodapé do teclado e arcade).
- Na interface, a palavra é "música", não "peça" (o código ainda usa `Piece`).
- Repertório: telas nunca mexem no banco direto, passam por `src/repertoire/repo.ts` (é onde a nuvem vai entrar).
- Fotos: Unsplash, ids em `src/media/photos.ts`, sempre via `PhotoCard` (tem fallback se a foto não carregar).
- Responsivo de verdade: notebook, tablet (Rafael vai usar deitado) e celular. Testar 1440, 820 e 390 px de largura e também telas baixas: notebook 1366×657 e 1536×730, tablet deitado 1180×760 e 1024×700. Regras de altura ficam em `@media (max-height: 960px)` (e 700px) em cada bloco; popups de treino não podem rolar nesses tamanhos.
- Safari/iPad não tem Web MIDI: tudo precisa funcionar sem MIDI.
- Texto da interface: "você", frases curtas, sentença (não Title Case), vírgula decimal, número sempre com unidade. Sem emoji.
- Rafael achou as telas do design com informação demais: prefira menos elementos por tela.

## Antes de entregar

```bash
npm run typecheck && npm test && npm run build
```
