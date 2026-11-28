# Músicas do curso: a música carrega a lição

Decisão de 27/11/2026, depois do Rafael chegar na unidade 3: o curso ensinava muita teoria e pouca música (cerca de 440 exercícios e só 13 músicas conhecidas em 100 lições, quase todas em trecho, e uma dúzia de melodias inventadas pelo app). A partir daqui, **cada lição existe para tocar uma ou mais músicas conhecidas**. A teoria e os exercícios são o caminho até elas.

## Regras

1. **Toda lição tem `music`** (`Lesson.music` em `src/course/types.ts`): de uma a quatro músicas, mostradas logo no começo da lição (página e modo foco) e listadas na página da unidade ("O que você vai tocar"). O `why` diz, em uma ou duas frases, o que aquela música tem a ver com a lição.
2. **Música conhecida, não inventada.** O Rafael gosta de clássicos (Beethoven, Mozart, Bach, Chopin, Debussy, Paganini), ópera (Pavarotti, Bocelli), Elvis, Beatles, rock clássico, trilhas de filme e Disney clássica. Não usar cantigas infantis nem melodias originais do app como música da lição. As originais que já existem ficam só como material de exercício.
3. **Domínio público vai no código** (`SongSpec` na unidade), com as notas **conferidas numa fonte** (Mutopia Project, IMSLP, corpus do music21, uma transcrição ABC identificada), nunca de memória. O comentário acima da música diz a fonte e o que o arranjo mudou. Simplificações valem, desde que respeitem "um conceito por vez": antes da lição 20 nada de colcheia, antes da 29 nada de semínima pontuada (vira duas semínimas ou os valores dobram), e assim por diante.
4. **Música protegida nunca vai no código** (o repositório é público e o site também). Ela entra no catálogo `src/course/pieces.ts` (só título, artista, trecho, tipo e o texto da busca no MuseScore) e a lição usa `{ piece: 'id', why }`. O Rafael importa o MusicXML no Repertório; a lição acha a música pelo título (ou por um apelido) e mostra "Tocar junto". Sem a partitura, o cartão mostra "Pôr no repertório", "Importar a partitura" e "Procurar no MuseScore".
5. **A mesma música pode voltar mais difícil**: Eine kleine Nachtmusik em Dó com valores dobrados (lição 18), no ritmo original (20) e no tom original (21); Moonlight Sonata fácil (39) e original (77). Isso é progresso visível, não repetição.
6. **Lista para o Rafael**: quando uma unidade nova ganhar músicas protegidas, avise a lista no formato "Música (artista) - Partitura - XML".

## Mapa por lição

Unidades 3 e 4: feitas. Unidades 5 a 12: a fazer (as rodadas seguem este mapa). "App" = domínio público, no código; "importar" = protegida, no catálogo.

| Unidade | Lição | Música | Fonte | Foco |
|---|---|---|---|---|
| 3 | 17 | Jingle Bells | App | Acordes C, F e G |
| 3 | 18 | Eine kleine Nachtmusik, em Dó (valores dobrados) | App | I–V7–I quebrado |
| 3 | 18 | La donna è mobile (Verdi) | App, **pendente** (corpus do music21, `verdi/laDonnaEMobile.mxl`) | I–V7 no acompanhamento |
| 3 | 19 | Jingle Bells, com acordes | App | I–IV–V7 e cifra |
| 3 | 20 | Eine kleine Nachtmusik, no ritmo original | App | Colcheias |
| 3 | 20 | William Tell Overture, galope (Rossini) | App, **pendente** (falta fonte aberta) | Colcheias em staccato |
| 3 | 21 | Eine kleine Nachtmusik, em Sol · Love Me Do | App · importar | Tom de Sol |
| 3 | 22 | Silent Night · Love Me Tender | App · importar | Pedal direto |
| 3 | 24 | Amazing Grace · Jingle Bells em Sol e em Fá | App | Projeto e três tons |
| 4 | 25–26 | Joy to the World | App | Escala e polegar |
| 4 | 27 | Hey Jude | importar | Armadura de Fá |
| 4 | 28–29 | Let It Be | importar | vi grau (Am) e síncope |
| 4 | 29 | Raiders March · Seven Nation Army · Under the Sea | importar | Pontuada e síncope |
| 4 | 30 | Canon in D · Jurassic Park Theme | App · importar | Pedal legato |
| 4 | 31 | Blues em Dó · Hound Dog · Johnny B. Goode | App · importar | Blues de 12 compassos |
| 4 | 32 | Ode to Joy em Ré · Canon in D | App | Ré maior |
| 4 | 33 | Canon, Eine kleine em Sol, Let It Be, Hound Dog | — | Marco 1: recital |
| 5 | 34 | Swan Lake (tema) · Imperial March | App · importar | Menor natural |
| 5 | 35 | Für Elise (tema A) · Caprice nº 24 (Paganini, tema) · Love Theme de The Godfather | App (Mutopia tem os dois) · importar | Menor harmônica |
| 5 | 36–37 | Star Wars e Jaws (motivos) · Smoke on the Water | importar | Intervalos |
| 5 | 38 | Zombie · Caruso · The Final Countdown | importar | Acordes menores |
| 5 | 39 | Moonlight Sonata, arranjo fácil · Star Wars Main Theme | App (DCML/Mutopia) · importar | Tercinas |
| 5 | 41 | Game of Thrones Theme · Für Elise A + Moonlight fácil | importar · App | Projeto |
| 6 | 43 | Canon in D, completo | App | Inversões |
| 6 | 44 | Can You Feel the Love Tonight | importar | Condução com inversões |
| 6 | 45 | Jump | importar | Acordes sus |
| 6 | 46 | Can't Help Falling in Love · He's a Pirate · Funiculì, Funiculà · Lacrimosa (Mozart) | importar · App | Compasso composto |
| 6 | 47 | Interstellar · Con te partirò · Imagine | importar | Melodia sobre acompanhamento |
| 6 | 48 | Hedwig's Theme | importar | Cromatismo |
| 7 | 50 | Canon in D, analisado | App | Campo harmônico |
| 7 | 52 | Stand By Me · Beauty and the Beast | importar | Funções |
| 7 | 56 | O sole mio · Once Upon a Dream · Minuet in G | App · importar · App | Frase e período |
| 7 | 57 | Prelude in C (Bach), completo | App (Mutopia) | Projeto |
| 8 | 58 | Gymnopédie No. 1, início | App (já em `public/library`) | Tétrades |
| 8 | 59–60 | When You Wish Upon a Star | importar | Tétrades |
| 8 | 61 | Sweet Child O' Mine (intro) | importar | Arpejos |
| 8 | 62 | Great Balls of Fire · You've Got a Friend in Me | importar | Swing |
| 8 | 63 | Another One Bites the Dust (riff do baixo) | importar | Pentatônica |
| 8 | 65 | The Entertainer, tema A | App | Marco 2 |
| 9 | 67 | Nessun dorma · Sonata K. 545 | App (Mutopia tem a K. 545) | Melodia sobre acompanhamento, Alberti |
| 9 | 70 | Rondo alla Turca (tema) | App (Mutopia) | Ornamentos |
| 9 | 71 | Minuet in G · Musette in D | App | Duas vozes |
| 9 | 72 | The Entertainer, completo | App (Mutopia) | Saltos |
| 9 | 73 | Für Elise, completa | App (`public/library`) | Projeto |
| 10 | 77 | Moonlight Sonata, 1º movimento original · Toccata and Fugue in D minor (abertura) | App (`public/library`, Mutopia) | Diminutos, napolitano |
| 10 | 80 | A Whole New World | importar | Modulação |
| 11 | — | **a decidir com o Rafael**: músicas brasileiras famosas (Tico-Tico no Fubá, Aquarela do Brasil) ou jazz e pop com voicings modernos | — | — |
| 12 | 91 | Bohemian Rhapsody (balada) | importar | Arranjo solo |
| 12 | 94 | Prelúdio Op. 28 nº 4 (Chopin) | App (Mutopia) | Pedal no romântico |
| 12 | 95 | Nocturne Op. 9 nº 2 · Clair de lune (abertura) · Rhapsody on a Theme of Paganini, Var. 18 | App (Mutopia, `public/library`) · importar | Romântico e impressionista |
| 12 | 100 | Moonlight Sonata + Gymnopédie No. 1 + DAN DAN Kokoro Hikareteku; Clair de lune como meta | App · importar | Recital final |
