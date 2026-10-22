# v20.28 — High contrast text

Adds a keyboard-accessible High contrast toggle beside Appearance. It uses pure white text in dark mode and pure black text in light mode, follows System appearance, and remembers the preference when browser storage is available. Button surfaces remain readable, disabled controls retain dashed borders, and links remain underlined. Existing images and PDF page content are not recolored.

Scope: presentation and preference storage only. No file-format, Bluetooth, memory, or programming changes. No physical radio operations are performed for this release.

Rollback: restore the changed files through a normal tested commit from LIVE `abd56a85b1b13a25fb4fe4c3fc88468c5996f773` or UAT `e11ea4171a126cd2d5d0340ae2b0fdc6ba9691d9`. The previous deployed LIVE application is v20.27, tag v20.27 at `e93dce79b32c691dbb42cc32eebfb999d05e33b7`. Do not force-push.

Release gate: complete Node regression suite, packaged UAT deployment, real-browser suite including contrast colors/theme/persistence/mobile checks, then authorized LIVE promotion and the same deployed browser verification. Results are recorded after verification.

## Verified publication — October 22, 2026

- UAT application: `7c253cec10af0df04ba1067fc0d9ea18cfed4480`; successful workflow [39872753594](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/39872753594).
- LIVE application and tag v20.28: `4f5e789e29333f659665ea94ba1a5900b914220c`; successful workflow [39872998135](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/actions/runs/39872998135).
- All 157 Node tests passed; all 22 real-browser checks passed on both deployed environments. Contrast checks cover Light/Dark/System colors, saved preference, keyboard focus, phone width, transparent tutorial hotspots, and the separate Bluetooth status icon checks. Desktop light and dark appearances were visually inspected.
- All 16 protected modules are byte-for-byte unchanged. Existing radio handler code is unchanged; appearance preference code and diagnostic version are the only app-module changes.
- No physical radio operations. PDF page text and image pixels retain their original colors. The v20.27 application remains the rollback reference above.
