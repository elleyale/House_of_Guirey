# House of Giray

An interactive, scroll-driven story of the Crimean Khanate, the Giray (Guirey) dynasty, and the family's
path from Bağçasaray to Istanbul, Edinburgh, New York and Nassau. A working prototype by
Ella Musaieva / UtterTosh.

**Access:** the page is password-protected. `index.html` holds the story encrypted (AES-GCM, key derived from the password with PBKDF2), and it only decrypts in the browser once the password is entered. Ask Ella for the password.

**Run it:** open `index.html` in Chrome, Safari or Firefox. If a browser blocks WebGL on pages opened from
disk, serve the folder instead: `python3 -m http.server` and open http://localhost:8000.
It also runs as-is on GitHub Pages (Settings → Pages → deploy from `main`, root).

## What's in the page
- **Opening** — Carlo Bossoli's 1856 lithograph of the square at Bağçasaray, painted in as watercolour,
  then opening into a 3D Gaussian-splat world generated with World Labs Marble.
- **Carte de la Tartarie, 1749** — Robert de Vaugondy's map with deep zoom (full-resolution and 2×
  super-resolved tiles), georeferenced against modern coastlines.
- **Tartaria, redrawn** — a horizontal atlas of territory from the Golden Horde to modern Crimea.
- **Chapters I–IV** — the dynasty, Ottoman suzerainty, Bağçasaray, annexation; ambient gong/metallophone
  sound keyed to each chapter.
- **The branches of the comb** — a zoomable family tree with a 3D object for each person.
- **The comb becomes a wheel** — the same line redrawn as a Mongol-style sectioned circle; distance from
  the hub is time, and each name is tied to its father.
- **Chapter V** — the Bahamas (placeholder) and the Guireys of New York and Nassau.

Lineage drawn dashed or in red comes from a published family tree and is not verified against the
standard lists of khans.

## Files
| Path | What it is |
|---|---|
| `index.html` | The whole page: markup, styles, code, embedded images and the light splat world |
| `three.min.js` | Offline fallback for three.js r149 (loaded from jsDelivr when online) |
| `world-hd/part*.js` | High-definition splat world (1.16M splats), loaded after the page is on screen |
| `vmap-tiles/`, `vmap-tiles-2x/` | Deep-zoom tiles of the 1749 map |
| `source/` | Working files: cleaned lithograph, World Labs input and panorama, splat renderer, atlas build, map georeference |

## Credits
- Lithograph after Carlo Bossoli, lith. E. Walker, Day & Son, London, 1856.
- *Carte générale de l'Empire des Russes et de la Tartarie universelle*, Robert de Vaugondy, 1749.
- 3D world: World Labs Marble (marble-1.1). Areas beyond the original frame are model-generated.
- Map upscaling: Real-ESRGAN (realesr-general-x4v3). 3D: three.js. Geography: Natural Earth via world-atlas.
