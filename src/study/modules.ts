import type { PhotoKey } from '../media/photos';

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** false = aparece na lista como "em breve" */
  ready: boolean;
}

export interface Module {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  photo: PhotoKey;
  lessons: Lesson[];
}

/** A ordem dos módulos é a ordem sugerida de estudo. */
export const MODULES: Module[] = [
  {
    id: 'teclado',
    title: 'Teclado',
    eyebrow: 'Onde fica cada nota',
    description: 'As teclas brancas e pretas, as oitavas e como achar qualquer nota sem contar uma por uma.',
    photo: 'teclado',
    lessons: [
      { id: 'teclas-e-oitavas', title: 'Teclas e oitavas', summary: 'O desenho de 2 e 3 teclas pretas e onde ficam todos os Dós.', ready: true },
      { id: 'sustenidos-e-bemois', title: 'Sustenidos e bemóis', summary: 'Por que a mesma tecla preta tem dois nomes.', ready: false },
    ],
  },
  {
    id: 'leitura',
    title: 'Leitura',
    eyebrow: 'Pauta e claves',
    description: 'Ler as notas na pauta: linhas, espaços, claves e linhas suplementares.',
    photo: 'leitura',
    lessons: [
      { id: 'clave-de-sol', title: 'Notas na clave de sol', summary: 'Linhas e espaços da mão direita, com um jeito fácil de lembrar.', ready: true },
      { id: 'clave-de-fa', title: 'Notas na clave de fá', summary: 'A pauta da mão esquerda.', ready: false },
      { id: 'linhas-suplementares', title: 'Linhas suplementares', summary: 'As notas acima e abaixo da pauta, como o Dó central.', ready: false },
    ],
  },
  {
    id: 'ritmo',
    title: 'Ritmo',
    eyebrow: 'Figuras e compasso',
    description: 'Quanto tempo dura cada nota e como contar um compasso.',
    photo: 'ritmo',
    lessons: [
      { id: 'figuras', title: 'Figuras e pausas', summary: 'Semibreve, mínima, semínima e colcheia.', ready: false },
      { id: 'compasso', title: 'Compasso e pulso', summary: 'Contar 1, 2, 3, 4 com o metrônomo.', ready: false },
    ],
  },
  {
    id: 'acordes',
    title: 'Acordes',
    eyebrow: 'Tríades e inversões',
    description: 'Montar qualquer acorde maior ou menor a partir de uma fórmula, e tocar nas três posições.',
    photo: 'acordes',
    lessons: [
      { id: 'triades', title: 'Tríades maiores e menores', summary: 'Fundamental, terça e quinta em todos os tons, com inversões.', ready: true },
      { id: 'setimas', title: 'Acordes com sétima', summary: 'O quarto som que dá cor ao acorde.', ready: false },
    ],
  },
  {
    id: 'escalas',
    title: 'Escalas',
    eyebrow: 'Tons e semitons',
    description: 'A fórmula da escala maior e como ela muda de tom para tom.',
    photo: 'escalas',
    lessons: [
      { id: 'escala-maior', title: 'Escala maior', summary: 'Tom, tom, semitom, tom, tom, tom, semitom.', ready: true },
      { id: 'escala-menor', title: 'Escala menor natural', summary: 'A escala relativa, com outro clima.', ready: false },
    ],
  },
  {
    id: 'harmonia',
    title: 'Harmonia',
    eyebrow: 'Campo harmônico',
    description: 'Quais acordes combinam num tom e as sequências mais usadas nas músicas.',
    photo: 'harmonia',
    lessons: [
      { id: 'campo-harmonico', title: 'Campo harmônico maior', summary: 'Os sete acordes de um tom.', ready: false },
      { id: 'cadencias', title: 'Cadências', summary: 'I–IV–V e II–V–I, a base de muitas músicas.', ready: false },
    ],
  },
];

export function findModule(id: string) {
  return MODULES.find((m) => m.id === id);
}

export function lessonKey(moduleId: string, lessonId: string) {
  return `${moduleId}/${lessonId}`;
}
