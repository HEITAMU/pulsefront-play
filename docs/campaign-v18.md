# v1.8 campaign, music and home

- All 100 stages now use beat-coordinated enemies, rather than reverting to legacy spawns after stage 10.
- Ten encounter families per chapter: alternating sides, armor, crowds, pincer, escorts, syncopation, echoes, breathing room, mixed formations, boss.
- Shields join from 11, repair units from 21, splitters from 31, lateral rhythmic movement from 41. Swarm size, elite health and speed have explicit upper bounds. Every tenth level remains a boss.
- Existing on-beat weapon cues, swipe tutorial, growing secondary attacks and saved progression remain. The final six-second spawn taper, final two-second spawn cutoff, five-second audio fade, and at least 3.5-second clear-field settlement remain.
- Music is composed for the full stage. Intro, verse/answer, breakdown, build, hook with rests, and tonic ending replace replaying a short loop. Same-genre variants also change instruments, phrase rhythms, bass pickups and chord inversions. High-frequency hats and stacked climax accents are reduced.
- Home has a campaign card, weapon development tiles and cosmetics/music utility row. Finisher selection is removed from home and pause. Old finisher choices migrate to bass wave.
- Main wave/laser weapon switching remains; these are distinct from removed overheat alternatives.
- Upper cannon hit target extends 18 CSS pixels; transparent geometry does not alter visuals or aiming origin.

Verification uses deterministic combat simulation (not human playtesting), music event checks and public browser interaction. Subjective music fatigue and actual iPhone frame/audio performance require listening and play on the handset; no guarantee is inferred from event uniqueness alone.

## Verification recorded for this release

- Existing npm test suite passed (legacy encounter regressions, current gesture/cue/support behavior, timings, audio endings, economy and effect budgets).
- Current campaign: all 100 stages simulated on a 390×844 field with no permanent upgrades, using exact rhythm and 20% missed-beat strategies. Exact rhythm cleared all stages. Missed-beat runs exposed spikes at 26 and 82; reduced elite HP by 20% for armor-breakthrough and syncopated-charge families after stage 10. Rechecked all 18 affected stages under both strategies: all cleared. Other families were unchanged.
- Additional 320×568 checks at 3/4/5 and each tenth stage, with 60ms input offset and two missed beats per six: all cleared. Hold-only strategy lost at stage 3 and most sampled later stages, while stage 4 survived at 45 HP in that seed. No claim that all players or seeds have identical outcomes.
- Music: 100 unique full-stage arrangements, distinct beyond key transposition; 10 styles; exact beat timing; 60–90 second timeline bounds; five-second fade and no settlement jingle checked.
