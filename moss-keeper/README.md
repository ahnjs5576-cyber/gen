# The Moss Keeper

A short hand-drawn-style anime scene: at sunrise an ancient overgrown giant wakes in a forgotten forest and rises into the golden sky.

**Watch it live:** https://chetaslua.github.io/moss-keeper/

Made with Fable 5.5.

## The file

Everything is in one file, [`index.html`](index.html), with no dependencies and no build step. Download it and open it in any browser; it works offline.

- The film is embedded in the page as base64 MP4 and decoded into a Blob at load time
- A custom player: play/pause, seek bar, fullscreen and a sound toggle, with autoplay that falls back to muted
- A film-grain overlay generated live on a `<canvas>`
- Keyboard: `Space`/`K` play/pause · `←`/`→` seek 5 s · `M` mute · `F` fullscreen

Feel free to copy it, remix it, and learn from it.

---

Copied from https://github.com/ChetasLua/moss-keeper (unmodified). All credit to the original author.
