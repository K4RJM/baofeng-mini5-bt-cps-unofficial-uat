# UAT 20.49 — UV-32 capture workspace

The physical cable read supplied November 17 completed all 526 blocks: 33,664 bytes across all four regions, with zero memory-write commands. Re-decoding its original bytes yields 33 populated channels, ten zone names, the visible DTMF entry and radio-function values matching the factory CPS screenshots. The original capture remains outside this repository.

- **Open UV-32 capture** accepts only a complete UV32PRO full cable-read JSON with the exact region map and block counts. It rebuilds the channel and settings displays from `wireHex`, ignoring any saved display fields. Nothing is sent to the radio when opening a file.
- The UV-32 preview has a ten-zone selector and keeps the MINI-5 channel-table layout concept. Known radio-function values and VFO frequencies are now labeled from this physical capture and factory CPS screenshots. Unconfirmed fields retain numeric codes.
- The complete raw capture can still be saved from the UV-32 preview. MINI-5 files and programming are untouched.

UV-32 editing, native CPS DAT import/export, and radio writing require a separately verified encoder and write/readback procedure. They remain disabled in this build. The factory DAT uses .NET serialization rather than the raw radio-image layout; treating it as a MINI-5 DAT would be unsafe.
