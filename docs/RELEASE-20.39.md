# v20.39 — UAT UV-32 read-only channel capture

November 8, 2026. **UAT only. LIVE remains v20.33.**

## Changes

Adds a separate UV-32 channel reader and read-only preview after the physically verified With-response handshake. It captures 1,000 records in 500 fixed 64-byte reads; preserves raw received bytes; validates every reply; and stops without retry on errors. Captures can be saved even after a partial read. A previous successful preview survives a later failed attempt.

The MINI-5 workspace is untouched by UV-32 captures. No UV-32 write, edit, settings read, native-codeplug export or firmware operation is added. General identification remains open to other printable models; UV-32 memory access requires its exact current identity. The new reader uses a separate layout, not the MINI-5 decoder.

CHIRP supplies the independent wired protocol/layout evidence. Bluetooth memory responses and decoded channel values remain pending physical verification. [Evidence, limitations and test steps](UV32-READ.md).

## Verification

- New module syntax checked locally through Node standard input; local project restoration remains unavailable.
- Twelve new targeted automated tests supplement the existing full suite; actual CI result will be recorded after execution.
- Browser suite updated to 32 checks with an isolated UV-32 read/preview/failure workflow. Browser execution remains pending; the previous compact-row issue is retained.
- The protected MINI-5 source files must remain byte-identical. No physical radio is operated by the development agent.
- The existing terminal-notification trace discrepancy remains documented in [the handshake evidence](UV32-HANDSHAKE-2026-11-08.md); it is not claimed fixed by this change.

## Deployment and rollback

- Previous UAT source: `8b00e10d2f3d8795298b3e29569ab40946a7bbb3`.
- Previous deployed application / rollback: `3082c50c2e683e181861479db2c432b7807fb9dd`, **20.38-UAT.3082c50**.
- LIVE head: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`, unchanged.
- Restore previous source through a normal revert and UAT test/deploy workflow; no force push.
