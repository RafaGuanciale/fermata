# Status do curso

Uma linha por unidade. Quem constrói uma unidade marca "em construção" com a hora (e faz push) ANTES de começar, e "pronta" no fim.
Uma unidade "em construção" há mais de 3 horas foi abandonada (limite de uso): pode ser retomada.

| Unidade | Estado | Atualizado | Observação |
|---|---|---|---|
| 1 Teclado, pulso e postura | pronta | 2026-10-08 | escrita à mão na conversa; projeto final Ode à Alegria |
| 2 Pauta dupla e intervalos | pronta | 2026-10-09 01:23 | rodada agendada; projeto final Ode à Alegria com mão esquerda |
| 3 Primeiros acordes e cifra | pronta | 2026-10-09 01:37 | rodada agendada; projeto final Amazing Grace com acordes |
| 4 Escala maior e armaduras | pronta | 2026-10-09 01:52 | rodada agendada; projeto final Cânone em Ré; lição 33 = Marco 1 |
| 5 Modo menor e intervalos | a fazer | | |
| 6 Tríades, inversões e condução | a fazer | | |
| 7 Campo harmônico e funções | a fazer | | |
| 8 Tétrades, blues e improviso | a fazer | | |
| 9 Leitura clássica e textura | a fazer | | |
| 10 Harmonia cromática | a fazer | | |
| 11 Brasil ao piano | a fazer | | |
| 12 Arranjo, forma e repertório | a fazer | | |

## Diário

- 2026-10-08: motor das lições, Unidade 1 e projeto final publicados.
- 2026-10-09: Unidade 2 pronta (lições 9 a 16). Entrou: claves de Sol e Fá por âncoras, pauta dupla, intervalos de 2ª a 5ª (construir, ler na pauta e de ouvido), 3/4 com mínima pontuada, ligadura de prolongamento (nota a mais derruba a passada), anacruse, tom/semitom e acidentes, posição de Sol com Fá♯, mãos juntas com bordão, crescendo/diminuendo e pares ligados, transposição Dó → Sol (pauta em Dó, toca em Sol). Músicas: Ode à Alegria com mão esquerda (final, 80 BPM), 8 primeiros compassos, Valsinha em Dó (melodia original em 3/4). Motor: geradores intervalByEar, readInterval, toneOrSemitone; tarefas tiedMelodyTask e transposedTask; opção noExtras; a pauta agora desenha o ♯. Ficou de fora: curva de ligadura e de frase na pauta (o texto explica), assincronia fina entre as mãos (a janela de ±80 ms faz as vezes), a 2ª nota curta do par ligado (só ligação e volume são medidos), peça de Reinagle/Beyer (a final ficou a Ode com mão esquerda, opção prevista no PROTOCOLO).
- 2026-10-09: Unidade 3 pronta (lições 17 a 24). Entrou: acorde maior pela fórmula 4 + 3 (bloco e quebrado, desafio com Ré, Lá e Mi), I–V7–I com o trítono e a posição próxima (Si–Fá–Sol), IV e cifra (C, F, G7), harmonizar trechos de melodia, colcheias a 80 BPM, três padrões de mão esquerda (bloco, raiz com oitava, raiz e 5ª), tonalidades de Sol e Fá, transposição de progressões pelos graus, pedal direto medido pelo CC64, ditado de tônica, baixo e progressão. Músicas: Mary Had a Little Lamb, Brilha brilha estrelinha em Dó, Sol e Fá, Amazing Grace (final, 3/4 com anacruse). Motor: acorde com 5ª opcional, pedal (parsePedalMessage no NoteInputProvider, pedalScore, opção pedal), geradores primaryChord, resolveCadence, harmonize, progressionByEar, tonicByEar, transposeProgression. Ficou de fora: simultaneidade fina do acorde (E4: o app mede cada nota na janela, não a dispersão <50 ms) e trocas por minuto (virou tarefa no tempo com janela de ±80 ms); "Parabéns" trocado por Brilha brilha (domínio público garantido); linha do tempo do CC64 na tela (o resultado diz trocas com lama, pausas presas e acordes sem pedal).
- 2026-10-09: Unidade 4 pronta (lições 25 a 33). Entrou: escala maior por tetracordes (T T S T T T S), passagem do polegar com estudo em blocos (Fitch), uniformidade medida (IOI-SD até 40 ms), armaduras com Sol, Fá, Ré e Si♭ (a pauta agora desenha armadura, bemóis e bequadros), nomes dos graus e graus ao vivo em menos de 2 s, graus 1 a 6 de ouvido, semínima pontuada, síncope e contratempo, pedal legato (troca até 250 ms depois do ataque, troca antecipada derruba), escala em movimento contrário e paralelo, blues de 12 compassos, círculo de quintas (armadura → tônica tocando), primeira vista gerada, Marco 1 com checkpoint cumulativo de 30 itens e mini-recital. Músicas: Cânone em Ré (final), Ode à Alegria com ritmo original, Sincopado (melodia original), Blues em Dó. Ficou de fora: assincronia entre as mãos na escala (só a janela de ±60 a 80 ms), peça de Reinagle no recital (não transcrevi de memória; o Cânone ocupa o lugar da peça clássica), comparação automática com a gravação da lição 1 (fica na autoavaliação).
