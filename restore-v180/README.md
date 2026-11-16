# 脉冲防线 / PULSEFRONT 1.8.1

Built on the user-approved v1.8 visual baseline, including complete circular waves and smoothly tapered directional crests. The main cannon is wave-only. Aim is clamped to 0.16 radians above either horizontal side; moving below the button cannot turn the crest downward. The existing line width, glow, crest geometry and travel speed are preserved.

## Beat-driven cannon growth

Holding emits thin rings. A new tap or alternating sway apex within 125 ms of a beat earns one strong attack per beat, even between held shots. Power levels 0–4 use a bright strong ring; level 5 unlocks directional crests, level 10 increases their damage, level 15 splits the crest into two successive waves, and level 20 increases crest damage again. Five initial power upgrades cost 250 star dust total. Existing progress and upgrade levels remain saved.

Thin rings deal 4 × chapter weapon scale × power growth before existing overdrive/climax multipliers. Crest damage is budgeted above the maximum thin-ring damage in the same beat. Ordinary enemies gain 20% health in stages 1–2 and 35% thereafter; existing spawning, movement, attacks, shields, healing and boss behaviors remain. Heavy armor now responds to crests in place of laser. Existing rhythm interception still interrupts the telegraphed group.

Support base damage is 25% of the baseline and no longer gains a per-streak damage multiplier. Streaks retain volley count, movement speed and penetration growth. Passive overheat energy and non-directional bonus bursts are reduced so holding cannot replace accurate beats.

## Verification

`node tests/run.mjs` checks current crest rules, growth, support damage, music/tails/render limits and 100 stages with hold, beat and 20%-miss strategies. Simulations use progressive upgrades and accurate target selection; they are not human playtesting. Historical laser and unattended-clear tests remain archived and are excluded from the current runner.

## Current gameplay

Stages normally last60–90seconds. Denser swarms and more elite pressure raise difficulty across the campaign. Six independent neon attacks unlock at stages 1/4/8/15/25/40; equip up to two. Every three manual strong beats grows the additional volley (1,2,3...). One missed beat is tolerated; two reset the streak but retain volley size for the stage. Usage, kills and climax groups unlock flight variants. Three one-time challenges reward star dust. Old upgrade choices and ten random heat effects are removed. Overheat always releases the bass wave. Home and pause finisher selectors are removed; old selections migrate to wave. Three boss patterns rotate through the campaign.

The musical build and climax share combat timing. Four matched beats in the climax trigger an extra attack; missing a beat preserves accumulated hits. Holding still gets climax firepower. During the final6seconds, spawn pressure reduces; spawning stops for the final2seconds. Music fades over the last5seconds. After the field clears, settlement waits at least3.5seconds and respects remaining effect tails; no guitar or separate victory jingle plays. Retries remain free.

## Visuals

The original procedural planet/enemy/turret style is retained. Three star-depth layers, slow parallax, larger offscreen planet and dim distant moon add depth. No generated photographic background is used. Battle UI occupies a compact upper capsule; phase information sits above the cannon. Enemy sprites and backgrounds are cached, effects/rings bounded and DPR capped.

## Music and economy

Ten genres rotate through100 distinct arrangements: Funk, swing blues, Disco, Neo-Soul, Jazz Funk, Boogie, Latin Funk, Breakbeat, Electro Funk, blues rock. Jukebox previews and separate music/effects volumes are available. Star dust buys six cosmetic themes and one optional continuation. Progress is stored in this browser only.

Rewarded-ad adapter exists but remains disabled: no approved publisher setup has been supplied, no third-party ad code loads and no live revenue is claimed. No live revenue is claimed.

## Validation and preview

Run npm test for combat, music timing, economy, ad failures, expanded modules, density and bounded rendering checks. See docs/verification.md for actual coverage and limits. Tests simulate mobile dimensions; physical-phone performance and subjective listening require handset evaluation.

Serve the repository root over HTTP on GitHub Pages. QA harnesses live in tests and are excluded from published assets. Source is plainHTML/CSS/ESmodules with no runtime packages or asset downloads.

Button audio uses a warm press, muted strong-beat drum, bounded rising support cue and quiet release air; holding does not repeat button sounds. No vibration.

Home groups campaign, weapon development, and cosmetics/music into separate visible panels. The upper cannon touch rim extends 18 CSS pixels without changing the visual button.
