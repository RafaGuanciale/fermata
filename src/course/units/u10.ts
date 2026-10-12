// Unidade 10 — Harmonia cromática funcional (lições 74 a 81). Projeto final: When the Saints Go Marching In, rearmonizada.
// Plano: docs/curso/PLANO.md. Regras de escrita: docs/curso/PROTOCOLO.md.

import {
  chordQualityByEar, chordSequence, choice, chromaticByEar, chromaticChord, chromaticSymbol, harmonizeChromatic, keyName, ledVoicings, mix, playChord,
  progressionChoice, type ChoiceQuestion, type ChromRoman, type Roman,
} from '../gens';
import { n, pick } from '../music';
import { melodyTask, twoHandTask } from '../tasks';
import type { Midi } from '../../music/notes';
import type { Exercise, ItemGen, Lesson, Listen, Rng, SongSpec, TimedTask, Unit } from '../types';

// ---------- escrita ----------

const quickTimed = (title: string, how: string, gen: (rng: Rng) => TimedTask, extra: Partial<Extract<Exercise, { kind: 'timed' }>> = {}): Exercise => ({
  kind: 'timed', title, how, gen, reps: 1, window: 100, pass: { accuracy: 0.85 }, ...extra,
});

const quiz = (title: string, how: string, qs: ChoiceQuestion[], accuracy = 0.8): Exercise => ({
  kind: 'quiz', title, how, questions: qs.map((q) => ({ q: q.q, options: q.options, answer: q.answer, why: q.why ?? '' })), pass: { accuracy },
});

const items = (title: string, how: string, gen: ItemGen, count: number, low: Midi, high: Midi, accuracy = 0.85, labels: 'on' | 'fade' | 'off' = 'fade', avgMs?: number): Exercise => ({
  kind: 'items', title, how, gen, count, low, high, labels, pass: avgMs ? { accuracy, avgMs } : { accuracy },
});

const SCI = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const sci = (m: Midi) => `${SCI[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

/** O app toca uma progressão conduzida (baixo + três vozes), 2 tempos por acorde e o último mais longo. */
const progListen = (symbols: string[], bpm = 72): Listen => ({ bpm, steps: ledVoicings(symbols).map((v, i) => ({ midis: v, beats: i === symbols.length - 1 ? 4 : 2 })) });

// ---------- tonalidades ----------

/** Tons maiores com a armadura (sem Fá♯/Sol♭: a pauta do app não escreve Mi♯ nem Dó♭). */
const KEYS_STAFF: { key: string; pc: number; fifths: number }[] = [
  { key: 'C', pc: 0, fifths: 0 }, { key: 'G', pc: 7, fifths: 1 }, { key: 'D', pc: 2, fifths: 2 }, { key: 'A', pc: 9, fifths: 3 }, { key: 'E', pc: 4, fifths: 4 },
  { key: 'B', pc: 11, fifths: 5 }, { key: 'F', pc: 5, fifths: -1 }, { key: 'Bb', pc: 10, fifths: -2 }, { key: 'Eb', pc: 3, fifths: -3 }, { key: 'Ab', pc: 8, fifths: -4 },
  { key: 'Db', pc: 1, fifths: -5 },
];
/** Os 12 tons na ordem do ciclo de quintas (cada um uma 5ª abaixo do anterior). */
const CYCLE = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'];
const KEYS_MAIN = ['C', 'G', 'F', 'D', 'Bb'];

const SECONDARY: ChromRoman[] = ['V7/ii', 'V7/iii', 'V7/IV', 'V7/V', 'V7/vi'];
/** O alvo de cada secundária, em tétrade (V7/x → x). */
const TARGET: Record<string, Roman> = { 'V7/ii': 'ii7', 'V7/iii': 'iii7', 'V7/IV': 'IV7M', 'V7/V': 'V7', 'V7/vi': 'vi7' };

// ---------- geradores reaproveitados ----------

const secDom = chromaticChord({ keys: KEYS_MAIN, romans: SECONDARY, low: 48, high: 72 });
const secDomC = chromaticChord({ keys: ['C'], romans: SECONDARY, low: 48, high: 72 });
const secResolve = chordSequence({
  sequences: ['C', 'G', 'F'].flatMap((k) => SECONDARY.map((r) => ({ name: `${r} → ${TARGET[r]} em ${keyName(k)} maior.`, symbols: [chromaticSymbol(k, r), chromaticSymbol(k, TARGET[r])] }))),
});
const secHarm = harmonizeChromatic({
  key: 'C',
  bars: [
    { notes: [n('E4'), n('G4'), n('C#5'), n('A4')], accept: ['V7/ii'], say: 'Dó♯ não existe em Dó maior: é a sensível de Ré.' },
    { notes: [n('F#4'), n('A4'), n('C5'), n('D5')], accept: ['V7/V'], say: 'Fá♯ é a sensível de Sol.' },
    { notes: [n('G#4'), n('B4'), n('D5'), n('E5')], accept: ['V7/vi'], say: 'Sol♯ é a sensível de Lá.' },
    { notes: [n('D#5'), n('B4'), n('F#4'), n('A4')], accept: ['V7/iii'], say: 'Ré♯ é a sensível de Mi.' },
  ],
});
const earSecondary = progressionChoice({
  keys: ['C', 'G', 'F'],
  options: [{ label: 'vi (menor)', romans: ['I', 'vi', 'ii', 'V7', 'I'] }, { label: 'V7/ii (maior com 7ª)', romans: ['I', 'V7/ii', 'ii', 'V7', 'I'] }],
  ask: 'O segundo acorde é o vi ou o V7/ii?',
});

const iiVI = chromaticChord({ keys: CYCLE, romans: ['ii7', 'V7', 'I7M'], low: 48, high: 72 });
const guideAll = chordSequence({
  sequences: CYCLE.map((k) => ({ name: `ii–V–I em ${keyName(k)} maior.`, symbols: (['ii7', 'V7', 'I7M'] as Roman[]).map((r) => chromaticSymbol(k, r)) })),
  voicing: 'guide',
  lead: 1,
});

const MINOR_IIVI: { name: string; symbols: string[] }[] = [
  { name: 'ii–V–i em Lá menor.', symbols: ['Bm7(b5)', 'E7', 'Am7'] },
  { name: 'ii–V–i em Ré menor.', symbols: ['Em7(b5)', 'A7', 'Dm7'] },
  { name: 'ii–V–i em Mi menor.', symbols: ['F#m7(b5)', 'B7', 'Em7'] },
  { name: 'ii–V–i em Sol menor.', symbols: ['Am7(b5)', 'D7', 'Gm7'] },
  { name: 'ii–V–i em Dó menor.', symbols: ['Dm7(b5)', 'G7', 'Cm7'] },
  { name: 'ii–V–i em Si menor.', symbols: ['C#m7(b5)', 'F#7', 'Bm7'] },
];
const guideMinor = chordSequence({ sequences: MINOR_IIVI, voicing: 'guide', lead: 1 });
const minorChords = chromaticChord({ keys: ['A', 'D', 'E', 'G', 'C'], romans: ['iiø', 'V7(b9)', 'im7'], low: 48, high: 72 });
const earMajorMinor = progressionChoice({
  keys: ['C', 'F', 'G', 'D'],
  options: [{ label: 'ii–V–I (maior)', romans: ['ii7', 'V7', 'I7M'] }, { label: 'ii–V–i (menor)', romans: ['iiø', 'V7', 'im7'] }],
  ask: 'Foi um ii–V–I maior ou um ii–V–i menor?',
});
const guideSecondaryIiV = chordSequence({
  sequences: [
    { name: 'ii–V do ii em Dó: Em7–A7 levam a Dm7.', symbols: ['Em7', 'A7', 'Dm7'] },
    { name: 'ii–V do vi em Dó: Bm7(♭5)–E7 levam a Am7.', symbols: ['Bm7(b5)', 'E7', 'Am7'] },
    { name: 'ii–V do V em Dó: Am7–D7 levam a G7.', symbols: ['Am7', 'D7', 'G7'] },
    { name: 'ii–V do iii em Dó: F♯m7(♭5)–B7 levam a Em7.', symbols: ['F#m7(b5)', 'B7', 'Em7'] },
  ],
  voicing: 'guide',
  lead: 1,
});

// ---------- perguntas ----------

const SECONDARY_Q: ChoiceQuestion[] = [
  { q: 'Em Dó maior, o V7/ii é…', options: ['A7', 'Am7', 'D7'], answer: 0, why: 'O ii é Dm; o dominante de Ré é Lá com 7ª: Lá, Dó♯, Mi, Sol.' },
  { q: 'Em Dó maior, o V7/V é…', options: ['D7', 'G7', 'Dm7'], answer: 0, why: 'O V é Sol; o dominante de Sol é Ré com 7ª: Ré, Fá♯, Lá, Dó.' },
  { q: 'Em Sol maior, o V7/vi é…', options: ['B7', 'E7', 'Bm7'], answer: 0, why: 'O vi de Sol é Em; o dominante de Mi é Si com 7ª: Si, Ré♯, Fá♯, Lá.' },
  { q: 'Em Fá maior, o V7/IV é…', options: ['F7', 'C7', 'B♭7'], answer: 0, why: 'O IV de Fá é B♭; o dominante de Si♭ é Fá com 7ª: o próprio I ganha a 7ª menor (Mi♭).' },
  { q: 'Por que não existe V7/vii° no campo maior?', options: ['Porque o vii° é diminuto e não serve de "casa" provisória', 'Porque soa igual ao V7', 'Existe, é o mais usado'], answer: 0, why: 'Só acordes maiores ou menores podem ser tonicizados.' },
  { q: 'A nota alterada de uma secundária costuma ser…', options: ['A sensível do acorde alvo', 'A fundamental do acorde alvo', 'A 5ª do I'], answer: 0, why: 'A 3ª da secundária fica meio tom abaixo da fundamental do alvo e puxa para ela (Dó♯ → Ré).' },
  { q: 'Tonicizar é…', options: ['Tratar um acorde do campo como casa por um instante, com a dominante dele', 'Mudar de tom de vez', 'Tocar a tônica mais forte'], answer: 0, why: 'A casa continua sendo o I; o alvo só ganha destaque por um momento.' },
];

const IIVI_Q: ChoiceQuestion[] = [
  { q: 'As notas-guia do ii7 de qualquer tom maior são…', options: ['O 4º grau e a tônica do tom', 'A tônica e a dominante do tom', 'O 2º e o 6º graus'], answer: 0, why: 'Dm7 em Dó: a 3ª é Fá (4º grau) e a 7ª é Dó (tônica).' },
  { q: 'Do ii7 para o V7, as notas-guia…', options: ['Uma fica e a outra desce meio tom', 'As duas sobem', 'As duas saltam uma 4ª'], answer: 0, why: 'Em Dó: Fá fica; Dó desce para Si (a sensível).' },
  { q: 'O ciclo de quintas, a partir de Dó, descendo uma 5ª a cada passo, é…', options: ['Dó, Fá, Si♭, Mi♭, Lá♭, Ré♭…', 'Dó, Sol, Ré, Lá, Mi…', 'Dó, Ré, Mi, Fá, Sol…'], answer: 0, why: 'Descendo 5ªs justas (ou subindo 4ªs): Dó → Fá → Si♭ → Mi♭.' },
  { q: 'O ii–V–I em Mi♭ maior é…', options: ['Fm7 – B♭7 – E♭7M', 'Gm7 – C7 – Fm7', 'B♭m7 – E♭7 – A♭7M'], answer: 0, why: 'ii de Mi♭ = Fá menor; V = Si♭.' },
  { q: '"Desdobrar a dominante" quer dizer…', options: ['Tocar o ii antes do V, dividindo o tempo do V', 'Tocar o V duas vezes', 'Trocar o V pelo IV'], answer: 0, why: 'O ii prepara o V: os dois juntos fazem a preparação do I.' },
];

const MINOR_Q: ChoiceQuestion[] = [
  { q: 'Em Lá menor, o ii é…', options: ['Bm7(♭5)', 'Bm7', 'B7'], answer: 0, why: 'Si, Ré, Fá, Lá: a 5ª é Fá, o 6º grau de Lá menor. Por isso o ii fica meio-diminuto.' },
  { q: 'O V7 de Lá menor é E7 porque…', options: ['A escala harmônica sobe o 7º grau (Sol♯): é a sensível', 'O V é sempre menor', 'Em menor não há dominante'], answer: 0, why: 'Em menor natural o v seria Em7; a sensível Sol♯ dá a força do E7.' },
  { q: 'A 9ª menor do E7(♭9), em Lá menor, é…', options: ['Fá, o 6º grau do tom', 'Fá♯', 'Sol'], answer: 0, why: 'Mi + 9ª menor = Fá. É a mesma nota da 5ª do Bm7(♭5).' },
  { q: 'Do V7 para o i menor (E7 → Am7), as notas-guia…', options: ['As duas descem (Ré → Dó, Sol♯ → Sol)', 'Uma fica e a outra sobe', 'As duas ficam'], answer: 0, why: 'A 7ª do E7 desce um tom e a 3ª desce meio tom.' },
  { q: 'Um "ii–V secundário" é…', options: ['O ii–V que leva a um acorde do campo que não é o I', 'Um ii–V tocado duas vezes', 'O ii–V em menor'], answer: 0, why: 'Em Dó: Em7–A7 → Dm7. O alvo menor pede o ii meio-diminuto (Bm7(♭5)–E7 → Am7).' },
];

// ---------- lições ----------

const l74: Lesson = {
  n: 74,
  id: 'l74',
  title: 'Dominantes secundárias',
  minutes: 60,
  objectives: [
    'Consigo tocar o V7/ii, V7/iii, V7/IV, V7/V e V7/vi em Dó, Sol, Fá, Ré e Si♭.',
    'Consigo resolver cada secundária no seu alvo.',
    'Consigo achar a secundária pela nota alterada de uma melodia.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Emprestar a dominante de outro acorde',
      body: `Até aqui, todo acorde vinha do campo harmônico: em Dó maior, só as teclas brancas. Agora entra a primeira cor de fora. A ideia é simples: o V7 resolve no I com muita força, e **qualquer acorde maior ou menor do campo pode ganhar o seu próprio V7** por um instante.

Em Dó, o ii é Dm. Se você trata Dm como uma casa provisória, o dominante dela é **A7** (Lá, Dó♯, Mi, Sol). Tocar A7 → Dm faz o ouvido "visitar" Ré menor por um momento e depois seguir em Dó. Isso se chama **tonicizar** um acorde. A casa continua sendo o I.

A cifra analítica escreve esse acorde como **V7/ii** (lê-se "cinco sete do dois"): o V7 de quem vem depois da barra. Em Dó maior, as cinco secundárias são:

- **V7/ii = A7** (Dó♯) → Dm
- **V7/iii = B7** (Ré♯ e Fá♯) → Em
- **V7/IV = C7** (Si♭) → F
- **V7/V = D7** (Fá♯) → G
- **V7/vi = E7** (Sol♯) → Am

O vii° não entra: um acorde diminuto não soa como casa, nem provisória.`,
    },
    {
      kind: 'example',
      title: 'A7 visita Ré menor',
      steps: [
        { say: 'Primeiro a progressão só com o campo: **C – Am – Dm – G7 – C**.', play: progListen(['C', 'Am', 'Dm', 'G7', 'C']) },
        { say: 'Agora o Am vira **A7**: o Dó vira Dó♯. Escute como o Dó♯ puxa para o Ré do Dm.', play: progListen(['C', 'A7', 'Dm', 'G7', 'C']), keys: [n('A3'), n('C#4'), n('E4'), n('G4')] },
        { say: 'O A7 sozinho e depois o Dm: o Dó♯ sobe meio tom para Ré, e o Sol (a 7ª) desce para Fá.', play: { bpm: 72, steps: [{ midis: [n('A2'), n('C#4'), n('E4'), n('G4')], beats: 2 }, { midis: [n('D3'), n('D4'), n('F4'), n('A4')], beats: 3 }] } },
      ],
    },
    {
      kind: 'text',
      title: 'Como construir qualquer secundária',
      body: `O caminho é sempre o mesmo, em três passos:

1. **Ache o alvo** e a fundamental dele. V7/vi em Fá maior: o vi de Fá é Dm, fundamental Ré.
2. **Suba uma 5ª justa** a partir dessa fundamental (ou desça uma 4ª): de Ré, Lá.
3. **Monte um acorde maior com 7ª menor** sobre essa nota: A7 = Lá, Dó♯, Mi, Sol.

Repare no que muda: a **3ª da secundária é sempre a sensível do alvo**, meio tom abaixo da fundamental dele (Dó♯ → Ré). Por isso quase toda secundária traz uma nota de fora do tom. O V7/IV é a exceção curiosa: em Dó, ele é o próprio Dó com a 7ª menor (Si♭). A nota de fora é a 7ª, e ela desce para Lá, a 3ª do Fá.`,
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'fazer a secundária menor',
      body: 'Am7 não é o V7/ii de Dó: ele é o vi7, do próprio campo. A secundária é **maior com 7ª menor**, sempre. Em Dó, o V7/ii tem Dó♯, não Dó. Se a nota alterada não está lá, o acorde não puxa.',
    },
    { kind: 'exercise', id: 'l74-construir', exercise: items('Toque a secundária', 'Em Dó maior, toque o V7 pedido. Comece pelo alvo, suba uma 5ª e monte o acorde com 7ª.', secDomC, 10, 48, 72, 0.85, 'fade') },
    { kind: 'exercise', id: 'l74-resolver', exercise: items('Secundária e alvo', 'Toque a secundária e depois o acorde que ela toniciza, em Dó, Sol e Fá. Os dois em tétrade.', secResolve, 8, 48, 72, 0.85, 'off') },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que o alvo soa como chegada',
      body: 'A secundária tem o mesmo desenho do V7: um trítono entre a 3ª e a 7ª (no A7, Dó♯ e Sol). O trítono se resolve com as duas notas andando meio tom ou um tom, para dentro do alvo: Dó♯ sobe para Ré e Sol desce para Fá. É a mesma força do G7 → C, apontada para outro acorde.',
    },
    {
      kind: 'text',
      title: 'A nota alterada na melodia',
      body: `Quando a melodia de uma música em Dó maior traz um **Dó♯**, um **Fá♯** ou um **Sol♯**, quase sempre há uma secundária embaixo. A nota alterada é a pista: procure o acorde que a contém e que resolve no próximo.

- Dó♯ → A7 (V7/ii)
- Fá♯ → D7 (V7/V)
- Sol♯ → E7 (V7/vi)
- Ré♯ → B7 (V7/iii)

Com a mesma regra você harmoniza de ouvido: quando a melodia "sobe meio tom" para uma nota do campo, experimente o dominante dessa nota.`,
    },
    { kind: 'exercise', id: 'l74-harmonizar', exercise: items('Harmonize com secundárias', 'A pauta mostra um compasso com uma nota alterada. Toque a secundária que cabe embaixo.', secHarm, 6, 48, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l74-ouvido', exercise: items('vi ou V7/ii?', 'O app toca I – ? – ii – V7 – I. Escute o segundo acorde: menor (vi) ou maior com 7ª, puxando para o ii (V7/ii)?', earSecondary, 8, 48, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l74-tons', exercise: items('Secundárias em cinco tons', 'Dó, Sol, Fá, Ré e Si♭. Três passos: alvo, 5ª acima, maior com 7ª.', secDom, 10, 48, 72, 0.85, 'fade') },
  ],
  review: [secDom, secResolve, choice(SECONDARY_Q, 'secundarias')],
  checkpoint: [
    items('Secundárias sem dica', '10 acordes em cinco tons. Meta: 9 de 10.', secDom, 10, 48, 72, 0.9, 'off'),
    items('Harmonize a nota alterada', '8 compassos sorteados.', mix([secHarm, earSecondary]), 8, 48, 72, 0.85, 'off'),
  ],
  exit: [secDomC, choice(SECONDARY_Q, 'secundarias')],
};

/** ii–V–I com a fundamental na esquerda e as notas-guia na direita, duas vezes, num tom sorteado (pauta com a armadura do tom). */
function iiVIHands(rng: Rng, bpm: number): TimedTask {
  const k = pick(rng, KEYS_STAFF);
  // Tônica da direita entre Ré4 e Dó♯5; o 4º grau fica uma 5ª abaixo.
  const t = 62 + ((k.pc - 2 + 12) % 12);
  const f = t - 7;
  const bass = (pc: number) => 40 + ((pc - 4 + 12) % 12);
  const right = `${sci(f)}+${sci(t)}:2 ${sci(f)}+${sci(t - 1)}:2 | ${sci(f - 1)}+${sci(t - 1)}:4`;
  const left = `${sci(bass(k.pc + 2))}:2 ${sci(bass(k.pc + 7))}:2 | ${sci(bass(k.pc))}:4`;
  const symbols = (['ii7', 'V7', 'I7M'] as Roman[]).map((r) => chromaticSymbol(k.key, r));
  return twoHandTask(`${right} | ${right}`, `${left} | ${left}`, {
    bpm,
    fifths: k.fifths,
    caption: `ii–V–I em ${keyName(k.key)} maior: ${symbols.join(' – ')}, duas vezes. Direita: as notas-guia (a pauta). Esquerda: só a fundamental de cada acorde.`,
  });
}

const l75: Lesson = {
  n: 75,
  id: 'l75',
  title: 'ii–V–I maior nos 12 tons',
  minutes: 60,
  objectives: [
    'Consigo tocar o ii7, o V7 e o I7M de qualquer um dos 12 tons.',
    'Consigo conduzir as notas-guia do ii–V–I em qualquer tom.',
    'Consigo tocar o ii–V–I com a fundamental na esquerda e as notas-guia na direita, a 80 BPM, com 90% no tempo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Desdobrar a dominante',
      body: `Na unidade 8 você tocou o **ii–V–I** em seis tons. Agora ele vai para os 12, porque é a frase mais comum da harmonia popular: está no jazz, na bossa, no samba-canção e em boa parte do pop.

A lógica dele tem nome: **desdobrar a dominante**. Em vez de dois compassos de G7 antes do C, você divide o tempo: Dm7 prepara, G7 tensiona, C7M resolve. O ii tem função de subdominante (prepara), o V de dominante, o I de tônica. As fundamentais andam em **quintas descendentes**: Ré → Sol → Dó.

Qualquer ii–V–I se acha pela escala do tom: o ii é o acorde menor com 7ª sobre o 2º grau, o V é o dominante sobre o 5º e o I é o maior com 7ª maior. Em Mi♭ maior: **Fm7 – B♭7 – E♭7M**.`,
    },
    {
      kind: 'text',
      title: 'O ciclo de quintas',
      body: `Para passar pelos 12 tons sem esquecer nenhum, siga o **ciclo de quintas** descendo: cada tom fica uma 5ª justa abaixo do anterior.

**Dó → Fá → Si♭ → Mi♭ → Lá♭ → Ré♭ → Fá♯ (Sol♭) → Si → Mi → Lá → Ré → Sol** → e volta a Dó.

É a mesma direção em que as fundamentais andam dentro do ii–V–I. Por isso o ciclo é o caminho natural dos padrões de jazz: depois de resolver em C7M, o próximo ii–V–I começa um tom abaixo do anterior… ou, pensando nas tonalidades, uma 5ª abaixo. Treine nessa ordem: a mão aprende a "próxima casa" junto com o acorde.`,
    },
    { kind: 'exercise', id: 'l75-acordes', exercise: items('ii7, V7 e I7M em qualquer tom', 'O app pede um grau num dos 12 tons. Qualquer posição; no V7, a 5ª pode ficar de fora.', iiVI, 12, 48, 72, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'O atalho das notas-guia',
      body: `As notas que definem uma tétrade são a **3ª** e a **7ª**. No ii–V–I elas andam quase sozinhas, e há um atalho que vale em todos os tons:

- **ii7**: as notas-guia são o **4º grau** e a **tônica** do tom. Em Dó: Fá e Dó.
- **V7**: o 4º grau **fica**; a tônica **desce meio tom** para a sensível. Em Dó: Fá e Si.
- **I7M**: a sensível **fica**; o 4º grau **desce meio tom** para o 3º. Em Dó: Mi e Si.

Em cada troca, uma nota fica e a outra desce meio tom. Você só precisa saber a tônica e o 4º grau do tom: o resto se resolve sozinho. Em Lá♭ maior: Ré♭ e Lá♭ → Ré♭ e Sol → Dó e Sol.`,
    },
    {
      kind: 'example',
      title: 'Notas-guia em Dó e em Lá♭',
      steps: [
        { say: 'Em Dó: **Fá–Dó** (Dm7) → **Fá–Si** (G7) → **Mi–Si** (C7M). O baixo toca Ré, Sol, Dó.', play: { bpm: 72, steps: [{ midis: [n('D3'), n('F4'), n('C5')], beats: 2 }, { midis: [n('G2'), n('F4'), n('B4')], beats: 2 }, { midis: [n('C3'), n('E4'), n('B4')], beats: 4 }] }, keys: [n('F4'), n('C5')] },
        { say: 'Em Lá♭: **Ré♭–Lá♭** (B♭m7) → **Ré♭–Sol** (E♭7) → **Dó–Sol** (A♭7M). O mesmo movimento, outra casa.', play: { bpm: 72, steps: [{ midis: [n('Bb2'), n('Db4'), n('Ab4')], beats: 2 }, { midis: [n('Eb3'), n('Db4'), n('G4')], beats: 2 }, { midis: [n('Ab2'), n('C4'), n('G4')], beats: 4 }] }, keys: [n('Db4'), n('Ab4')] },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'saltar com a mão inteira',
      body: 'Quem toca a posição fundamental de cada acorde faz a mão pular uma 5ª a cada troca e perde o tempo. Com as notas-guia, a direita quase não se mexe: se você precisou pular, conferiu errado qual nota fica.',
    },
    { kind: 'exercise', id: 'l75-guias', exercise: items('Notas-guia nos 12 tons', 'Só a 3ª e a 7ª de cada acorde, conduzidas: uma fica, a outra desce meio tom.', guideAll, 12, 48, 84, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Mãos juntas: fundamental e notas-guia',
      body: `Agora as duas mãos dividem o trabalho, como num acompanhamento de verdade: a **esquerda** toca só a fundamental (Ré, Sol, Dó em Dó maior), na região grave; a **direita** toca as notas-guia por cima.

O compasso tem o ii e o V com 2 tempos cada; o I ocupa o compasso seguinte inteiro. O ii–V–I vem duas vezes, num tom sorteado a cada passada, com a armadura na pauta. Olhe a armadura antes de começar: ela diz quais pretas entram.

Meta da tabela: **90% das notas no tempo a 80 BPM**. Comece pensando em voz alta o nome da tônica e do 4º grau do tom; o resto o atalho resolve.`,
    },
    { kind: 'exercise', id: 'l75-maos', exercise: quickTimed('ii–V–I com as duas mãos', 'Esquerda na fundamental, direita nas notas-guia, a 80 BPM. Tom novo a cada passada boa; faça 4 seguidas.', (rng) => iiVIHands(rng, 80), { reps: 4, pass: { accuracy: 0.9 } }) },
    { kind: 'exercise', id: 'l75-quiz', exercise: quiz('ii–V–I e ciclo de quintas', 'Responda sem tocar.', IIVI_Q) },
  ],
  review: [iiVI, guideAll, choice(IIVI_Q, 'ii-v-i')],
  checkpoint: [
    items('Notas-guia, tons sorteados', '12 ii–V–I sem dica. Meta: 11 de 12.', guideAll, 12, 48, 84, 0.9, 'off'),
    quickTimed('ii–V–I no tempo', 'Um tom sorteado, mãos juntas, a 80 BPM. Meta: 90% no tempo.', (rng) => iiVIHands(rng, 80), { pass: { accuracy: 0.9 } }),
  ],
  exit: [iiVI, choice(IIVI_Q, 'ii-v-i')],
};

const l76: Lesson = {
  n: 76,
  id: 'l76',
  title: 'ii–V–i menor',
  minutes: 60,
  objectives: [
    'Consigo montar o iiø, o V7(♭9) e o i de um tom menor.',
    'Consigo conduzir as notas-guia do ii–V–i em seis tons menores.',
    'Consigo distinguir de ouvido um ii–V–I maior de um ii–V–i menor.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O ii–V do tom menor',
      body: `Em tom menor, a frase de preparação também existe, mas os acordes mudam de cor. Em **Lá menor**, usando a escala menor harmônica (com o Sol♯):

- **ii = Bm7(♭5)**, o meio-diminuto: Si, Ré, Fá, Lá. A 5ª é **Fá**, o 6º grau de Lá menor, meio tom abaixo do que seria num tom maior. Por isso o ii fica meio-diminuto.
- **V = E7**: Mi, Sol♯, Si, Ré. O Sol♯ é a sensível, que a escala natural não tem.
- **i = Am7** (ou Am, ou Am6): a casa menor.

A cifra do ii tem dois nomes: **Bm7(♭5)**, como se escreve no Brasil, ou **Bø**. Nas romanas: **iiø – V7 – i**.`,
    },
    {
      kind: 'text',
      title: 'A 9ª menor do V7',
      body: `No tom menor, o V7 costuma ganhar uma nota a mais: a **9ª menor**. Em Lá menor, sobre E7, a 9ª menor é **Fá**, o mesmo 6º grau que estava no Bm7(♭5). O acorde **E7(♭9)** tem Mi, Sol♯, Si, Ré e Fá.

Ele soa mais dramático que o E7 simples, e é a cor típica do tango, do bolero e das trilhas de suspense. São cinco notas: na prática, a 5ª (Si) sai e sobram Mi, Sol♯, Ré e Fá. Repare que Sol♯, Si, Ré e Fá formam um acorde diminuto: isso vai ser a chave da próxima lição.`,
    },
    {
      kind: 'example',
      title: 'Do maior para o menor',
      steps: [
        { say: 'Primeiro o ii–V–I de **Dó maior**: Dm7 – G7 – C7M.', play: progListen(['Dm7', 'G7', 'C7M']) },
        { say: 'Agora o ii–V–i de **Lá menor**: Bm7(♭5) – E7 – Am7. O ii fica mais escuro e a chegada é menor.', play: progListen(['Bm7(b5)', 'E7', 'Am7']) },
        { say: 'O **E7(♭9)**: Mi no baixo, Sol♯, Ré e Fá em cima. O Fá dá o drama.', play: { bpm: 60, steps: [{ midis: [n('E3'), n('G#4'), n('D5'), n('F5')], beats: 3 }, { midis: [n('A2'), n('A4'), n('C5'), n('E5')], beats: 3 }] }, keys: [n('E3'), n('G#4'), n('D5'), n('F5')] },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'esquecer a sensível',
      body: 'Em Lá menor, o V é **E7** com Sol♯, não Em7. Sem a sensível, o acorde não puxa para a casa e a frase soa parada. O ii, ao contrário, não leva sustenido: é Bm7(♭5), com Fá natural.',
    },
    { kind: 'exercise', id: 'l76-acordes', exercise: items('iiø, V7(♭9) e i', 'Em cinco tons menores. No V7(♭9), a 5ª pode ficar de fora; a fundamental fica embaixo de tudo, como no exemplo.', minorChords, 10, 40, 76, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Notas-guia em menor',
      body: `As notas-guia do ii–V–i menor andam quase como no maior, com uma diferença na chegada:

- **Bm7(♭5) → E7**: a 3ª do ii (Ré) **fica** e vira a 7ª do V; a 7ª do ii (Lá) **desce meio tom** para Sol♯.
- **E7 → Am7**: aqui **as duas descem**. A 7ª (Ré) desce um tom para Dó, a 3ª menor do Am7; a sensível (Sol♯) desce meio tom para Sol, a 7ª do Am7.

No i com 7ª menor, a sensível não sobe: ela desce para a 7ª. Se você quiser que ela suba para o Lá, toque o i como tríade (Am) e deixe o Sol♯ resolver na tônica.`,
    },
    { kind: 'exercise', id: 'l76-guias', exercise: items('Notas-guia do ii–V–i', 'Seis tons menores. Duas notas por acorde; do V para o i, as duas descem.', guideMinor, 8, 48, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l76-ouvido', exercise: items('Maior ou menor?', 'O app toca um ii–V–I ou um ii–V–i. A diferença maior está na chegada: com brilho (7M) ou escura (m7).', earMajorMinor, 8, 48, 72, 0.85, 'off') },
    {
      kind: 'text',
      title: 'ii–V secundários',
      body: `Juntando esta lição com a 74: se qualquer acorde do campo pode ganhar seu V7, ele também pode ganhar **o seu ii–V inteiro**. Em Dó maior:

- Para chegar ao **Dm7** (ii): **Em7 – A7** → Dm7.
- Para chegar ao **G7** (V): **Am7 – D7** → G7.
- Para chegar ao **Am7** (vi), que é menor: **Bm7(♭5) – E7** → Am7. Alvo menor pede ii meio-diminuto.
- Para chegar ao **Em7** (iii), também menor: **F♯m7(♭5) – B7** → Em7.

É assim que os padrões de jazz e de MPB encadeiam um ii–V atrás do outro: cada alvo vira, por um momento, um I.`,
    },
    {
      kind: 'callout',
      tone: 'dica',
      title: 'pense no alvo primeiro',
      body: 'Para montar um ii–V secundário, ache o alvo, depois o V7 dele (uma 5ª acima) e depois o ii desse V (outra 5ª acima). Alvo maior: ii menor com 7ª. Alvo menor: ii meio-diminuto.',
    },
    { kind: 'exercise', id: 'l76-secundarios', exercise: items('ii–V secundários em Dó', 'Notas-guia de cada ii–V e do alvo.', guideSecondaryIiV, 6, 48, 84, 0.85, 'fade') },
  ],
  review: [minorChords, guideMinor, choice(MINOR_Q, 'ii-v-i-menor')],
  checkpoint: [
    items('ii–V–i menor sem dica', '8 progressões em tons menores sorteados.', guideMinor, 8, 48, 84, 0.85, 'off'),
    items('Ouvido e acordes', 'Maior ou menor de ouvido, misturado com os acordes do ii–V–i e com secundárias da lição 74.', mix([earMajorMinor, minorChords, secDom]), 10, 40, 76, 0.9, 'off'),
  ],
  exit: [minorChords, choice(MINOR_Q, 'ii-v-i-menor')],
};

// ---------- diminutos, subV e empréstimo ----------

const DIM_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const dim7 = playChord({ symbols: DIM_ROOTS.map((r) => `${r}°7`), low: 48, high: 72, requireBass: true });
/** O mesmo diminuto com outra nota no baixo: só existem três conjuntos de teclas. */
const dimSlash = playChord({ symbols: ['B°7/D', 'B°7/F', 'B°7/G#', 'C#°7/E', 'C#°7/G', 'C#°7/A#', 'D#°7/F#', 'D#°7/A', 'D#°7/C'], low: 48, high: 72 });
const dimPassing = chordSequence({
  sequences: [
    { name: 'De passagem: o baixo sobe Dó, Dó♯, Ré.', symbols: ['C7M', 'C#°7', 'Dm7', 'G7'] },
    { name: 'De passagem: o baixo sobe Ré, Ré♯, Mi.', symbols: ['Dm7', 'D#°7', 'Em7', 'A7'] },
    { name: 'De passagem: o baixo sobe Fá, Fá♯, Sol.', symbols: ['F7M', 'F#°7', 'C7M/G', 'G7'] },
    { name: 'Função dominante: vii°7 → I.', symbols: ['F7M', 'G7', 'B°7', 'C7M'] },
    { name: 'Função dominante em Lá menor: vii°7 → i.', symbols: ['Dm7', 'Bm7(b5)', 'G#°7', 'Am7'] },
    { name: 'Auxiliar: o Dó fica no baixo e o diminuto enfeita o I.', symbols: ['C7M', 'C°7', 'C7M', 'G7'] },
  ],
});
const earDim = chordQualityByEar({ qualities: ['°7', '7', 'ø'], roots: [57, 60, 62, 64, 65, 67], answerRoots: [55, 57, 60, 62, 64, 65] });

/** Arpejos de diminuta numa inversão que começa em tecla branca (um de cada um dos três conjuntos). */
const DIM_ARPS: { text: string; fifths: number; caption: string }[] = [
  { text: 'B3:0.5 D4:0.5 F4:0.5 G#4:0.5 B4:0.5 G#4:0.5 F4:0.5 D4:0.5 | B3:4', fifths: 0, caption: 'Arpejo de G♯°7 (o vii°7 de Lá menor) a partir do Si. Dedos 1-2-3-4-5 subindo, 4-3-2-1 descendo.' },
  { text: 'E4:0.5 G4:0.5 Bb4:0.5 C#5:0.5 E5:0.5 C#5:0.5 Bb4:0.5 G4:0.5 | E4:4', fifths: -1, caption: 'Arpejo de C♯°7 (o vii°7 de Ré menor) a partir do Mi. Dedos 1-2-3-4-5 subindo, 4-3-2-1 descendo.' },
  { text: 'A3:0.5 C4:0.5 D#4:0.5 F#4:0.5 A4:0.5 F#4:0.5 D#4:0.5 C4:0.5 | A3:4', fifths: 1, caption: 'Arpejo de D♯°7 (o vii°7 de Mi menor) a partir do Lá. Dedos 1-2-3-4-5 subindo, 4-3-2-1 descendo.' },
];
const dimArp = (bpm: number) => (rng: Rng) => {
  const a = pick(rng, DIM_ARPS);
  return melodyTask(a.text, { bpm, fifths: a.fifths, caption: a.caption });
};

const DIM_Q: ChoiceQuestion[] = [
  { q: 'B°7 tem as notas…', options: ['Si, Ré, Fá, Lá♭', 'Si, Ré, Fá, Lá', 'Si, Ré♯, Fá♯, Lá'], answer: 0, why: 'Três terças menores: Si–Ré, Ré–Fá, Fá–Lá♭. A 7ª é diminuta (9 semitons).' },
  { q: 'Quantos acordes °7 diferentes existem, contando só as teclas?', options: ['3', '4', '12'], answer: 0, why: 'Cada °7 divide a oitava em 4 partes iguais: suas inversões dão outros °7. Doze fundamentais, só três conjuntos de teclas.' },
  { q: 'B°7, D°7, F°7 e A♭°7 são…', options: ['O mesmo conjunto de teclas, escrito de jeitos diferentes', 'Quatro acordes sem nota em comum', 'Acordes meio-diminutos'], answer: 0, why: 'Si, Ré, Fá, Lá♭: qualquer uma pode ser a fundamental escrita.' },
  { q: 'O vii°7 de Dó (B°7) funciona como…', options: ['Um G7(♭9) sem a fundamental', 'Um IV', 'Uma tônica'], answer: 0, why: 'G7(♭9) = Sol, Si, Ré, Fá, Lá♭. Tire o Sol: sobra B°7. Resolve no Dó como o G7.' },
  { q: 'No caminho C7M – C♯°7 – Dm7, o diminuto é…', options: ['De passagem: o baixo sobe por semitons', 'Auxiliar', 'Uma tônica nova'], answer: 0, why: 'Dó, Dó♯, Ré no baixo: o °7 liga dois acordes a um tom de distância.' },
  { q: 'Um °7 auxiliar (de nota comum)…', options: ['Mantém o baixo e enfeita o acorde, voltando a ele', 'Muda de tom', 'Substitui o ii'], answer: 0, why: 'C7M – C°7 – C7M: o Dó fica; as outras vozes saem meio tom e voltam.' },
];

const l77: Lesson = {
  n: 77,
  id: 'l77',
  title: 'Acordes diminutos',
  minutes: 60,
  objectives: [
    'Consigo tocar o °7 de qualquer fundamental e reconhecer as inversões dele como outros °7.',
    'Consigo usar o °7 com função dominante, de passagem e auxiliar.',
    'Consigo tocar um arpejo de diminuta, mão direita, a 60 BPM em colcheias.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O acorde que divide a oitava',
      body: `O **acorde diminuto com 7ª**, cifrado **°7**, é feito só de **terças menores** empilhadas: Si–Ré (3 semitons), Ré–Fá (3), Fá–Lá♭ (3). **B°7 = Si, Ré, Fá, Lá♭.** A 7ª, Lá♭, é uma 7ª **diminuta**: 9 semitons acima da fundamental, a mesma tecla de uma 6ª maior.

Ele é diferente do **meio-diminuto** (ø) da lição anterior: o Bm7(♭5) tem Lá natural, uma 7ª menor. Só a última nota muda, e o som muda muito: o ø é melancólico, o °7 é tenso e instável.

Agora a parte curiosa. Se você empilhar mais uma terça menor sobre o Lá♭, chega ao Si de novo: **quatro terças menores fecham a oitava**. O °7 divide a oitava em quatro partes iguais. Por isso ele é **simétrico**: qualquer inversão tem o mesmo desenho, terça menor sobre terça menor.`,
    },
    { kind: 'exercise', id: 'l77-construir', exercise: items('Toque o °7', 'Fundamental embaixo, depois três terças menores (3 semitons cada).', dim7, 12, 48, 72, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'Só existem três diminutos',
      body: `Como toda inversão de um °7 é outro °7, as 12 fundamentais caem em só **três conjuntos de teclas**:

- **Dó, Mi♭, Sol♭, Lá**: C°7 = E♭°7 = G♭°7 (F♯°7) = A°7
- **Dó♯, Mi, Sol, Si♭**: C♯°7 = E°7 = G°7 = B♭°7 (A♯°7)
- **Ré, Fá, Lá♭, Si**: D°7 = F°7 = A♭°7 (G♯°7) = B°7

Os nomes mudam porque a **grafia segue a função**: o mesmo acorde é B°7 quando leva a Dó, e G♯°7 quando leva a Lá menor. Nas teclas, é igual. Algumas grafias pedem dobrado bemol (C°7 tem Si𝄫, que soa Lá): na cifra popular isso quase nunca aparece, mas a lógica é essa.`,
    },
    { kind: 'exercise', id: 'l77-baixo', exercise: items('O mesmo °7, outro baixo', 'A cifra com barra pede uma das notas do acorde no baixo. As teclas são as mesmas; só muda quem fica embaixo.', dimSlash, 8, 48, 72, 0.85, 'fade') },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'confundir °7 com ø',
      body: 'Bm7(♭5) = Si, Ré, Fá, **Lá**. B°7 = Si, Ré, Fá, **Lá♭**. Se a 7ª está um tom abaixo da oitava, é meio-diminuto; se está um tom e meio abaixo, é diminuto. Na dúvida, conte: o °7 só tem terças menores.',
    },
    {
      kind: 'text',
      title: 'Três funções do diminuto',
      body: `O °7 aparece em três papéis:

1. **Dominante.** Em Dó, o vii°7 é **B°7**: Si, Ré, Fá, Lá♭. Compare com o **G7(♭9)** da lição 76: Sol, Si, Ré, Fá, Lá♭. Tire o Sol e sobra o B°7. Ele é um dominante sem fundamental e resolve no Dó como o G7: Si sobe para Dó, Fá desce para Mi, Lá♭ desce para Sol. Em Lá menor, o mesmo papel é do **G♯°7** → Am.
2. **De passagem.** Entre dois acordes a um tom de distância, o °7 preenche o meio tom do baixo: **C7M – C♯°7 – Dm7**. O C♯°7 é, na verdade, o A7(♭9) sem o Lá: um V7/ii disfarçado.
3. **Auxiliar** (de nota comum). O baixo fica e o °7 enfeita o acorde: **C7M – C°7 – C7M**. Sai e volta, como uma bordadura de acordes.`,
    },
    {
      kind: 'example',
      title: 'As três funções',
      steps: [
        { say: '**Dominante**: F7M – G7 – **B°7** – C7M. O B°7 faz o papel do G7, ainda mais tenso.', play: progListen(['F7M', 'G7', 'B°7', 'C7M']) },
        { say: '**De passagem**: C7M – **C♯°7** – Dm7 – G7. Escute o baixo subindo Dó, Dó♯, Ré.', play: progListen(['C7M', 'C#°7', 'Dm7', 'G7']) },
        { say: '**Auxiliar**: C7M – **C°7** – C7M. O Dó fica embaixo; o resto sai e volta.', play: progListen(['C7M', 'C°7', 'C7M']) },
      ],
    },
    { kind: 'exercise', id: 'l77-funcoes', exercise: items('Diminutos em progressões', 'Toque os acordes em ordem; a cifra com barra pede o baixo. Leia o nome da função antes de tocar.', dimPassing, 6, 48, 72, 0.8, 'fade') },
    {
      kind: 'text',
      title: 'Arpejo de diminuta',
      body: `O arpejo do °7 está no trilho técnico desta unidade (meta da banca: 60 BPM em colcheias, mãos separadas). Como as teclas se repetem a cada terça menor, o desenho da mão é sempre o mesmo, e há um truque para o dedilhado: **comece numa inversão que tenha tecla branca embaixo**. Assim o polegar nunca cai numa preta.

Os três arpejos do exercício, um de cada conjunto, sobem uma oitava e voltam: **Si–Ré–Fá–Sol♯–Si** (G♯°7), **Mi–Sol–Si♭–Dó♯–Mi** (C♯°7) e **Lá–Dó–Ré♯–Fá♯–Lá** (D♯°7). Dedos **1-2-3-4-5** subindo e **4-3-2-1** descendo. A mão fica aberta numa oitava inteira: deixe o punho acompanhar, sem esticar os dedos à força.`,
    },
    {
      kind: 'callout',
      tone: 'saude',
      title: 'abertura de oitava sem tensão',
      body: 'Se a mão dói ao abrir a oitava, não force: toque as quatro notas de baixo, solte a mão, e só então alcance a oitava com o 5. Abrir a mão é desenho, não esforço.',
    },
    { kind: 'exercise', id: 'l77-arpejo', exercise: quickTimed('Arpejo de diminuta', 'Colcheias, mão direita, de 48 até 60 BPM. Notas iguais: o app mede a regularidade.', dimArp(60), { ladder: { from: 48, to: 60, step: 4 }, evenness: 45 }) },
    { kind: 'exercise', id: 'l77-ouvido', exercise: items('°7, 7 ou ø de ouvido', 'Ouça o acorde e toque um da mesma qualidade sobre a fundamental pedida.', earDim, 8, 48, 72, 0.85, 'off') },
  ],
  review: [dim7, dimSlash, choice(DIM_Q, 'diminutos')],
  checkpoint: [
    items('Diminutos sem dica', '10 acordes °7 com a fundamental embaixo. Meta: 9 de 10.', dim7, 10, 48, 72, 0.9, 'off'),
    items('Funções e ouvido', 'Progressões com diminuto, °7 com outro baixo, qualidade de ouvido e secundárias da lição 74.', mix([dimPassing, dimSlash, earDim, secDom]), 8, 48, 72, 0.85, 'off'),
    quickTimed('Arpejo a 60 BPM', 'Um arpejo sorteado, colcheias, mão direita.', dimArp(60), { evenness: 45 }),
  ],
  exit: [dim7, choice(DIM_Q, 'diminutos')],
};

const subV = chromaticChord({ keys: ['C', 'F', 'G', 'D', 'Bb'], romans: ['subV7', 'subV7/V', 'subV7/ii'], low: 48, high: 72 });
const guideSubV = chordSequence({
  sequences: ['C', 'F', 'Bb', 'Eb', 'G', 'D'].map((k) => ({ name: `ii–subV–I em ${keyName(k)} maior.`, symbols: (['ii7', 'subV7', 'I7M'] as (Roman | ChromRoman)[]).map((r) => chromaticSymbol(k, r)) })),
  voicing: 'guide',
  lead: 1,
});
const earSubV = progressionChoice({
  keys: ['C', 'F', 'G', 'D'],
  options: [{ label: 'V7 (o baixo cai uma 5ª)', romans: ['ii7', 'V7', 'I7M'] }, { label: 'subV7 (o baixo desce meio tom)', romans: ['ii7', 'subV7', 'I7M'] }],
  ask: 'O acorde do meio foi o V7 ou o subV7?',
});
const subVByEar = chromaticByEar({ keys: ['C', 'F', 'G'], progressions: [['ii7', 'subV7', 'I7M'], ['ii7', 'V7', 'I7M'], ['I7M', 'subV7/ii', 'ii7', 'subV7', 'I7M'], ['I7M', 'subV7/V', 'V7', 'I7M']], answer: 'bass' });

/** ii–V–I ou ii–subV–I com as duas mãos: as notas-guia do subV são as mesmas do V7; só o baixo muda. */
function iiSubVHands(rng: Rng, bpm: number): TimedTask {
  const k = pick(rng, KEYS_STAFF.filter((x) => ['C', 'F', 'G', 'Bb', 'D', 'Eb'].includes(x.key)));
  const t = 62 + ((k.pc - 2 + 12) % 12);
  const f = t - 7;
  const bass = (pc: number) => 40 + ((pc - 4 + 12) % 12);
  const right = `${sci(f)}+${sci(t)}:2 ${sci(f)}+${sci(t - 1)}:2 | ${sci(f - 1)}+${sci(t - 1)}:4`;
  const left = `${sci(bass(k.pc + 2))}:2 ${sci(bass(k.pc + 1))}:2 | ${sci(bass(k.pc))}:4`;
  const symbols = (['ii7', 'subV7', 'I7M'] as (Roman | ChromRoman)[]).map((r) => chromaticSymbol(k.key, r));
  return twoHandTask(`${right} | ${right}`, `${left} | ${left}`, {
    bpm,
    fifths: k.fifths,
    caption: `ii–subV–I em ${keyName(k.key)} maior: ${symbols.join(' – ')}, duas vezes. Direita: as notas-guia. Esquerda: a fundamental, descendo por semitons.`,
  });
}

const SUBV_Q: ChoiceQuestion[] = [
  { q: 'O trítono do G7 é…', options: ['Si e Fá', 'Sol e Ré', 'Si e Ré'], answer: 0, why: 'A 3ª (Si) e a 7ª (Fá) estão a 6 semitons uma da outra.' },
  { q: 'Qual dominante tem o mesmo trítono do G7?', options: ['D♭7 (Fá e Dó♭ = Si)', 'D7', 'C7'], answer: 0, why: 'O trítono divide a oitava ao meio; ele pertence a dois dominantes a um trítono de distância.' },
  { q: 'Em Dó maior, o subV7 (o substituto do G7) é…', options: ['D♭7', 'A♭7', 'F♯7'], answer: 0, why: 'Um trítono acima de Sol, ou meio tom acima do alvo (Dó).' },
  { q: 'No ii–subV–I em Dó, o baixo faz…', options: ['Ré, Ré♭, Dó: desce por semitons', 'Ré, Sol, Dó', 'Ré, Mi, Dó'], answer: 0, why: 'É o som característico do subV: o baixo escorrega meio tom para a casa.' },
  { q: 'O subV7/V em Dó maior é…', options: ['A♭7, que leva a G', 'D♭7, que leva a C', 'E♭7, que leva a Dm'], answer: 0, why: 'O substituto do D7 (V7/V): meio tom acima de Sol.' },
  { q: 'Na cifra romana, o subV7 também aparece como…', options: ['♭II7', 'IV7', 'vii°'], answer: 0, why: 'Ele fica sobre o 2º grau abaixado: em Dó, Ré♭.' },
];

const l78: Lesson = {
  n: 78,
  id: 'l78',
  title: 'Dominante substituta (subV7)',
  minutes: 60,
  objectives: [
    'Consigo explicar por que D♭7 substitui G7 (o trítono compartilhado).',
    'Consigo tocar o subV7, o subV7/V e o subV7/ii em cinco tons.',
    'Consigo tocar ii–subV–I com as duas mãos e reconhecer V7 × subV7 de ouvido.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'O trítono é a alma do V7',
      body: `O que faz o G7 puxar para o Dó? Não é a fundamental: é o **trítono** entre a 3ª e a 7ª, **Si e Fá**. O Si sobe para Dó, o Fá desce para Mi. As outras notas (Sol e Ré) só dão corpo.

O trítono tem 6 semitons: **metade da oitava**. Então, se você inverter Si–Fá, ganha Fá–Si, outro trítono com as mesmas teclas. E existe outro acorde dominante com essas duas notas: o **D♭7** = Ré♭, Fá, Lá♭, Dó♭. Dó♭ é a mesma tecla de Si. No D♭7, o Fá é a 3ª e o Dó♭ é a 7ª, o contrário do G7.

Como o trítono é o mesmo, o D♭7 também resolve no Dó. Ele se chama **dominante substituta**, ou **subV7**: o V7 trocado pelo dominante que fica um trítono acima (ou, mais fácil de achar, **meio tom acima do alvo**).`,
    },
    {
      kind: 'keys',
      low: 55,
      high: 72,
      lit: [n('B4'), n('F4')],
      labels: { [n('F4')]: 'Fá', [n('B4')]: 'Si / Dó♭' },
      caption: 'O mesmo trítono: no G7, Si é a 3ª e Fá a 7ª; no D♭7, Fá é a 3ª e Dó♭ (Si) a 7ª.',
    },
    {
      kind: 'example',
      title: 'V7 e subV7 lado a lado',
      steps: [
        { say: '**Dm7 – G7 – C7M**: o baixo faz Ré, Sol, Dó.', play: progListen(['Dm7', 'G7', 'C7M']) },
        { say: '**Dm7 – D♭7 – C7M**: o baixo escorrega Ré, Ré♭, Dó. Em cima, as notas-guia são as mesmas.', play: progListen(['Dm7', 'Db7', 'C7M']) },
        { say: 'O trítono sozinho, Fá e Si, e a resolução em Mi e Dó.', play: { bpm: 60, steps: [{ midis: [n('F4'), n('B4')], beats: 2 }, { midis: [n('E4'), n('C5')], beats: 3 }] }, keys: [n('F4'), n('B4')] },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'contar o trítono para o lado errado',
      body: 'O subV de G7 é D♭7, não D7 nem A♭7. Atalho seguro: **meio tom acima do acorde de chegada**. Vai para Dó? D♭7. Vai para Sol (V7/V)? A♭7. Vai para Ré menor (V7/ii)? E♭7.',
    },
    { kind: 'exercise', id: 'l78-construir', exercise: items('Toque o subV', 'Em cinco tons: o subV7 do I, do V e do ii. Ache o alvo e suba meio tom; acorde maior com 7ª menor.', subV, 10, 48, 72, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'ii–♭II7–I: o baixo cromático',
      body: `Na cifra romana o subV7 aparece como **♭II7** (sobre o 2º grau abaixado). A frase **ii–♭II7–I** é um clichê do jazz e da bossa: Dm7 – D♭7 – C7M.

O melhor desta troca: **as notas-guia da direita não mudam**. Fá–Dó → Fá–Si → Mi–Si, exatamente como no ii–V–I. Quem muda é só a **esquerda**, que deixa de saltar Ré → Sol → Dó e passa a descer Ré → Ré♭ → Dó. Você troca o V7 pelo subV7 mexendo só um dedo da mão esquerda.

O mesmo vale para as secundárias: o A7 (V7/ii) pode virar **E♭7**, o D7 (V7/V) pode virar **A♭7**. Num ii–V encadeado, a esquerda inteira vira uma linha cromática.`,
    },
    { kind: 'exercise', id: 'l78-guias', exercise: items('ii–subV–I nas notas-guia', 'Seis tons. Repare: as mesmas notas-guia do ii–V–I.', guideSubV, 6, 48, 84, 0.85, 'fade') },
    { kind: 'exercise', id: 'l78-maos', exercise: quickTimed('ii–subV–I com as duas mãos', 'Direita nas notas-guia, esquerda descendo por semitons, a 80 BPM. Tom novo a cada passada boa; 3 seguidas.', (rng) => iiSubVHands(rng, 80), { reps: 3, pass: { accuracy: 0.9 } }) },
    {
      kind: 'callout',
      tone: 'porque',
      title: 'por que o subV soa "moderno"',
      body: 'O D♭7 traz notas bem longe de Dó maior (Ré♭ e Lá♭). Elas soam como tensões alteradas do G7: Ré♭ é a 5ª diminuta do Sol, Lá♭ a 9ª menor. É o mesmo efeito de um G7(♭5,♭9), com o baixo andando por semitons.',
    },
    { kind: 'exercise', id: 'l78-ouvido', exercise: items('V7 ou subV7?', 'O app toca ii – ? – I. Ouça o baixo: cai uma 5ª ou desce meio tom?', earSubV, 8, 48, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l78-baixo', exercise: items('Ditado do baixo', 'O app toca 3 a 5 acordes com V7, subV7 ou subV secundário. Toque a fundamental de cada um, em ordem.', subVByEar, 5, 36, 72, 0.8, 'off') },
    { kind: 'exercise', id: 'l78-quiz', exercise: quiz('Trítono e substituição', 'Responda sem tocar.', SUBV_Q) },
  ],
  review: [subV, earSubV, choice(SUBV_Q, 'subv')],
  checkpoint: [
    items('subV sem dica', '10 acordes. Meta: 9 de 10.', subV, 10, 48, 72, 0.9, 'off'),
    items('Ouvido e revisão', 'V7 × subV7 de ouvido, diminutos e ii–V–i menor.', mix([earSubV, dim7, guideMinor]), 8, 48, 84, 0.85, 'off'),
    quickTimed('ii–subV–I no tempo', 'Tom sorteado, a 80 BPM.', (rng) => iiSubVHands(rng, 80), { pass: { accuracy: 0.9 } }),
  ],
  exit: [subV, choice(SUBV_Q, 'subv')],
};

const borrowed = chromaticChord({ keys: ['C', 'G', 'F', 'D'], romans: ['iv', 'bVI', 'bVII', 'bIII'], low: 48, high: 72 });
const borrowedSeq = chordSequence({
  sequences: [
    { name: 'IV – iv – I em Dó.', symbols: ['C', 'F', 'Fm', 'C'] },
    { name: 'IV – iv – I em Sol.', symbols: ['G', 'C', 'Cm', 'G'] },
    { name: 'IV – iv – I em Fá.', symbols: ['F', 'Bb', 'Bbm', 'F'] },
    { name: '♭VI – ♭VII – I em Dó.', symbols: ['C', 'Ab', 'Bb', 'C'] },
    { name: '♭VI – ♭VII – I em Sol.', symbols: ['G', 'Eb', 'F', 'G'] },
    { name: 'I – ♭VII – IV – I em Dó.', symbols: ['C', 'Bb', 'F', 'C'] },
    { name: 'I – ♭III – ♭VI – ♭VII em Dó.', symbols: ['C', 'Eb', 'Ab', 'Bb'] },
  ],
  lead: 2,
});
const borrowedHarm = harmonizeChromatic({
  key: 'C',
  fifths: -3,
  bars: [
    { notes: [n('C5'), n('Ab4'), n('F4'), n('Ab4')], accept: ['iv', 'ivm7'], say: 'Lá♭ é o 6º grau de Dó menor.' },
    { notes: [n('Bb4'), n('D5'), n('F5'), n('D5')], accept: ['bVII'], say: 'Si♭ é o 7º grau de Dó menor.' },
    { notes: [n('Eb5'), n('G4'), n('Bb4'), n('G4')], accept: ['bIII'], say: 'Mi♭ e Si♭: dois empréstimos juntos.' },
    { notes: [n('Ab4'), n('C5'), n('Eb5'), n('C5')], accept: ['bVI'], say: 'Lá♭, Dó e Mi♭.' },
  ],
});
const earIViv = progressionChoice({
  keys: ['C', 'G', 'F', 'D'],
  options: [{ label: 'IV (maior)', romans: ['I', 'IV', 'I'] }, { label: 'iv (menor, emprestado)', romans: ['I', 'iv', 'I'] }, { label: 'IV e depois iv', romans: ['I', 'IV', 'iv', 'I'] }],
  ask: 'O que veio antes da volta ao I: IV, iv ou os dois?',
});
const borrowedByEar = chromaticByEar({ keys: ['C', 'G'], progressions: [['I', 'IV', 'iv', 'I'], ['I', 'bVI', 'bVII', 'I'], ['I', 'bVII', 'IV', 'I'], ['I', 'V7/vi', 'vi', 'iv']], answer: 'chords' });

const BORROW_Q: ChoiceQuestion[] = [
  { q: 'O homônimo menor de Dó maior é…', options: ['Dó menor', 'Lá menor', 'Mi menor'], answer: 0, why: 'Homônimo: mesma tônica, outro modo. Lá menor é a relativa (mesma armadura).' },
  { q: 'Em Dó maior, o iv emprestado é…', options: ['Fm (Fá, Lá♭, Dó)', 'Dm', 'F7'], answer: 0, why: 'O IV de Dó menor: o Lá vira Lá♭.' },
  { q: 'Em Dó maior, o ♭VII é…', options: ['B♭', 'Bm', 'B°'], answer: 0, why: 'Si♭, Ré, Fá: vem do 7º grau de Dó menor (Si♭).' },
  { q: 'Em Sol maior, o ♭VI é…', options: ['E♭', 'Em', 'E'], answer: 0, why: 'Mi♭, Sol, Si♭: o 6º grau de Sol menor.' },
  { q: 'No caminho F – Fm – C, a voz que anda é…', options: ['Lá → Lá♭ → Sol, descendo por semitons', 'Fá → Sol → Lá', 'Dó → Ré → Mi'], answer: 0, why: 'É a linha cromática que dá ao iv o seu tom nostálgico.' },
  { q: 'Empréstimo modal muda de tom?', options: ['Não: a casa continua o I maior; só a cor muda', 'Sim, sempre', 'Só no refrão'], answer: 0, why: 'O acorde vem do homônimo, mas a frase resolve no I maior.' },
];

const l79: Lesson = {
  n: 79,
  id: 'l79',
  title: 'Empréstimo modal',
  minutes: 60,
  objectives: [
    'Consigo tocar iv, ♭VI, ♭VII e ♭III emprestados em Dó, Sol, Fá e Ré.',
    'Consigo rearmonizar uma frase trocando IV por iv.',
    'Consigo reconhecer IV × iv de ouvido e tirar progressões com empréstimo.',
  ],
  blocks: [
    {
      kind: 'text',
      title: 'Pegar acordes do homônimo menor',
      body: `**Dó maior** e **Dó menor** têm a mesma casa (Dó), mas escalas diferentes: Dó menor tem **Mi♭, Lá♭ e Si♭**. São tons **homônimos**. (Não confunda com a relativa, Lá menor, que tem a mesma armadura.)

O **empréstimo modal** é usar, numa música em Dó maior, um acorde que pertence a Dó menor. A casa continua sendo Dó maior; o acorde emprestado só traz uma sombra. Os mais usados:

- **iv = Fm** (Lá♭): o mais comum de todos.
- **♭VI = A♭** (Lá♭ e Mi♭).
- **♭VII = B♭** (Si♭).
- **♭III = E♭** (Mi♭ e Si♭).

O "♭" na cifra romana diz que a fundamental está meio tom abaixo do grau da escala maior: ♭VI fica sobre Lá♭, não sobre Lá.`,
    },
    { kind: 'exercise', id: 'l79-construir', exercise: items('Toque o emprestado', 'Em Dó, Sol, Fá e Ré maior. Pense no homônimo menor: qual nota abaixa?', borrowed, 10, 48, 72, 0.85, 'fade') },
    {
      kind: 'text',
      title: 'O iv menor das trilhas',
      body: `O empréstimo mais famoso é **IV – iv – I**: F – Fm – C. A voz do meio desce por semitons, **Lá → Lá♭ → Sol**, e o ouvido sente uma saudade antes de voltar para casa. É o acorde das trilhas de filme nos momentos de memória, das baladas dos anos 60 e de muita canção brasileira.

Ele também funciona sozinho: **I – iv – I** (C – Fm – C) é o "suspiro" de fim de cena. E aparece com 7ª ou 6ª: Fm7, Fm6.

Para rearmonizar uma melodia trocando IV por iv, confira só uma coisa: **a melodia não pode estar no Lá natural** naquele momento. Se a melodia toca Lá, o Fm (com Lá♭) choca. Se toca Fá, Dó ou uma nota de passagem, o iv cabe.`,
    },
    {
      kind: 'example',
      title: 'IV, iv e ♭VI–♭VII–I',
      steps: [
        { say: '**C – F – C**: o IV, claro e aberto.', play: progListen(['C', 'F', 'C']) },
        { say: '**C – F – Fm – C**: o Lá desce para Lá♭ e depois para Sol.', play: progListen(['C', 'F', 'Fm', 'C']), keys: [n('A4'), n('Ab4'), n('G4')] },
        { say: '**C – A♭ – B♭ – C**: ♭VI – ♭VII – I, a chegada "heroica" das trilhas de videogame e do rock.', play: progListen(['C', 'Ab', 'Bb', 'C']) },
      ],
    },
    {
      kind: 'callout',
      tone: 'erro',
      title: 'chamar o ♭VII de vii',
      body: 'Em Dó maior, o vii é B° (Si, Ré, Fá), do próprio campo. O ♭VII é **B♭ maior** (Si♭, Ré, Fá), emprestado. A fundamental é outra tecla, e o som também: o B♭ é largo e resolvido, o B° é tenso.',
    },
    { kind: 'exercise', id: 'l79-progressoes', exercise: items('Progressões com empréstimo', 'Toque os acordes conduzindo as vozes: notas comuns ficam, as outras andam pouco (até 2 semitons além do caminho mais curto).', borrowedSeq, 7, 48, 76, 0.85, 'fade') },
    { kind: 'exercise', id: 'l79-harmonizar', exercise: items('Qual empréstimo cabe?', 'A pauta usa a armadura de Dó menor, de onde vêm os acordes. Toque o acorde emprestado que contém as notas do compasso.', borrowedHarm, 6, 48, 72, 0.85, 'off') },
    {
      kind: 'text',
      title: 'Rearmonizar: When the Saints com iv',
      body: `Na música desta unidade, a frase "Oh Lord, I want to be in that number" fica sobre **Fá** por dois compassos. No segundo, a melodia tem só Mi e Fá: nada de Lá. Então o segundo compasso pode virar **Fm**, e a frase ganha o IV – iv – I.

No exercício abaixo, a direita toca a melodia (Mi–Sol, Sol–Fá, pausa e Mi–Fá, Sol–Mi) e a esquerda faz **C – F – Fm – C**, um acorde por compasso: Dó–Mi–Sol, Fá–Lá–Dó, Fá–Lá♭–Dó, Dó–Mi–Sol. A única diferença entre o 2º e o 3º compasso da esquerda é o dedo que desce do Lá para o Lá♭.`,
    },
    {
      kind: 'exercise',
      id: 'l79-santos',
      exercise: quickTimed(
        'IV – iv – I na música',
        'Melodia na direita, acordes na esquerda (a legenda diz quais), a 76 BPM. Duas passadas boas.',
        () => twoHandTask('E5:2 G5:2 | G5:2 F5:2 | r:2 E5 F5 | G5:2 E5:2', 'C3+E3+G3:4 | F3+A3+C4:4 | F3+Ab3+C4:4 | C3+E3+G3:4', { bpm: 76, caption: 'Esquerda: C (Dó–Mi–Sol), F (Fá–Lá–Dó), Fm (Fá–Lá♭–Dó), C.' }),
        { reps: 2 },
      ),
    },
    { kind: 'exercise', id: 'l79-ouvido', exercise: items('IV, iv ou os dois?', 'Ouça a cor do acorde antes da volta ao I.', earIViv, 8, 48, 72, 0.85, 'off') },
    { kind: 'exercise', id: 'l79-ditado', exercise: items('Ditado com empréstimo', 'O app toca 4 acordes; o primeiro é o I. Toque os acordes, em ordem, em qualquer posição.', borrowedByEar, 4, 48, 72, 0.75, 'off') },
  ],
  review: [borrowed, earIViv, choice(BORROW_Q, 'emprestimo')],
  checkpoint: [
    items('Empréstimos sem dica', '10 acordes em quatro tons. Meta: 9 de 10.', borrowed, 10, 48, 72, 0.9, 'off'),
    items('Ouvido e revisão', 'IV × iv de ouvido, empréstimo na pauta, subV e secundárias.', mix([earIViv, borrowedHarm, subV, secDom]), 8, 48, 72, 0.85, 'off'),
  ],
  exit: [borrowed, choice(BORROW_Q, 'emprestimo')],
};

// ---------- músicas ----------

// When the Saints Go Marching In: spiritual afro-americano tradicional (domínio público). Arranjo do Fermata, em Dó, com anacruse.
const SAINTS_R = 'r C5 E5 F5 | G5:4 | r C5 E5 F5 | G5:4 | r C5 E5 F5 | G5:2 E5:2 | C5:2 E5:2 | D5:4 | r E5 E5 D5 | C5:3 C5 | E5:2 G5:2 | G5:2 F5:2 | r:2 E5 F5 | G5:2 E5:2';
const C_TRIAD = 'C3+E3+G3';
const G7_SHELL = 'G2+B2+F3';
const SAINTS_L = `r:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | ${G7_SHELL}:4 | ${G7_SHELL}:4 | ${C_TRIAD}:4 | ${C_TRIAD}:4 | F3+A3+C4:4 | F3+A3+C4:4 | ${C_TRIAD}:4`;

const saints: SongSpec = {
  id: 'u10-santos',
  title: 'When the Saints Go Marching In',
  composer: 'spiritual afro-americano tradicional',
  arrangement: 'arranjo do Fermata: melodia na direita, I, IV e V7 na esquerda (tríades e shell do G7)',
  bpm: 84,
  beatsPerBar: 4,
  fifths: 0,
  right: `${SAINTS_R} | C5:2 D5:2 | C5:4`,
  left: `${SAINTS_L} | ${C_TRIAD}:2 ${G7_SHELL}:2 | ${C_TRIAD}:4`,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

// A rearmonização: ii–V no lugar do I (compassos 2 e 4), cadeia de secundárias (E7 → Am7/A7 → Dm7 → G7), C7 = V7/IV,
// Fm = iv emprestado e Dm7 – D♭7 – C7M (subV) no fim. Esquerda em shells 1-3-7.
const SAINTS_REHARM_L = [
  'r:4', 'C3+E3+B3:4', 'D3+F3+C4:2 G2+B2+F3:2', 'C3+E3+B3:4', 'D3+F3+C4:2 G2+B2+F3:2', 'C3+E3+B3:2 E3+G#3+D4:2', 'A2+C3+G3:2 A2+C#3+G3:2', 'D3+F3+C4:4',
  'G2+B2+F3:4', 'C3+E3+B3:4', 'C3+E3+Bb3:4', 'F3+A3+E4:4', 'F3+Ab3+C4:4', 'C3+E3+B3:4', 'D3+F3+C4:2 Db3+F3+B3:2', 'C3+E3+B3:4',
].join(' | ');

const saintsReharm: SongSpec = {
  id: 'u10-santos-rearm',
  title: 'When the Saints Go Marching In, rearmonizada',
  composer: 'spiritual afro-americano tradicional',
  arrangement: 'rearmonização do Fermata: ii–V, secundárias (E7, A7, C7), iv emprestado (Fm) e subV (D♭7) na esquerda em shells; no penúltimo compasso a melodia desce para Si, a 7ª do D♭7',
  bpm: 76,
  beatsPerBar: 4,
  fifths: 0,
  right: `${SAINTS_R} | C5:2 B4:2 | C5:4`,
  left: SAINTS_REHARM_L,
  hands: 'duas',
  pass: { accuracy: 0.85 },
};

const unit: Unit = {
  n: 10,
  id: 'u10',
  title: 'Harmonia cromática',
  goal: 'Usar dominantes secundárias, ii–V em qualquer tom, diminutos, subV, empréstimo modal e modulação para rearmonizar uma melodia simples.',
  technique: 'Arpejos de tônica, V7 e °7, mãos separadas, de 60 rumo a 80–92 BPM em colcheias (referência: RCM Levels 5–6). Use a escada de andamento do treino nos dias sem lição nova.',
  lessons: [l74, l75, l76, l77, l78, l79],
  songs: [saints, saintsReharm],
  final: {
    songId: 'u10-santos-rearm',
    brief: 'A melodia de When the Saints, já tocada com I, IV e V7, agora com a harmonia da unidade inteira: ii–V no lugar do I, a cadeia E7 → A7 → Dm7 → G7, o C7 que leva ao Fá, o Fm emprestado e o D♭7 no lugar do G7 no fim. A esquerda toca shells; a direita, a melodia. Antes de tocar, escreva o grau de cada acorde em cima da cifra: é a análise que o projeto pede.',
  },
};

export default unit;
