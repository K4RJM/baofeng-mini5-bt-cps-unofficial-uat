# Verification status — v20.11, October 15, 2026

F02 decoding is corrected; F03 remains open. See [remediation status](AUDIT-REMEDIATION.md) and [evidence details](F02-F03-EVIDENCE-2026-10-15.md). **65 tests pass; five expected TODO failures remain; no unexpected failures.**

Seven new codec regressions failed before the decoder correction. Coverage includes all 39 accepted codes in the four affected fields, 216 combinations, independently specified transport bytes, full canonical-image comparisons, native DAT round trips, unknown-code rejection and real editor handlers. The 292-case option sweep excludes only F03 packing fields and tones; F03 has an exhaustive 120-case test that remains TODO.

All 1,042 retained native encoder frames (66,688 bytes) match. The historical native varied-read fixture loses both squelch code-2 values; its comparison now explicitly expects exactly those two F02 differences, preserving the original artifact. No general oracle normalization was added.

The subsequent 21-file evidence review adds 16 successful native DAT semantic round trips and three independent DAT/raw-capture pairs matching every decoded field and all 33,344 image bytes. Two pairs directly preserve the confirmed F02 high codes. `node scripts/check-oct15-evidence.mjs <private-evidence-directory>` reproduces these results and explicitly characterizes still-open F01, F03 and F08. Full details and the mismatched same-radio file-pair limitation are in the [evidence review](F02-F03-EVIDENCE-2026-10-15.md). Originals remain private; the public manifest contains only filenames, sizes and hashes.

All ten other protected files are byte-identical to v20.10. The decoder manifest records its old hash and evidence. Encoder, writer, reader, memory layout and connection-recovery code are unchanged. No physical radio operation was performed. Physical timing and VFO B behavior remain pending.

The separate UAT deployment was verified in the browser with its development banner and commit-specific version. It has its own Pages workflow and no LIVE deployment credential. The original LIVE workflow remains unchanged.

---

# Historical verification — v20.10, October 14, 2026

The current release contains six audit corrections described in [AUDIT-REMEDIATION.md](AUDIT-REMEDIATION.md). Nine findings remain open. Automated results: **53 passing tests, 6 explicitly marked TODO failures, no unexpected failures**. The TODO cases reproduce unresolved radio findings; a successful CI exit does not close them.

Private retained checks matched 1,042 native CPS frames (66,688 payload bytes), two decoder fixtures and native DAT round trips. These are finite historical comparisons. The decoder fixture generator includes hand-transcribed settings rules and is not an independent oracle for every field. No physical radio operation was performed for this release.

All seven dialog heading references pass static validation. The local preview could not be reached from the in-app browser. Screen-reader testing remains pending. The original layout and styling are unchanged.

Nine protected files are identical to retained build 18. DAT parsing has explicit resource limits, and encoder comments now describe the live write-plan usage. The manifest retains the old hashes and explains these two changes. Radio encoding logic, transport and memory map are unchanged.

The sections below are historical records, not current release certification.

---

## Historical build 19 verification — October 12, 2026

## Automated checks

All 26 tests pass. No physical radio access.

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

No browser Connect/Read/Write was performed against a physical radio. Drag reorder is implemented and shares the tested move operation, but the pointer drag gesture was not exercised in browser QA. Idle timing and radio-failure behavior were simulated, not physically tested. File export was reopened in this browser and audited against retained CPS fixtures; the installed Windows CPS was not opened for this release.

## Hosting and remaining review

Local HTTP readiness returned 200. All packaged assets use repository-relative URLs. A GitHub Actions Pages workflow and public-file allowlist are included, following [GitHub's workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). GitHub Actions execution, remote publication and actual hosted Bluetooth permissions are not verified because this build has not been pushed or deployed.

The prior user reported successful build 18 operation on Radio 100 / V0.05 / V1.7, with a manual Wireless CPS toggle required before rereading. That core remains unchanged. Physical validation of build 19 and approval of any future protocol or blank-template writing change remain pending. RepeaterBook API approval and browser-compatible access/export terms remain pending. No RepeaterBook API request or token use occurred.

## v20.9 post-write connection cleanup

The v20.0–v20.8 app programming handlers and retained radio core were compared before this change; no direct programming-code regression was found. CHIRP documents radio restart and BLE connection loss after upload. The new cleanup waits for the existing final acknowledgement, then only calls the existing browser disconnect method. Added simulations check no extra bytes, exact 262 original frames, refusal during active/uncertain writes, already disconnected devices, cleanup failures and subsequent read-back. Reconnection is operator-confirmed and has no fixed reboot deadline. Physical confirmation that this avoids resetting the PC Bluetooth adapter is pending.

All 41 automated tests pass for v20.9. Eleven protected core files remain identical to retained build 18. No physical radio or PC Bluetooth reset was tested by the agent.
