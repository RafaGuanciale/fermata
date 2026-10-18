// Textos das estatísticas: minutos, trechos, horas e datas no formato brasileiro.

export const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`);

export const durText = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : minutesText(ms / 60_000));

export { formatPercent as pct } from '../format';

export const rangeText = (p: { from?: number; to?: number }) =>
  p.from && p.to ? (p.from === p.to ? `compasso ${p.from}` : `c. ${p.from}–${p.to}`) : 'trecho não registrado';

export const handText = (h?: string) => (h === 'direita' ? 'mão direita' : h === 'esquerda' ? 'mão esquerda' : h === 'duas' ? 'duas mãos' : null);

const hm = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const clock = (t: number) => hm.format(t);

const longDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
export const dayTitle = (day: string) => {
  const s = longDay.format(new Date(`${day}T12:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const short = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
export const dayShort = (day: string) => short.format(new Date(`${day}T12:00`));

export const ordinal = (n: number) => `${n}ª`;
