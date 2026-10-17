// Manter a tela acesa: tocar no piano (MIDI) não conta como "mexer no computador" para o sistema, então o
// notebook escurecia e suspendia no meio do estudo. Enquanto houver atividade no app (nota tocada, clique,
// tecla, rolagem) nos últimos minutos e a aba estiver visível, o app pede ao navegador para não apagar a tela.
// Parado por mais tempo que isso, solta o pedido e o notebook volta a suspender normalmente.

/** Minutos sem nenhuma atividade até o app deixar o notebook dormir. */
export const AWAKE_IDLE_MIN = 15;

export function shouldKeepAwake(lastActivity: number, now: number, visible: boolean): boolean {
  return visible && now - lastActivity < AWAKE_IDLE_MIN * 60_000;
}
