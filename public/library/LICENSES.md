# Partituras do caminho de repertório

As obras são todas de domínio público. Cada arquivo vem de uma edição digital com licença explícita.
Os arquivos foram convertidos para MusicXML compactado (.mxl) para o app tocar junto.

| Arquivo | Obra | Edição | Licença |
|---|---|---|---|
| `fur-elise.mxl` | Beethoven, Für Elise (WoO 59) | Mutopia Project, digitada por Stelios Samelis a partir da Breitkopf & Härtel (1888) | Domínio público |
| `gymnopedie-1.mxl` | Satie, Gymnopédie nº 1 | Mutopia Project, digitada por Evin Robertson a partir da edição Dover | Domínio público |
| `moonlight-sonata-1.mxl` | Beethoven, Sonata nº 14 op. 27 nº 2, 1º movimento | DCML, Distant Listening Corpus (EPFL), corpus `beethoven_piano_sonatas` | CC BY-NC-SA 4.0 |
| `clair-de-lune.mxl` | Debussy, Suite bergamasque, Clair de lune | DCML, Distant Listening Corpus (EPFL), corpus `debussy_suite_bergamasque` | CC BY-NC-SA 4.0 |

## O que foi mudado

- Mutopia (LilyPond): as notas (com a grafia, ligaduras de valor e apojaturas) foram extraídas pelo próprio LilyPond, com as repetições escritas por extenso, e montadas em MusicXML; conferidas nota a nota contra o MIDI que o LilyPond gera da mesma fonte. Ficaram de fora dinâmicas, ligaduras de expressão e pedal. Na Gymnopédie, os acordes da mão esquerda que a edição escreve ora na pauta de cima, ora na de baixo, foram todos para a pauta de baixo, para o app separar as mãos certo.
- DCML (MuseScore): o arquivo foi exportado em MusicXML pelo MuseScore 3; foram retiradas as anotações de análise harmônica (cifras de grau) e, na Moonlight Sonata, as dinâmicas que a edição guardava como texto viraram dinâmicas.

## Licença CC BY-NC-SA 4.0

Os dois arquivos da DCML continuam sob a mesma licença: atribuição (DCML, EPFL), uso não comercial e compartilhamento pela mesma licença.
Texto da licença: https://creativecommons.org/licenses/by-nc-sa/4.0/
Fontes: https://github.com/DCMLab/beethoven_piano_sonatas e https://github.com/DCMLab/debussy_suite_bergamasque

Mutopia Project: https://www.mutopiaproject.org
