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
- Progresso: `src/progress/PracticeClock.tsx` grava os minutos tocados na tabela `practice` (um registro por dia e aparelho); `src/progress/stats.ts` calcula tudo o que a página mostra.
- Modo foco da lição: `src/pages/CourseFocusPage.tsx` (rota `/curso/foco/:n/:lessonId`, popup imersivo), passos montados por `src/course/focus.ts`; estado da lição compartilhado em `src/course/useLesson.ts` e partes em `src/course/ui/LessonParts.tsx`.
- Recompensas: `src/celebrate/` (estrelas e sequência em `rewards.ts`, som de piano em `sound.ts` com liga/desliga, faíscas e estrelas em `Celebrate.tsx`). Elegante, sem ranking nem punição; respeita "reduzir movimento".
- Curso (Estudo): conteúdo em `src/course/units/uNN.ts`, motor em `src/course/` (tipos, geradores, julgamento, progresso, telas em `ui/`). Como escrever uma unidade: `docs/curso/PROTOCOLO.md`; plano completo: `docs/curso/PLANO.md`; andamento: `docs/curso/STATUS.md`.
- Som de piano: `src/audio/synth.ts` usa amostras do Salamander Grand Piano (CC BY 3.0) em `public/samples/piano`.
- Na interface, a palavra é "música", não "peça" (o código ainda usa `Piece`).
- Repertório: telas nunca mexem no banco direto, passam por `src/repertoire/repo.ts` (é onde a nuvem vai entrar).
- Fotos: Unsplash, ids em `src/media/photos.ts`, sempre via `PhotoCard` (tem fallback se a foto não carregar).
- Responsivo de verdade: notebook, tablet (Rafael vai comprar um) e celular. Testar 1440, 820 e 390 px.
- Safari/iPad não tem Web MIDI: tudo precisa funcionar sem MIDI.
- Texto da interface: "você", frases curtas, sentença (não Title Case), vírgula decimal, número sempre com unidade. Sem emoji.
- Rafael achou as telas do design com informação demais: prefira menos elementos por tela.

## Antes de entregar

```bash
npm run typecheck && npm test && npm run build
```
