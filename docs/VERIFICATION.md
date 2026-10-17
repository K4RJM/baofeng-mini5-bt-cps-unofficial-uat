# Verification — v20.18, F05 identity guards

96 tests: 94 pass, two expected TODOs (F01/F10), zero unexpected failures. Four of seven new F05 tests failed before correction; all now pass. Existing handshake/frames, expected reboot, ACK and no-retry checks remain intact. All 21 original, six F03 and two F06 private-file checks pass. Fresh identity is bound to the same connection without changing radio command/payload/ACK behavior. [Scope and policy](F05-IDENTITY-POLICY.md), [publication checkpoint](CODEX-PROGRESS.md).

---

# Verification — v20.17, F06 physical closure

89 tests: 86 pass, three expected TODOs (F01/F05/F10), zero unexpected failures. Literal captured channel 71 data and real application write/reconnect/readback handlers supplement existing cleanup tests. Independent F06 before/after comparison confirms 322 intended changed bytes, zero outside the two intended regions and exact full post-read reconstruction. Original 21-file and six-file F03 checks still pass. Radio/codec/validation/recovery source is unchanged. No autonomous physical operation performed. [F06 evidence](F06-EVIDENCE-2026-10-16.md), [publication checkpoint](CODEX-PROGRESS.md).

---

# Verification — v20.16, F03 accepted limitation

87 tests: 84 pass, three expected TODOs (F01/F05/F10), zero unexpected failures. F03 coverage retains all 120 combinations and native constants; adds an independent 32-byte capture and channel-isolation regression. Six new private originals and all 21 prior files pass offline checks. Encoder, decoder, writer, reader, map, validation and connection recovery remain byte-identical to v20.15. Completed physical testing is credited in [F03 evidence](F02-F03-EVIDENCE-2026-10-15.md); this release process performs no new radio operation. [Publication checkpoint](CODEX-PROGRESS.md).

---

# Verification — v20.15, F07 closure

Documentation/Help/version-only closure based on K4RJM’s completed physical/factory-CPS tests and the v20.12/v20.14 corrections. Full suite: 85 tests, 81 passing, four expected TODOs, zero unexpected failures. F07 targeted tests: 15 pass. Original private evidence: 21 files verified, 16 native DAT round trips, five complete captures, three complete 33,344-byte matching pairs. No new physical-radio test. All radio/validation/transport modules match v20.14 exactly. [Publication checkpoint](CODEX-PROGRESS.md) records actual UAT/LIVE verification separately.

---

# Verification status — v20.14, October 16, 2026

The F07 channel-input policy uses the existing manual factory-CPS evidence. Eight new tests cover accepted RX/TX boundaries, rejected adjacent values and regions, every off-grid remainder, no normalization, imported-value preservation and pre-connection blocking, Apply/Next behavior, blank TX/empty channels, and unchanged VFO acceptance. Five tests failed before the correction. Broad stored-format and malformed-BCD regressions remain in place; out-of-policy values can still be decoded/exported but cannot pass write preflight.

The complete suite reports **85 tests: 81 pass, four expected TODO failures, zero unexpected failures**. The TODOs still track F01, F03, F05 and F10. Twelve complete accepted payload/frame comparisons match the v20.13 baseline. Protected-file review limits changes to validation and preflight; transport methods and other guards remain unchanged.

K4RJM’s physical testing and captures are credited in the historical evidence below. This correction is tested through automated and browser checks; no additional physical-radio operations are performed by the coding session. See [F07 scope and remaining checks](F07-EVIDENCE-2026-10-15.md).

---

# Historical verification — v20.13, October 15, 2026

## Physical evidence already completed — record reconciled October 16, 2026

K4RJM performed physical-radio testing. Recorded evidence includes successful programming and normal operation on Radio 100 / V0.05 / V1.7; Bluetooth reads, writes, reboot/disconnect and reconnection observations; and typical programming times below one minute. Intermittent recovery problems remain part of the evidence, not an absence of testing.

The 21 supplied private files include 16 factory DATs and five complete Bluetooth diagnostics labeled build 20.10. Three matched DAT/capture pairs agree on every decoded field and all 33,344 bytes when compared with the corrected decoder. Two directly confirm the F02 high codes. See [F02/F03 evidence](F02-F03-EVIDENCE-2026-10-15.md). Offline analysis of physical captures remains hardware-derived evidence; it is distinct from synthetic simulations.

The prior manual test summary also records factory-CPS channel limits and rounding, plus separate VFO reception behavior. These are now listed in [F07 evidence](F07-EVIDENCE-2026-10-15.md). They have not yet been incorporated into channel validation. The [Open Audit Findings](AUDIT-REMEDIATION.md) identify only the remaining mapping, compatibility, persistence/recovery and coverage gaps. Existing evidence does not establish every configuration or certify a later build automatically.

The historical statements below describe the scope of each development/checking session. They do not mean that the project received no physical testing.

## v20.13 automated and interface verification


Presentation-only release: the build badge moves to the top header and a keyboard-accessible “What’s new” dialog lists the three latest releases. The UAT overlay retains its distinct build and environment indicators. The existing write dialog gains the requested preparation checklist, keeping exactly one checkbox and the existing confirmation gate. Its timing statement reflects maintainer-reported testing, not a new timing guarantee or agent hardware test. Radio/codec modules and safety guards are unchanged from v20.12. The existing suite reports 77 tests: 73 pass, four expected TODO failures and zero unexpected failures. LIVE packaging and the UAT version overlay both pass. These automated/interface checks performed no additional physical radio operations.

---

# Historical verification — v20.12, October 15, 2026

F07's channel-frequency representation loss is corrected; hardware band verification remains open. **77 tests: 73 pass, four expected TODO failures, zero unexpected failures.** Six new tests failed on the previous release before passing with the correction. Coverage includes independent decimal-byte vectors, 96 malformed-nibble cases, empty/receive-only preservation, imported-frequency preflight rejection and complete diagnostic retention through real application handlers in an isolated harness.

All 21 private-file checks, including three full 33,344-byte DAT/capture pairs, still pass. All 1,042 older native frames and two retained decoder fixtures match their documented expectations. The encoder, Bluetooth reader and connection recovery are unchanged; the writer changes only preflight channel-format validation. These development checks performed no additional hardware operations. See [F07 evidence and physical checklist](F07-EVIDENCE-2026-10-15.md).

---

# Historical verification — v20.11, October 15, 2026

F02 decoding is corrected; F03 remains open. See [remediation status](AUDIT-REMEDIATION.md) and [evidence details](F02-F03-EVIDENCE-2026-10-15.md). **65 tests pass; five expected TODO failures remain; no unexpected failures.**

Seven new codec regressions failed before the decoder correction. Coverage includes all 39 accepted codes in the four affected fields, 216 combinations, independently specified transport bytes, full canonical-image comparisons, native DAT round trips, unknown-code rejection and real editor handlers. The 292-case option sweep excludes only F03 packing fields and tones; F03 has an exhaustive 120-case test that remains TODO.

All 1,042 retained native encoder frames (66,688 bytes) match. The historical native varied-read fixture loses both squelch code-2 values; its comparison now explicitly expects exactly those two F02 differences, preserving the original artifact. No general oracle normalization was added.

The subsequent 21-file evidence review adds 16 successful native DAT semantic round trips and three independent DAT/raw-capture pairs matching every decoded field and all 33,344 image bytes. Two pairs directly preserve the confirmed F02 high codes. `node scripts/check-oct15-evidence.mjs <private-evidence-directory>` reproduces these results and explicitly characterizes still-open F01, F03 and F08. Full details and the mismatched same-radio file-pair limitation are in the [evidence review](F02-F03-EVIDENCE-2026-10-15.md). Originals remain private; the public manifest contains only filenames, sizes and hashes.

All ten other protected files are byte-identical to v20.10. The decoder manifest records its old hash and evidence. Encoder, writer, reader, memory layout and connection-recovery code are unchanged. These automated/offline checks performed no additional physical radio operations. Actual PTT-ID timing and VFO B signaling behavior remain pending.

The separate UAT deployment was verified in the browser with its development banner and commit-specific version. It has its own Pages workflow and no LIVE deployment credential. The original LIVE workflow remains unchanged.

---

# Historical verification — v20.10, October 14, 2026

The current release contains six audit corrections described in [AUDIT-REMEDIATION.md](AUDIT-REMEDIATION.md). Nine findings remain open. Automated results: **53 passing tests, 6 explicitly marked TODO failures, no unexpected failures**. The TODO cases reproduce unresolved radio findings; a successful CI exit does not close them.

Private retained checks matched 1,042 native CPS frames (66,688 payload bytes), two decoder fixtures and native DAT round trips. These are finite historical comparisons. The decoder fixture generator includes hand-transcribed settings rules and is not an independent oracle for every field. No additional hardware operations were performed in that coding session; the later build-20.10 physical captures are recorded above.

All seven dialog heading references pass static validation. The local preview could not be reached from the in-app browser. Screen-reader testing remains pending. The original layout and styling are unchanged.

Nine protected files are identical to retained build 18. DAT parsing has explicit resource limits, and encoder comments now describe the live write-plan usage. The manifest retains the old hashes and explains these two changes. Radio encoding logic, transport and memory map are unchanged.

The sections below are historical records, not current release certification.

---

## Historical build 19 verification — October 12, 2026

## Automated checks

All 26 tests pass. These automated checks did not access a physical radio.

- Eleven protected core files match retained build 18 SHA-256 hashes byte for byte.
- Native DAT round trips preserve Chinese names, NUL padding and the extra record; malformed/truncated/trailing-byte/wrong-assembly files are rejected.
- Channel insert/delete/compact/move preserve other data and the hidden record, reject capacity overflow and pass inherited validation.
- The original writer's 262 blocks, end padding and Wireless CPS byte pass checks. Simulated transport tests cover 521 fragmented read responses, wrong model/header, read-back mismatch, different device, mutable input snapshot, missing/bad ACK, send failure and disconnect. Uncertain writes stop after one attempt without retry.
- Real interface handlers run in a minimal simulated DOM. Tests cover blank-source write gate, warning/cancel/backup-confirmation, post-attempt lock, manual post-write CPS-reset prompt, read-to-editor, native original-read DAT backup, failure lock, retained connection, idle warning/disconnect, and rejected-file preservation.

An additional private local audit (fixtures excluded from the repository and public package) compared **1,042 native CPS frames / 66,688 payload bytes** across two retained captures. All matched the preserved encoder. Two retained read fixtures also matched native CPS data after decode and DAT reopening. These historical comparisons are finite evidence, not exhaustive validation.

## Browser checks

Verified the actual local app in the in-app Chromium browser:

- Initial empty 999-channel workspace and blank-source write restriction.
- Dark/light theme selection; desktop and 390-pixel mobile layout. Corrected mobile horizontal overflow. CSS uses prefers-color-scheme for System mode; live OS theme toggling was not tested.
- Invalid frequency rejection, valid staged edits, add-above shifting, Move, batch deletion and Undo.
- Native DAT download and reopening; imported source enables the existing warning/plan checks. Write confirmation remains disabled until backup consent. Cancel sends no radio commands.
- Optional setting changes, separate upper/lower VFO columns, all 20 DTMF groups and absence of console errors in these checks.
- RepeaterBook pending-approval display and disabled controls.

This browser QA session did not perform Connect/Read/Write against a physical radio. Drag reorder is implemented and shares the tested move operation, but the pointer drag gesture was not exercised in browser QA. Idle timing and radio-failure behavior were simulated, not physically tested. File export was reopened in this browser and audited against retained CPS fixtures; the installed Windows CPS was not opened for this release.

## Hosting and remaining review

Local HTTP readiness returned 200. All packaged assets use repository-relative URLs. A GitHub Actions Pages workflow and public-file allowlist are included, following [GitHub's workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). GitHub Actions execution, remote publication and actual hosted Bluetooth permissions are not verified because this build has not been pushed or deployed.

K4RJM reported successful build 18 operation on Radio 100 / V0.05 / V1.7, with a manual Wireless CPS toggle required before rereading. That core remains unchanged. At that stage, build 19 physical validation was not yet recorded. Later physical results are acknowledged above. Future protocol or blank-template writing changes still require separate approval. RepeaterBook API approval and browser-compatible access/export terms remain pending. No RepeaterBook API request or token use occurred.

## v20.9 post-write connection cleanup

The v20.0–v20.8 app programming handlers and retained radio core were compared before this change; no direct programming-code regression was found. CHIRP documents radio restart and BLE connection loss after upload. The new cleanup waits for the existing final acknowledgement, then only calls the existing browser disconnect method. Added simulations check no extra bytes, exact 262 original frames, refusal during active/uncertain writes, already disconnected devices, cleanup failures and subsequent read-back. Reconnection is operator-confirmed and has no fixed reboot deadline. Physical confirmation that this avoids resetting the PC Bluetooth adapter is pending.

All 41 automated tests pass for v20.9. Eleven protected core files remain identical to retained build 18. No physical radio or PC Bluetooth reset was tested by the agent.
