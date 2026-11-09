# v20.40 — UAT UV-32 pre-read diagnostics

November 9, 2026. **UAT only. LIVE remains v20.33.**

## Confirmed problem

K4RJM's v20.39 screenshot shows a successful UV32PRO handshake with With response, followed by the message asking for identification again after Read UV-32 channels was selected. The earlier explanation about the MINI-5 sidebar did not account for this failed top-toolbar action.

Source inspection confirms that a failed read-session check happened before the capture report was created. Consequently the generic message did not identify which check failed, Save UV-32 capture stayed unavailable, and the toolbar continued to show the earlier successful handshake. This is an application diagnostic defect. The screenshot does **not** establish which connection/session condition failed or demonstrate a radio firmware fault.

## Correction

- Report the exact failed condition: missing unused handshake, ended connection, busy operation, connection setup, replaced device/characteristic/generation, or unexpected buffered response bytes.
- Create a downloadable report even when the attempt stops before its first channel request. Such reports explicitly contain zero reads, zero writes, zero captured bytes and a before-read stage.
- Enable Save read diagnostics before a capture exists. Preserve the receive-buffer count and up to 256 buffered bytes without consuming or clearing them.
- Record the UI's state at the read click, the reader's state before access, and state at download, including module URLs. This permits comparison of a changed connection, unexpected data and a mismatched module instance without guessing.
- Replace the previous handshake text with the stopped-read result when a read fails.
- Preserve another operation's busy state if the read is rejected before acquiring it.

All identity and one-use-session requirements remain enforced. The read commands, handshake, packet sizes, timing, address bounds, reply validation, decoder and MINI-5 core are unchanged. No retry, buffer discard, reset, radio write or compatibility expansion is added.

## Verification

Three additional automated regressions cover all pre-read guards, zero-command failure reports, busy ownership, late buffered bytes and bounded diagnostic snapshots. Existing UV-32 tests still exercise all 500 reads, channel 1000, invalid responses, interruption and partial retention. The browser suite adds the corresponding click-and-download scenario and now contains 33 checks.

Local execution is unavailable: the shell launcher rejects the packaged runtime before starting PowerShell. CI completed the full suite: **254/254 tests passed**, with zero failures, skips or TODOs. Packaging and UAT Pages deployment succeeded in [workflow 42572505546](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/42572505546). Browser execution is not claimed.

The underlying physical read blocker remains **unresolved pending the diagnostic report**. A synthetic late-response regression is not evidence that the physical radio sent an extra response.

## Next physical check

1. Load UAT **20.40**.
2. Select UV-32 / With response and check radio ID.
3. Select Read UV-32 channels if enabled.
4. If it stops or stays disabled, choose **Save read diagnostics** (or Save UV-32 capture if data was received) and provide that JSON. Saving diagnostics sends no radio command.
5. Do not repeatedly identify/read to dismiss the error; retain the first diagnostic.

No physical-radio operation is performed by the development agent.

## Rollback

- UAT source before this update: `f48952773c62f1bf5c0dfd2e3bdfaa2777599fc1`.
- Previous deployed application: **20.39-UAT.3cadadf**, `3cadadf2956e5f76ce3592d40bc05b259f294187`.
- LIVE remains `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- Revert through the normal UAT test/deploy workflow; no force push.

## Published result

- Application commit: `8ce144d355021e7efd72f428f40d9297321f450f`; build **20.40-UAT.8ce144d**.
- GitHub reports both test and deploy jobs successful. Direct retrieval through the available web tool was unavailable; independent browser verification remains pending.
- All 16 protected MINI-5 source files are byte-identical to the rollback source. Handshake implementation, UV-32 decoding and read command construction are unchanged.
- The 33 browser checks have not been executed in this environment. The previously reported compact-row browser failure is outside this change and remains recorded.
- LIVE head rechecked after deployment: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`, unchanged.
- Next evidence needed: the first saved v20.40 UV-32 read diagnostic or capture. This release does not claim a completed physical channel read.
