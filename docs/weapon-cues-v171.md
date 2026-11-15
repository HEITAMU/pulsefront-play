# v1.7.1 — readable weapon cues

- Announced groups stage inside targetable screen bounds for two beats before advancing. This fixes switching into a laser opening shot before targets existed.
- The existing lower rhythm capsule shows the threat and recommended weapon, then 2 → 1 → now. Recommended weapon controls glow. The main button says keep the current weapon when already correct; switching is not compulsory.
- Correct weapon + target beat interrupts that cohort once, deals a bounded counter hit and briefly staggers it. Click, sway and switch keep their shared beat credit.
- Stage 2 introduces a light armored target. Stage 3 begins tougher chargers; late trial stages still punish idle hold. Cue-following strategy, without directional aim assistance, clears all ten stages across two phone sizes and three seeds.
- Laser switch sound plays only for a successful beat-enhanced switch. It is a downward low bass glide of 90 ms maximum, with a zeroed envelope and immediate source stop; no noise tail, echo or reverb. Ordinary switches are silent. Strong-beat drum is suppressed for the switch to keep the bass articulation clear.

Validation adds staging/countdown/interception/deduplication tests and 60 cue-follow simulations; existing 120 trial runs remain. Later enemy variants are not included in this patch.

## Earn the easy second half

Support volleys now also grow damage (+12% per earned volley rank up to rank 12), flight speed (+2.5% per rank up to 12), and penetration (+1 target every four ranks up to three extra). Volley count continues its existing growth with bounded simultaneous projectiles. Ranks 4/8/12 announce earned milestones; the lower capsule tracks retained support count, and a developed climax is labeled harvest. A missed sequence resets only current beat progress; earned support power lasts to the end of the run. Enemy HP, speed and spawn counts do not react to player rank. All growth resets on a new run. Successful laser-switch bass only; no ordinary-switch sound.
