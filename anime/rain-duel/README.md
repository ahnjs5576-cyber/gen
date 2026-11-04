# 雨中の決闘 — Rain Duel

An 80-second scene in the style of a hand-painted 1990s Japanese OVA: two rival
ninja (an original blond brawler and an original black-haired swordsman,
designed as archetypes, no signature marks from any existing series) fight on a
flooded mountain-shrine courtyard on a stormy night.

**Open `rain-duel.html` in a browser, then click to play.** Space pauses, R restarts.
`rain-duel.html?t=36` shows a still from second 36.

Everything is generated in code at load time: no images, fonts, audio files or
libraries.

| Module | Role |
| --- | --- |
| `src/01_core.js` | RNG, noise, splines with hard corners, variable-width ink lines, cel paint with hard shadow bands and colored held lines |
| `src/02_paint.js` | Poster-colour brushwork: skies, storm clouds, mountains, cedars, torii, stone lanterns, flooded pavement, reflections, paper texture |
| `src/03_backgrounds.js` | The painted background boards for each setup |
| `src/04_figure.js` | Character construction model: skeleton keys → freshly redrawn body, head turnaround, hair, clothes, weapons; night/flash/fire/electric colour models |
| `src/05_fx.js` | Hand-drawn effects: rain cel cycles, splashes, lightning, sparks, blood, water crowns, flame, electricity, smoke, speed and concentration lines, impact frames |
| `src/06_post.js` | Film finish: gate weave, grain, halation, lifted blacks, vignette, dust |
| `src/07*_*.js` | Exposure-sheet helpers and the 20 shots |
| `src/08_audio.js` | WebAudio sound design and score (rain, wind, thunder, steel, hits, fire, electricity, taiko, drone, bamboo flute) |
| `src/90_main.js` | Loader and playback driven by the audio clock |

Rebuild after editing a module:

```bash
node build.mjs   # concatenates src/*.js into template.html → rain-duel.html
```
