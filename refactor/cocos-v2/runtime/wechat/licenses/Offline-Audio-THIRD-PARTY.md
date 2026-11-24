# Offline music renderer notices

`assets/scripts/vendor/OfflineAudioEngine.ts` is a self-contained ES2018 bundle
used only to render PCM data. It does not open an audio device. The game sends the
resulting WAV file to the platform's native audio player.

The bundle uses these packages, with license declarations and authors retained
from their distributed `package.json` metadata:

| Package | Version | Declared license | Attribution |
| --- | --- | --- | --- |
| web-audio-engine | 0.13.4 | MIT | Nao Yonamine / mohayonao |
| biquad-coeffs-webaudio | 1.2.0 | MIT | Nao Yonamine / mohayonao |
| biquad-coeffs-webaudio-v1 | 1.2.0 | MIT | Nao Yonamine / mohayonao |
| biquad-coeffs-webaudio-v2 | 1.2.0 | MIT | Nao Yonamine / mohayonao |
| fourier-transform | 1.1.2 | MIT | Dima Yv / dfcreative |
| nmap | 1.1.0 | MIT | Nao Yonamine / mohayonao |
| scijs-window-functions | 2.0.2 | MIT | Ricky Reusser |
| audio-effect | 1.0.1 | ISC | audiojs contributors; npm maintainer dy |

Sources:

- https://github.com/mohayonao/web-audio-engine
- https://github.com/audiojs/audio-effect
- https://www.npmjs.com/package/biquad-coeffs-webaudio
- https://www.npmjs.com/package/fourier-transform
- https://www.npmjs.com/package/nmap
- https://www.npmjs.com/package/scijs-window-functions

The distributed packages did not contain separate license files or copyright
years. Their declared MIT / ISC permission texts are included alongside this
notice, with the package attributions above preserved.

Build adaptations: export only the rendering context and compressor, supply a
small game-local event emitter, and omit encoded-file codecs. The original
legacy compressor node is a passthrough; the game explicitly bypasses that node
and applies the `audio-effect` linked stereo compressor to PCM with threshold
-15 dB, knee 14 dB, ratio 7, attack 0.003 s, release 0.14 s and no makeup gain.
The game score, instruments, note envelopes and timing come from its existing
`Soundtrack`; this offline DSP is not claimed to be sample-identical to a native
browser Web Audio implementation.

Reproduction helper used for this bundle:
`research/c63-render-experiment/build-production-vendor.cjs` in the working
development environment. The delivered Creator source includes the already
bundled renderer and does not require npm, a Node audio device or a server.
