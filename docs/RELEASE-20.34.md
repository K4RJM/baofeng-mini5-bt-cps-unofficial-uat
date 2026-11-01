# v20.34 — UAT radio protocol identification

UAT-only release, October 31, 2026. LIVE remains v20.33.

- Add a Radio protocol dropdown: MINI-5, GM-30 Pro, UV-32.
- Check radio ID connects and runs the chosen handshake without reading/writing channel memory. Other returned model names are reported rather than rejected.
- Save handshake report preserves request/response bytes, including partial exchanges on failure.
- Protocol facts come from static OLA Radio 2.5.6 configuration inspection, cross-checked against CHIRP; see [evidence and physical check procedure](UAT-RADIO-PROTOCOLS.md).
- Full GM-30 Pro / UV-32 codeplug support is not implemented in this change. Their memory/zone layouts need separate work. MINI-5 source and packaged reader/writer/encoder/decoder are unchanged.

Automated validation: 212 tests passed, zero failures/skips; protected-core hashes passed. The final report will record the isolated browser suite and Pages deployment result after publication. No physical radio was operated.

UAT rollback: `f6dd9be05941271a030b392f7c3db047328424fc`.
LIVE head preserved: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
