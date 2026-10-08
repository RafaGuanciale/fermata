# Fermata

Seu estúdio de piano: treino de leitura, repertório e teoria, para o que você estuda permanecer. **Um projeto Permana.**

## Sobre o projeto

O Fermata nasceu quando comecei a estudar piano, em outubro de 2026. Os sites que vinham com os cursos só deixavam buscar partitura por nome e nível, e nenhum deixava praticar a leitura de verdade, com alguém conferindo se a nota e o tempo estavam certos.

O nome vem do sinal de fermata, que manda sustentar a nota além do tempo. É a mesma ideia do Permana ("o que permanece"), dita em linguagem musical. O Fermata é uma marca endossada pelo Permana: mantém a tipografia e a lógica das seis cores, trocando o reseda green pelo azul petróleo e o bistre pelo ébano.

## Links

- Design system: Fermata (artefato no Claude)
- Telas: Fermata — Telas (artefato no Claude)
- Deploy: a definir (Vercel)

## Funcionalidades

- **Barra lateral em todas as páginas**: completa no notebook, só ícones no tablet, barra inferior no celular
- **Teclado fixo embaixo** com as 88 teclas do piano: acende o que você toca (MIDI, clique ou teclado do computador) e reconhece acordes maiores e menores. Dá para recolher
- **Treino de leitura** em modo imersivo (tela cheia): notas soltas de Dó a Sol ou Ode à Alegria, com feedback a cada nota e a pauta se ajustando ao tamanho da tela
- **Repertório** com categorias em cartões com foto (Filmes e séries, Clássico, Jazz, MPB e brasileira, Pop e rock, Jogos, Infantil) e a área **Músicos**, montada a partir dos compositores e artistas cadastrados
- Cadastro de peças com estado (quero aprender, aprendendo, aprendi, no repertório), nível, categorias e a **partitura em PDF ou foto**
- **Leitor de partitura** em tela cheia com zoom, igual no notebook, tablet e celular (PDF.js)
- **Estudo em seis módulos** (Teclado, Leitura, Ritmo, Acordes, Escalas, Harmonia), com lições marcáveis como aprendidas. Lições prontas: teclas e oitavas, clave de sol, tríades com inversões e escala maior, todas interativas com o piano
- **Hoje:** treino sugerido, peças que você está aprendendo e evolução (minutos, tempo para achar a nota, acertos de primeira, nota que mais erra)
- Tema escuro por padrão, com tema claro

### Onde ficam os dados e os PDFs

Por enquanto, tudo fica no navegador do aparelho (IndexedDB): treinos, peças, progresso das lições e os arquivos de partitura. O app pede ao navegador armazenamento persistente para que nada seja apagado quando faltar espaço.

A consequência é que cada aparelho tem o seu: o PDF subido no notebook não aparece no tablet. A próxima fase resolve isso com login e armazenamento na nuvem. Todas as operações do repertório passam por `src/repertoire/repo.ts`, então a troca acontece num lugar só.

### Próximas fases

| Fase | O quê |
| --- | --- |
| próxima | Login e sincronização entre notebook, tablet e celular (dados e PDFs na nuvem) |
| depois | Treino com metrônomo, clave de fá, mais lições, página de Progresso |

## Integração com o piano (Web MIDI)

O navegador lê o piano pela [Web MIDI API](https://developer.mozilla.org/docs/Web/API/Web_MIDI_API), disponível no Chrome e no Edge, inclusive no Chrome para Android. **Não funciona no Safari nem em nenhum navegador do iPhone/iPad**: lá o Fermata serve para ler partituras, estudar e treinar pela tela.

1. Ligue o piano ao computador pelo cabo USB.
2. Clique em **Conectar piano** no teclado fixo. O navegador pede permissão uma vez; nas próximas visitas o app reconecta sozinho.
3. Cada tecla abaixada chega como mensagem `note on` (`0x9n`, nota, força). Força zero conta como tecla solta e é ignorada.

O código está em `src/input/NoteInputProvider.tsx`. Todas as telas ouvem o mesmo evento de nota, sem saber se veio do MIDI, da tela ou do teclado do computador.

## Tecnologias e técnicas utilizadas

- React 19 + TypeScript + Vite
- React Router v6
- Dexie (IndexedDB) e `dexie-react-hooks` para a tela atualizar sozinha quando um treino é salvo
- PDF.js para mostrar as partituras
- Vitest para os testes da lógica
- CSS puro com BEM e tokens em variáveis CSS; cores derivadas com `color-mix()`
- Fontes: Cinzel (logotipo), Playfair Display (títulos), Montserrat (texto), Noto Music (clave)

### Estrutura e boas práticas

```
src/
  brand/       logotipo (moeda com F, no desenho do Permana)
  music/       notas, acordes, escalas e geração de exercícios
  drill/       estado do treino como função pura (estado, ação) → estado
  input/       entrada de notas: MIDI, tela e teclado do computador
  db/          banco local (Dexie) e métricas de evolução
  repertoire/  categorias, busca, músicos e operações do repertório
  study/       módulos, lições e o conteúdo de cada lição
  media/       fotos das categorias e módulos
  components/  teclado, pauta, cartões com foto, navegação
  pages/       uma por tela
  styles/      um arquivo por bloco BEM, todos importados em index.css
```

- Toda a lógica que decide algo (nome de nota, posição na pauta, acerto, métricas) é função pura e tem teste.
- CSS só entra pelo `index.css`, nunca importado dentro de componentes.
- BEM `bloco__elemento` com modificador de um hífen (`button-primary`).
- Seis cores-base; qualquer outra cor é `color-mix()` delas.

### Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes da lógica
npm run build      # checa tipos e gera dist/
```

## Segurança e privacidade

- Nenhum dado sai do computador: sessões e tentativas ficam no IndexedDB do navegador. Limpar os dados do site apaga o histórico.
- Não há login, chaves de API nem variáveis de ambiente.
- O acesso MIDI é pedido sem `sysex`, então o site só lê notas e não consegue mandar comandos ao piano.
- Recursos externos: fontes do Google Fonts e fotos do Unsplash (carregadas do CDN deles).
- Os PDFs não saem do aparelho e são abertos com PDF.js, sem executar scripts do arquivo.
- Quando houver login e servidor, entram aqui: autenticação, validação de entrada, limite de requisições e a política de privacidade (LGPD), seguindo o que já foi feito no Permana.

## Créditos das fotos

Fotos do [Unsplash](https://unsplash.com), sob a licença Unsplash. Os identificadores estão em `src/media/photos.ts`.

## Autor

Rafael Guanciale Nacarato
