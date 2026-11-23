/** One full viewport, with a fixed-width control column only on wide screens. */
export function viewportLayout(frameWidth: number, frameHeight: number) {
  const ratio = Math.max(.35, frameHeight / Math.max(1, frameWidth));
  const height = Math.max(680, 420 * ratio);
  const width = height / ratio;
  return { width, height, left: (width - 420) / 2 };
}
export function homeLayout(height: number, top: number, bottom: number) {
  const base = height - bottom;
  const heroTop = top + 146, heroBottom = base - 204;
  const heroSize = Math.min(328, Math.max(120, (heroBottom - heroTop) / 1.18));
  return { heroY: (heroTop + heroBottom + heroSize * .18) / 2, heroSize, dailyY: base - 184, navY: base - 101, footerY: base - 29 };
}
/** View-only remap; daily simulation stays 420 × 840 on all phones. */
export function arenaLayout(height: number, safeTop: number, safeBottom: number) {
  const cannonY = height - Math.max(114, safeBottom + 99);
  const defenseY = cannonY - 118;
  const top = Math.min(safeTop + 148, defenseY - 190);
  const scale = (defenseY - top) / (580 - 104);
  return { cannonY, defenseY, top, scale };
}
export function arenaY(y: number, layout: ReturnType<typeof arenaLayout>) {
  return y > 580 ? layout.defenseY + y - 580 : layout.top + (y - 104) * layout.scale;
}
