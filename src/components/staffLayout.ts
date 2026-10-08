// Quantas notas da pauta cabem na tela, e a partir de qual. Separado para testar.

export const FIRST_X = 116;
export const GAP = 64;
export const END_PAD = 44;

/** Quantas notas cabem e em que escala, para uma largura disponível. Exportado para teste. */
export function staffLayout(width: number, total: number) {
  const scale = Math.min(1, Math.max(0.62, width / 560));
  const natural = width / scale;
  const fit = Math.floor((natural - FIRST_X - END_PAD) / GAP) + 1;
  const visible = Math.max(3, Math.min(total, fit));
  return { scale, visible };
}

export function windowStart(current: number, visible: number, total: number): number {
  // A nota ativa fica perto do começo, deixando ver as próximas.
  const lead = Math.min(1, visible - 1);
  return Math.max(0, Math.min(current - lead, total - visible));
}

