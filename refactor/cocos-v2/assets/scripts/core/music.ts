/** A clear 108 BPM backbeat shared by every mode. No swing or tempo changes. */
export const BPM = 108;
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const stepTime = (track: any, step: number) => step * track.beat / 4;
const tracks = new Map<number, any>();
export function getTrack(level = 1) {
  const variant = Math.max(0, Math.floor((level - 1) / 10)) % 3;
  if (tracks.has(variant)) return tracks.get(variant);
  const key = [40, 43, 38][variant], bars = 48, beat = 60 / BPM;
  const track: any = { bpm: BPM, beat, bars, key, swing: 0, name: '稳拍推进', genre: 'Straight Funk', events: [], byStep: Array.from({ length: bars * 16 }, () => []) };
  const add = (step: number, instrument: string, midi: number, duration: number, velocity: number) => { const event = { step, instrument, midi, duration, velocity }; track.events.push(event); track.byStep[step].push(event); };
  for (let bar = 0; bar < bars; bar++) {
    const base = bar * 16, root = key + [0, 0, 5, 7][Math.floor(bar / 4) % 4];
    // A kick on EVERY quarter note. Backbeat on 2 and 4, even through fills.
    for (let q = 0; q < 4; q++) { add(base + q * 4, 'kick', 0, .19, q === 0 ? 1 : .84); if (q % 2) add(base + q * 4, 'snare', 0, .15, .72); }
    for (let eighth = 0; eighth < 8; eighth++) add(base + eighth * 2, 'hat', 0, .055, eighth % 2 ? .30 : .20);
    for (const [step, note, velocity] of [[0, 0, .76], [3, 12, .42], [6, 7, .60], [8, 0, .72], [10, 10, .47], [14, 7, .55]]) add(base + step, 'bass', root + note, .24, velocity);
    // Chords are soft and short so the beat remains the loudest timing cue.
    if (bar >= 2) for (const step of [2, 10]) for (const note of [12, 15, 19]) add(base + step, 'keys', root + note, .23, .19);
    if (bar % 8 === 7) { add(base + 13, 'snare', 0, .08, .16); add(base + 15, 'snare', 0, .08, .21); }
  }
  tracks.set(variant, track); return track;
}
