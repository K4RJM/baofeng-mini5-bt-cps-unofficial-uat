# F05 — Remediated — Tested (v20.18)

The October 16 master task establishes 5RMINI as the authoritative model, supported by successful physical programming/readback on two MINI-5 radios. The policy uses the existing approved identity exchange; it does not invent firmware identification commands or require repeat hardware compatibility tests.

## Corrected gaps

The existing upload already requests fresh identity on every write and rejects a wrong model. However, checkIdentity accepted an incomplete object containing only the model string, and the upload did not bind the result to the same device/characteristic/connection generation throughout the transaction. Seven regressions were added first; four failed before correction, demonstrating incomplete-identity and changed-connection gaps. Existing successful-read-to-wrong-model, starter-import-to-wrong-model, and incompatible-DAT controls passed.

The corrected check requires model 5RMINI, exactly 15 identification bytes, 16 configuration bytes, valid integer byte values, and the confirmed eight-byte model field (5RMINI plus two spaces). These dimensions/model bytes independently match the original F06 before/after and earlier original diagnostic identities. No undocumented suffix/configuration-byte meaning is assumed. Missing, malformed, sparse or inconsistent identity data fails closed.

Upload snapshots the device object/id, characteristic and connection generation before asynchronous work. It checks that binding before identity, after the fresh identity response and before every programming frame. A changed or disconnected session before the first frame is blocked-before-write. A change after any attempted frame is incomplete-or-uncertain and cannot automatically retry. There is deliberately no new post-final-ACK connection check that could reclassify the expected reboot as failure.

## Source and compatibility policy

A native DAT is settings data, not device identity or proof of its original radio. Opening a valid DAT or reimported starter may enable preparation of a write, but cannot satisfy the physical-radio identity check or trigger programming. The misleading internal trustedBase flag is renamed loadedSource; the interface distinguishes CPS file loaded from Radio read loaded. The existing mandatory confirmation and backup self-attestation remain unchanged.

The DAT parser checks the MINI-5 factory assembly, types and layout; unsupported variants are rejected without replacing the workspace. Write preflight still checks all settings and frequency bounds. A file for another format, a previous read from another device, a stale report or a cached model label cannot authorize a current write. A compatible native DAT may be transferred between tested MINI-5 radios only after the currently selected radio identifies afresh. This is not a firmware-variant certification claim: the existing warning remains explicit that a matching model does not identify firmware/hardware. Both already tested radios are accepted without asking for repeated compatibility testing.

## Verification and unchanged behavior

96 tests: 94 pass, two expected TODOs (F01/F10), zero unexpected failures. Seven F05 regressions cover exact/correct, wrong, missing, malformed/sparse, stale/prior-read, changed device/characteristic/generation and incompatible import cases. The former starter TODO is replaced with the defined source-policy regression; the actual wrong-radio write path is tested independently. Existing 262-frame command/ACK, mutation-snapshot, cleanup, expected-reboot and uncertain-no-retry tests still pass. The original 21-file, six-file F03 and two-file F06 independent checks pass.

No new protocol command, pre-write read, write frame, timing delay, retransmission, disconnect/reset behavior or weakened safety gate. Reader, encoder, decoder and connection-recovery modules are unchanged. The protected writer hash is updated with the reviewed guard-only diff. Unsettled native Bluetooth promises remain explicitly tracked under F10; unknown memory and channel 999 mapping remain F01/F08. No physical-radio operation is performed in this release process.
