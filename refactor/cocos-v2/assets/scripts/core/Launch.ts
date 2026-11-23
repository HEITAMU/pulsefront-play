/** The home instrument stays alive while its surrounding interface leaves. */
export const LAUNCH_SECONDS = .78;
export const launchEase = (elapsed: number) => {
  const t = Math.max(0, Math.min(1, elapsed / LAUNCH_SECONDS));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export function scatterPose(x: number, y: number, centerY: number, width: number, height: number) {
  const dx = x - 210, dy = y - centerY, length = Math.max(1, Math.hypot(dx, dy));
  return { x: dx / length * (width * .5 + 140), y: dy / length * (height * .5 + 100), angle: (dx < 0 ? -1 : 1) * 7 };
}
/** One launch, one ready signal. Background time never finishes the transition. */
export class LaunchGate {
  elapsed = 0; ready = false; finished = false;
  step(dt: number, hidden = false) {
    if (hidden || this.finished) return false;
    this.elapsed = Math.min(LAUNCH_SECONDS, this.elapsed + Math.max(0, Math.min(.1, dt)));
    if (this.ready && this.elapsed >= LAUNCH_SECONDS - 1e-9) { this.finished = true; return true; }
    return false;
  }
  get progress() { return launchEase(this.elapsed); }
}
