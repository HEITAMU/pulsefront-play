# 脉冲防线 / PULSEFRONT 1.6.0

Portrait one-button space shooter with100 stages and100 synthesized groove arrangements. Hold to fire; manually hit the beat for bonuses. Move inside the button to add a thick laser or smoothly thickened wave sector; baseline attacks remain active elsewhere.

## Current gameplay

Stages normally last60–90seconds. Denser swarms and more elite pressure raise difficulty across the campaign. Six independent neon attacks unlock at stages 1/4/8/15/25/40; equip up to two. Every three manual strong beats grows the additional volley (1,2,3...). One missed beat is tolerated; two reset the streak but retain volley size for the stage. Usage, kills and climax groups unlock flight variants. Three one-time challenges reward star dust. Old upgrade choices and ten random heat effects are removed. Free wave/laser/gravity finishers are selectable from home. Gravity pulls then explodes. Three boss patterns rotate through the campaign.

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
