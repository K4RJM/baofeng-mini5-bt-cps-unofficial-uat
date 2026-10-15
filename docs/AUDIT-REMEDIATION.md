# Audit remediation — v20.10

Date: October 14, 2026. Baseline: app commit `14cfb85498b682545f221e4345503739d70ae3e9`, published with the audit at `2a7946153dcf1ee494248ddea18132869e454a69`.

The [original audit](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/blob/main/docs/AUDIT-2026-10-14.md) remains unchanged. This release corrects six findings. Nine remain open, including the radio conversion and Bluetooth findings. Publication of this batch was explicitly authorized; further remediation is paused at the maintainer's request.

## Corrected in this release

| Finding | Correction | Evidence and limits |
| --- | --- | --- |
| F04 — DAT resource exhaustion | Reject files of 2,000,000 bytes or more before reading them. Bound inline nesting, allocated array/member slots and expanded reference values. Keep repeated channel references independently editable. | Regression tests cover reference amplification, compressed null arrays, inline nesting, Open/Append size rejection and valid long-string native configurations. Existing DAT writing is unchanged. |
| F09 — Undo changes later settings | Channel history stores only the 999 editable channel records. Undo preserves later optional settings, VFO/DTMF edits and the extra native record. | Real application handlers tested with settings edits between a channel edit and Undo. |
| F11 — Lost capture and stale report | Retain a completed raw capture before decoding. Report decoding failure separately while retaining the workspace. Start a fresh active report for a read or imported source, keeping the prior operation in diagnostic history. | Injected decoder failure preserves all 33,344 captured bytes in the downloadable report. Source replacement clears stale write acknowledgements. Simulated transport only. |
| F12 — Unsaved-state tracking | Include staged channel field values in the tab-close guard, even before blur. A download request no longer clears the unsaved flag. | Handler tests cover unchanged, edited, reverted, applied and download-requested states. The browser's native download completion is not observable through the anchor download mechanism. |
| F14 — Unnamed dialogs | All seven dialogs have explicit `aria-labelledby` references to their headings. | Static ID/reference validation. Local browser preview was unavailable; screen-reader testing is still pending. |
| F15 — Misleading code/documentation | Encoder comments describe its live write-plan role. Current verification is separated from historical release evidence. The protected-file manifest records the parser change and comment-only encoder change with their previous hashes. | Source review and checks described below. Historical evidence is not presented as current hardware verification. |

## Verification

- Baseline: 41 tests passed before remediation.
- Current suite: **53 passing tests and 6 explicitly marked TODO failures**; no unexpected failures. TODO tests reproduce open F01, F02, F03, F05, F07 and F10. They are not successful fixes and must remain visible until the corresponding corrections are reviewed.
- New tests first reproduced the corrected parser, Undo, diagnostic and unsaved-state failures on the baseline.
- Deterministic channel-operation coverage adds 32 varied 999-slot layouts, checking order, settings, hidden-record preservation and native DAT round trips.
- Retained private artifacts: 1,042 native CPS frames / 66,688 payload bytes matched; two retained decoder fixtures and their DAT round trips matched. Private fixtures remain outside the repository and public package. The retained decoder oracle includes hand-transcribed settings rules, so this finite comparison does not close F02, F03 or F13.
- Nine protected files remain byte-identical to retained build 18. `dat.mjs` changes only input parsing/resource limits and adds the browser File reader. `writeDat` is unchanged. `radio-encoder.mjs` changes comments only; executable encoding code is unchanged.
- No physical radio connection, read, write, reboot or firmware operation was performed. No RepeaterBook request or token was used.

Run `npm test` and `npm run package`. The optional local command `node scripts/check-private-cps-fixtures.mjs <retained-fixture-directory>` checks existing private artifacts without copying them into the repository.

## Remaining findings

| Finding | Status / next evidence needed |
| --- | --- |
| F01 — Unmapped raw bytes | Open. Define and test a raw-memory preservation policy before changing write-plan construction. |
| F02 — Settings conversion | Open; executable TODO regression. Compare stock-CPS output for PTT delay codes 7–28, VFO squelch mode 2 and VFO PTT ID 3. |
| F03 — VFO direction/group overlap | Open; executable TODO regression. Independently verify direction Off/Plus/Minus with groups 1, 16, 17 and 20, then confirm radio interpretation. |
| F05 — Source/hardware compatibility | Open; executable TODO regression. Define how supported firmware/hardware and file provenance are established. Reimporting an app-generated DAT still enables the existing confirmation flow; it does not automatically write. |
| F06 — Post-write disconnect timing | Open hardware question. Capture final-ACK/disconnect/reboot/read-back behavior on the identified radio and PC/browser. No new reset command or timing change is included. |
| F07 — Frequency domain | Open; executable TODO regression. Establish the supported domain and invalid-BCD behavior before changing encoding/decoding. The synthetic 650 MHz case does not claim hardware support. |
| F08 — Last channel pair | Open. DAT supports channel 999; the existing radio planner still blocks the unresolved final pair. A containment test keeps that guard enforced pending native mapping evidence. |
| F10 — Unbounded native Bluetooth promises | Open; executable TODO regression. Design and review deadlines, cancellation and stale-operation handling without retrying an uncertain write. |
| F13 — Test coverage/oracle independence | Partly addressed, still open. More regression and varied-layout tests are present. Independent native field cases, real browser checks and physical-radio validation remain necessary. |

Future radio-writing changes still require review of the exact patch and a separate physical validation plan. This release retains the original 262-block write frames, address ranges, padding, acknowledgements, write lock, no-retry behavior and v20.9 browser disconnect behavior.
