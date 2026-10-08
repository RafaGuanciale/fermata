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

- **Treino de leitura** com dois modos: notas soltas (sequência gerada com movimentos curtos, como numa melodia) e música (Ode à Alegria)
- Feedback a cada nota: acerto com o tempo de reação, ou erro com a nota tocada e a esperada
- Três formas de tocar, que viram o mesmo evento: piano pelo cabo USB (Web MIDI), clique nas teclas da tela e teclado do computador (A = Dó, S = Ré…)
- Opção de esconder ou mostrar o nome das notas
- **Hoje:** treino sugerido e evolução (minutos na semana, tempo para achar a nota, acertos de primeira, nota que você mais erra)
- Tema escuro por padrão, com tema claro
- Tudo salvo no próprio navegador (IndexedDB), sem conta e sem servidor por enquanto

### Próximas fases

| Fase | O quê |
| --- | --- |
| 3 | Testar o MIDI com o piano real (Tomate MSC-A2) |
| 4 | Repertório: peças com PDF, filtros em botões que abrem painéis (tema, gênero, músicos, nível, estado) |
| 5 | Estudo (acordes, escalas, campo harmônico) e Progresso |
| depois | Treino com metrônomo, clave de fá, login e sincronização |

## Integração com o piano (Web MIDI)

O navegador lê o piano pela [Web MIDI API](https://developer.mozilla.org/docs/Web/API/Web_MIDI_API), disponível no Chrome e no Edge.

1. Ligue o piano ao computador pelo cabo USB.
2. Abra o treino e clique em **Conectar teclado**. O navegador pede permissão uma vez.
3. Cada tecla abaixada chega como mensagem `note on` (`0x9n`, nota, força). Força zero conta como tecla solta e é ignorada.

O código está em `src/input/useNoteInput.ts`. O treino nunca sabe de onde veio a nota: MIDI, tela e teclado do computador chamam a mesma função.

## Tecnologias e técnicas utilizadas

- React 19 + TypeScript + Vite
- React Router v6
- Dexie (IndexedDB) e `dexie-react-hooks` para a tela atualizar sozinha quando um treino é salvo
- Vitest para os testes da lógica
- CSS puro com BEM e tokens em variáveis CSS; cores derivadas com `color-mix()`
- Fontes: Cinzel (logotipo), Playfair Display (títulos), Montserrat (texto), Noto Music (clave)

### Estrutura e boas práticas

```
src/
  music/       notas (MIDI → nome, posição na pauta) e geração de exercícios
  drill/       estado do treino como função pura (estado, ação) → estado
  input/       entrada de notas: MIDI, tela e teclado do computador
  db/          banco local (Dexie) e cálculo das métricas de evolução
  components/  teclado, pauta, feedback, cartão de métrica, navegação
  pages/       Hoje, Treino e páginas das próximas fases
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
- Únicos recursos externos: as fontes do Google Fonts.
- Quando houver login e servidor, entram aqui: autenticação, validação de entrada, limite de requisições e a política de privacidade (LGPD), seguindo o que já foi feito no Permana.

## Autor

Rafael Guanciale Nacarato
