# v20.41 — UAT combined UV-32 identification and read

November 9, 2026. **UAT only. LIVE stays v20.33.**

## Change

Read UV-32 channels now connects, identifies and reads as one explicit operation. It is available without first choosing Check radio ID. An existing connection is reopened through the existing browser disconnect/connect methods; its state and buffered bytes are retained in the report. The first memory request follows the successful handshake immediately, without waiting for another click.

The prior v20.40 report showed a successful handshake followed by a buffered 00 byte at a read attempt 7.683 seconds later. All other session checks passed. A separate attempt failed during M with one 00 byte instead of seven model bytes. [Hardware evidence and file hashes](UV32-SESSION-EVIDENCE-2026-11-09.md).

An idle timeout is a hypothesis, not a confirmed meaning for 00. The new flow removes the unnecessary human delay and follows CHIRP's identification-then-download ordering. The separate M failure and physical channel reading remain unverified.

## Preserved protections

- Fresh exact UV32PRO identity with With response is still required before memory access.
- Failed identification, trailing bytes, bad headers, cancellation and changed connections still stop reading.
- Existing handshake commands, bridge setup, SEND packet sizes, read addresses, block sizes, reply validation and decoder are unchanged.
- No automatic retry, radio reset/exit command, UV-32 write, edit or settings support is added.
- MINI-5 core source is unchanged. LIVE is untouched. No physical radio operation is performed by the development agent.
- Diagnostics preserve the failed handshake, the old buffered bytes, the fresh-session checks and time from completed identity to first read. Previous successful previews remain available after failure.

## Verification

Six added Node regressions cover the combined flow, simulated idle response, fresh connection with retained 00 evidence, M-query 00 failure, wrong model, busy/cancelled operation and cancellation before memory access. The two UV-32 browser workflows are updated; the suite still contains 33 checks.

Full CI tests and deployment results are recorded below when completed. Local Node execution remains unavailable because the sandbox launcher rejects its packaged runtime; file reads succeeded. No browser-suite pass is claimed.

## Physical test

1. Refresh UAT and confirm **20.41-UAT**.
2. Select **UV-32 / With response**.
3. Click **Read UV-32 channels** directly and select the UV-32 in the Bluetooth chooser. Identification is included; no separate Check radio ID is needed.
4. Save the capture or read diagnostics after the result. If identification fails, the diagnostic contains the failed handshake. Do not repeat automatically.
5. Compare successful decoded channels against the factory CPS before any editing/writing development.

## Rollback

- UAT source rollback: `069190eae453e76f26185d089a96b9e6e409e9b0`.
- Previous deployed app: **20.40-UAT.8ce144d**, `8ce144d355021e7efd72f428f40d9297321f450f`.
- LIVE main remains `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- Restore via normal revert and UAT workflow; no force push.
