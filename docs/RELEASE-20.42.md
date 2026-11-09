# UAT v20.42 — UV-32 pacing and packet diagnostics

November 9, 2026. **UAT only. LIVE remains v20.33.**

## Change and evidence

Two v20.41 physical captures contain an identical validated prefix and 33 populated channels, with the first entries matching the factory CPS screenshots. They stop at different blocks: a malformed response header at 0x0680 and a one-byte 00 timeout at 0x0440. [Physical evidence and hashes](UV32-READ-EVIDENCE-2026-11-09.md).

This release adds a 20 ms pause between UV-32 channel reads, about 10 seconds total over 500 blocks. The first request remains immediate after identification. This is a UAT pacing trial; it is not a confirmed fix for the physical failures.

A bounded packet trace records the last 12 requests and 80 notifications, with timing, byte counts and validation/error state. Per-notification hex is capped at 256 bytes with a truncation flag. The trace wraps the existing receive method only during a read and restores it afterward. Nothing is uploaded automatically.

A confirmed diagnostics defect is corrected: a timeout no longer leaves the previous block's successful response labelled as the current response.

## Boundaries

Exact response validation, the fixed read range, deadlines, cancellation and partial-data retention remain intact. No ignored bytes, guessed headers, automatic retry, reset command or write command is added. The UV-32 handshake and channel decoder are unchanged. MINI-5 protocol, encoding, writing and protections remain unchanged. No physical operation is performed by the development agent.

## Validation

Four new automated regressions cover pacing and bounded tracing across all 500 blocks, the captured malformed header pattern, stale-response reporting after a later timeout, and disconnect during the pause. The trace tests verify restoration of the original receiver. The synthetic malformed-response replay does not claim to reconstruct unrecorded notification boundaries.

The browser suite remains 33 checks; its two full UV-32 capture waits allow for the added pacing and check bounded trace metadata. The existing compact-row assertion is not weakened.

Automated execution and UAT deployment results will be recorded after CI completes. Browser execution and a complete physical 500-block read remain pending. Local Node/browser launch is unavailable in this environment.

## Hardware follow-up

1. Refresh UAT and confirm **20.42-UAT**.
2. Choose **UV-32 / With response**, enable Wireless CPS and disconnect other programming apps.
3. Choose **Read UV-32 channels** directly. A separate Check radio ID is not required.
4. Save the capture whether it completes or stops. The report includes the new packet trace.
5. If complete, compare channels and banks with factory CPS before treating the interpretation as verified.

## Rollback

- Prior UAT main: `c58088dd9c7a13ef44e51367fcb555e1d092b1a8`.
- Prior deployed application: **20.41-UAT.71a3eef**, `71a3eef47c3a9aadf0db09aab792b735bb66b9fa`.
- LIVE main, unchanged: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- LIVE deployed application: `988db9d5163f93547c97cd449cfa4e03560f9b70`.

Use the existing UAT rollback procedure with the prior main commit; do not promote this development candidate to LIVE.
