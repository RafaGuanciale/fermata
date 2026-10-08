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
- **Treino de leitura** num popup com moldura por cima do app: notas soltas de Dó a Sol ou Ode à Alegria, com feedback a cada nota, a pauta se ajustando ao tamanho da tela e opção de teclado inteiro (88 teclas)
- **Treino com metodologia**: caminho em 5 fases com treinos e prova (Fase 1 pronta), aquecimento diário por nível que sobe quando fica fácil, leitura à primeira vista por nível, treino no tempo com contagem, notas pintadas por precisão (no tempo, fora do tempo, erro), escada de BPM automática e ajuste do atraso do piano
- **Metrônomo** no rodapé do teclado e dentro do treino e da partitura: BPM de 30 a 240, botões de ±1 e ±5, bater o tempo, 2, 3, 4 ou 6 tempos com acento no primeiro. Continua tocando quando você troca de página
- **Login com a conta Permana** e sincronização entre aparelhos: repertório, partituras, progresso no Estudo e histórico dos treinos
- **Repertório** com categorias em cartões com foto (Filmes e séries, Clássico, Jazz, MPB e brasileira, Pop e rock, Jogos, Infantil) e a área **Músicos**, montada a partir dos compositores e artistas cadastrados
- Cadastro de peças com estado (quero aprender, aprendendo, aprendi, no repertório), nível, categorias e a **partitura em PDF ou foto**
- **Leitor de partitura** em tela cheia com zoom, igual no notebook, tablet e celular (PDF.js)
- **Estudo em seis módulos** (Teclado, Leitura, Ritmo, Acordes, Escalas, Harmonia), com lições marcáveis como aprendidas. Lições prontas: teclas e oitavas, clave de sol, tríades com inversões e escala maior, todas interativas com o piano
- **Hoje:** treino sugerido, peças que você está aprendendo e evolução (minutos, tempo para achar a nota, acertos de primeira, nota que mais erra)
- Tema escuro por padrão, com tema claro

### Onde ficam os dados e os PDFs

O app sempre lê e grava no navegador (IndexedDB), então funciona sem internet e sem login.

Com login, as mudanças sobem para a nuvem e descem nos outros aparelhos:

- **Dados** (peças, lições, treinos): banco `fermata` no mesmo MongoDB Atlas do Permana, separado dos dados do Permana. Vale a alteração mais recente.
- **Partituras**: loja privada do Vercel Blob. O arquivo vai do navegador direto para o Blob, sem passar pela função. Nos outros aparelhos ele só baixa na primeira vez que você abre.

As telas não sabem que a nuvem existe: hooks do Dexie em `src/sync/engine.ts` marcam cada gravação e põem numa fila, que sobe alguns segundos depois, ao voltar para a aba, ao reconectar e a cada 2 minutos.

### Login com a conta Permana

O Fermata não tem cadastro próprio nem guarda senha. As funções da Vercel em `api/` repassam o login para o servidor do Permana (`POST /auth/login`) e, a cada chamada, confirmam de quem é o token perguntando ao próprio Permana (`GET /users/me`). Nada mudou no backend do Permana.

| Função | O que faz |
| --- | --- |
| `api/login.ts` | Repassa email e senha ao Permana e devolve token e perfil |
| `api/sync.ts` | Recebe as mudanças do aparelho e devolve as dos outros |
| `api/blob.ts` | Autoriza o envio de partitura e gera link temporário de leitura |

### Configuração na Vercel

1. **Storage → Create → Blob**, acesso **Private**, conectado ao projeto `fermata`. A Vercel adiciona sozinha as variáveis do Blob.
2. **Settings → Environment Variables**:
   - `MONGODB_URI`: a mesma string de conexão do Atlas usada no Permana (o Fermata usa o banco `fermata`)
   - `PERMANA_API_URL`: o endereço do backend do Permana, o mesmo do `VITE_API_URL` do front do Permana
3. No Atlas, **Network Access** precisa aceitar `0.0.0.0/0`, porque as funções da Vercel não têm IP fixo.
4. Novo deploy.

### Próximas fases

| Fase | O quê |
| --- | --- |
| próxima | Tocar e estudar as suas peças (MusicXML exportado do MuseScore), fases 2 a 5 do treino |
| depois | Mais lições no Estudo, página de Progresso |

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
api/           funções da Vercel: login, sincronização e partituras
src/
  brand/       logotipo (moeda com F, no desenho do Permana)
  music/       notas, acordes, escalas e geração de exercícios
  drill/       estado do treino como função pura (estado, ação) → estado
  input/       entrada de notas: MIDI, tela e teclado do computador
  db/          banco local (Dexie) e métricas de evolução
  sync/        conta Permana, fila de envio e sincronização com a nuvem
  metronome/   metrônomo (Web Audio) e contas de andamento
  training/    programa de treino (fases, aquecimento, leitura), julgamento no tempo, escada de BPM e regras de progresso
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

- Sem login, nenhum dado sai do aparelho.
- Com login, a senha vai direto para o servidor do Permana; o Fermata só guarda o token, como o próprio Permana faz.
- Toda função confere o token com o Permana antes de qualquer leitura ou gravação, e cada usuário só enxerga os próprios registros e a própria pasta no Blob.
- Partituras ficam numa loja privada: não existe link público, só links assinados que valem 10 minutos.
- Segredos (`MONGODB_URI`, credenciais do Blob) ficam só nas variáveis de ambiente da Vercel.
- O acesso MIDI é pedido sem `sysex`, então o site só lê notas e não consegue mandar comandos ao piano.
- Recursos externos: fontes do Google Fonts e fotos do Unsplash (carregadas do CDN deles).
- Os PDFs são abertos com PDF.js, sem executar scripts do arquivo.

## Créditos das fotos

Fotos do [Unsplash](https://unsplash.com), sob a licença Unsplash. Os identificadores estão em `src/media/photos.ts`.

## Autor

Rafael Guanciale Nacarato
