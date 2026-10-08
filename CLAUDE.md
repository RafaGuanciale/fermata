# Fermata — guia para quem for mexer no código

App web pessoal de estudo de piano do Rafael. Marca endossada: "Fermata, um projeto Permana". Rafael não escreve o código: revisa funcionalidades e pede ajustes. Fale com ele em português (PT-BR), direto, explicando trade-offs.

## Regras do código

- React + TypeScript + Vite, React Router v6, Dexie (IndexedDB). Sem backend por enquanto.
- CSS: um arquivo por bloco em `src/styles/`, todos importados em `src/index.css`. Nunca importar CSS dentro de componente.
- BEM: `bloco__elemento`, modificador com um hífen (`button-primary`, `sideNav__link-active`).
- Cores: só as seis bases em `tokens.css` (`--color-champagne`, `--color-khaki`, `--color-off-white`, `--color-petrol`, `--color-ebony`, `--color-blush`). Todo o resto é token derivado com `color-mix()`. Nunca hex solto em componente.
- Tema escuro é o padrão; o claro é `data-theme="light"` no `<html>`. Testar os dois.
- Feedback de acerto é petróleo/azul, erro é blush, sempre com ícone e palavra (nunca verde para acerto).
- Lógica que decide algo vai em função pura com teste (`src/music`, `src/drill`, `src/db/stats.ts`). Componentes só desenham.
- Notas são números MIDI (Dó central = 60). Nomes em português ("Fá♯") e notação científica ("F♯4").
- Toda entrada de nota passa por `useNoteInput` (MIDI, clique, teclado do computador). O treino não sabe a origem.
- Texto da interface: "você", frases curtas, sentença (não Title Case), vírgula decimal, número sempre com unidade. Sem emoji.
- Rafael achou as telas do design com informação demais: prefira menos elementos por tela.

## Antes de entregar

```bash
npm run typecheck && npm test && npm run build
```
