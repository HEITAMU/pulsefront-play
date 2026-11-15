# 脉冲防线 / PULSEFRONT 1.9.1

Mobile portrait rhythm shooter: 100 stages, ten musical styles, original procedural space visuals.

## Main cannon

Hold for thin circles. Tap a beat, or hit the turning point while swaying left/right, for a strong attack. Laser switching and the upward-swipe tutorial are removed. Before cannon level 5, the strong hit brightens the circle. Cannon levels 5/10/15/20 unlock a directional crest, wider wave, stacked wave, and heavier wave. Touch position aims the crest; the center aims forward. The upper touch rim extends 18 CSS pixels beyond the button.

A crest's combined directional bonus is 1.6 times the maximum thin-circle damage possible in one beat, including maximum rate and temporary multipliers. Non-beat shots have a 160ms minimum interval. Stacked waves divide this bonus rather than duplicating it. Correct manual beats may bypass a pending automatic-shot cooldown and are awarded once per beat.

## Secondary attacks and enemy pressure

Six neon secondaries retain streak-driven volley count and flight progression. Base damage is 30% of v1.8; streak rank no longer multiplies damage. Heavy, charger and boss targets take only 35% of that support damage. Thin off-beat circles also lose 65% damage against these armored targets. Off-beat energy gain is 0.35 instead of 2.4; passive overheat no longer repeatedly rescues an unattended run. Overheat always uses the bass wave. The secondary reassurance tip was removed.

First two stages introduce the controls; pressure starts in stage 3. Beyond stage 10, armor, escort, pincer, repair, splitter and rhythm-movement combinations change the encounter. Correct rhythm interrupts the aimed assault group. Growth remains outside the level, earned star dust persists on losses, and saved progress is retained. Main-cannon level cap is 20; early upgrades cost 30/40/50/60/70 star dust.

## Music and ending

100 complete synthesized arrangements across Funk, blues, Disco, soul, jazz, Boogie, Latin, breaks, electro and blues rock. Intro, verse/answer, break, build, hook, rests and a tonic ending cover the whole stage. Stages last roughly 60–90 seconds including settlement. Spawns taper from the final six seconds and stop in the final two; music fades during the final five. Clearing waits at least 3.5 seconds and respects effect tails. No victory guitar jingle or vibration.

## Seamless settlement

After clear-field and effect tails finish, the bottom firing controls fade into an in-scene settlement dock. No full-screen result modal or dimmed backdrop is opened. Next-stage and home-to-battle transitions crossfade the lower controls while keeping the space background visible. Failure uses the same dock with retry and eligible revive actions. Rewards are still awarded exactly once in the finish handler.

## Validation

`npm test` runs legacy combat regressions plus current wave/peak/support rules, audio, input, economy and render-budget checks. `node tests/pulse-rules.mjs` checks the maximum-rate damage invariant, evolution and secondary/armor multipliers. `node tests/pulse-balance.mjs` simulates current hold/rhythm/missed-beat play; optional `LEVELS`, `WIDTH` and `SEED` select cases. These simulations do not replace human difficulty evaluation or physical iPhone audio/performance checks.

Static HTML/CSS/ES modules, served from the repository root. Reward ads remain disabled pending an approved publisher setup; no live ad revenue is claimed.
