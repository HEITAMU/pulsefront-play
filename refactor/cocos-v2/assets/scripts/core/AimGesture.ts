const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** Relative drag keeps a new touch from snapping the weapon to a new angle. */
export class AimGesture {
  active = false; aim = -Math.PI / 2; private x = 0; private originX = 0; private originAim = 0;
  private extreme = 0; private direction = 0; private leg = 0;
  start(x: number, aim: number) { this.active = true; this.x = this.originX = this.extreme = x; this.aim = this.originAim = aim; this.direction = 0; this.leg = 0; return aim; }
  move(x: number) {
    if (!this.active) return false;
    const dx = x - this.x; this.x = x;
    const requested = this.originAim + (x - this.originX) * .0065;
    this.aim = clamp(requested, -Math.PI / 2 - .96, -Math.PI / 2 + .96);
    if (this.aim !== requested) { this.originX = x; this.originAim = this.aim; }
    if (Math.abs(dx) < .25) return false;
    const direction = dx > 0 ? 1 : -1;
    if (!this.direction) { this.direction = direction; this.extreme = x; this.leg = Math.abs(dx); return false; }
    if (direction === this.direction) { this.leg += Math.abs(dx); this.extreme = x; return false; }
    const reversed = Math.abs(x - this.extreme);
    if (reversed < 8) return false;
    const valid = this.leg >= 20;
    this.direction = direction; this.leg = reversed; this.extreme = x;
    return valid;
  }
  end() { this.active = false; this.direction = 0; this.leg = 0; }
}
