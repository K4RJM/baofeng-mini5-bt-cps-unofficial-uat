# Audit remediation — v20.12

Date: October 15, 2026. Baseline: v20.11, commit `dcb609729bf2ea29e4ae25785de8666cf824d090`.

**Seven findings are corrected; eight remain open.** F07's silent frequency loss is corrected in this release, while its hardware capability verification remains open. No other finding is reclassified.

Channel frequencies in the existing 100.00000–999.99999 file-format range now survive decoding, including values previously cleared at 600 MHz and above. Malformed decimal bytes and nonempty values below that format are rejected with the raw diagnostic retained and the workspace unchanged. Preflight validation blocks out-of-format imported channel frequencies before connection. This does not establish hardware band limits or change the encoded payloads or Bluetooth transaction behavior.

Verification: **73 passing tests, four expected TODO failures, zero unexpected failures** (77 total). Six new regressions failed before the correction. All 21 supplied private-file checks and 1,042 retained native-frame comparisons still pass. See the [F07 evidence and read-first hardware checklist](F07-EVIDENCE-2026-10-15.md).

| Status | Findings |
| --- | --- |
| Corrected | F02, F04, F09, F11, F12, F14, F15 |
| Open | F01, F03, F05, F06, F07 (representation corrected; hardware domain pending), F08, F10, F13 |

The encoder, Bluetooth reader, memory map, command sequence, acknowledgements, disconnect/reset behavior and existing safety guards are unchanged. `writer.mjs` adds only format validation before a plan is made; no transport method changes. No physical radio operation was performed. Rollback is available at `rollback/v20.11-before-f07`.

---

# Historical remediation record — v20.11

Date: October 15, 2026. Baseline: LIVE v20.10, commit 02b5a1dd02a166261590ad679a92723994911d09.

**Seven of the 15 findings are corrected; eight remain open.** This release corrects F02 only. F03 investigation adds evidence and regression coverage without changing its packing. The maintainer authorized publishing these tested corrections to LIVE and clarified that the permanent UAT site is for future development.

## Corrected in v20.11

F02: preserve PTT delay codes 0–28, VFO PTT-ID 0–3 and both VFO squelch codes 0–2 directly from their stored bytes. Existing UI options and writer validation already support these values. Unknown values remain unrecognized and are blocked by the unchanged write validator. The encoder, transport, command order, full 262-block write, acknowledgements, no-retry rule, disconnect/reset behavior and write protections are unchanged.

The wired factory CPS display/default issue and its later write resetting delay to 0 are documented separately from our Bluetooth decoder defect. No firmware defect or Bluetooth-app cause is inferred from those factory observations. See [F02/F03 evidence and physical checks](F02-F03-EVIDENCE-2026-10-15.md).

## Verification

- Full suite: **65 passing, 5 explicitly marked TODO failures, 0 unexpected failures** (70 tests). The remaining TODOs reproduce F01, F03, F05, F07 and F10.
- Seven F02 codec tests failed on the old decoder before passing with this change; all 39 supported single-field codes, 216 combined settings cases, fixed byte fixtures, unknown-code rejection and editor/DAT preservation are covered.
- All 120 F03 direction/group combinations are exercised by its still-open round-trip test. Separate characterization tests show the 60-to-52 packing collision and retained factory byte examples without claiming resolution.
- Private native encoder comparison: all 1,042 frames / 66,688 bytes still match. Two retained decoder fixtures pass with exactly two documented F02 squelch corrections to the old native read oracle.
- Only radio-decoder.mjs changes executable protected-core logic. All ten other protected files are byte-identical to v20.10. No physical radio connection, read or write was performed.

## Current finding status

### October 15 supplied-file evidence update

All 21 newly supplied files were inspected offline. All 16 native DATs preserve their fields through export/reimport; three matched DAT/capture pairs agree on every decoded field and all 33,344 planned bytes. Two directly verify the corrected F02 high codes. This strengthens F02's evidence without changing its implementation or the finding count.

- **F01 remains open:** the original capture has one unmapped byte at radio `0x9018` that reconstruction changes from decoded 1 to 0. Its purpose is unknown; no write-policy change is made.
- **F03 remains open:** three distinct factory DATs (Off/group 17, Plus/group 1, Plus/group 17) produce identical complete images in the current encoder. Only the combined case has a matching independent raw capture, so a replacement mapping is not established.
- **F08 remains open:** the supplied native channel-999 file round-trips, but no corresponding populated raw capture establishes radio mapping. The planner's existing guard stays enforced.
- **F13 remains open:** independent evidence coverage improves; the remaining field, browser and physical behavior coverage is still incomplete.

See [the detailed evidence and file-pairing limits](F02-F03-EVIDENCE-2026-10-15.md). The optional `scripts/check-oct15-evidence.mjs` replays these checks against private originals. No application code, radio operation or version change is included in this evidence update.

| Status | Findings |
| --- | --- |
| Corrected | F02, F04, F09, F11, F12, F14, F15 |
| Open | F01, F03, F05, F06, F07, F08, F10, F13 |

F03 remains open: the supplied factory DATs, captured A Plus/group 17 byte 0x10 and retained native frames do not establish an unambiguous mapping across the full domain; CHIRP describes a conflicting bit split. Physical VFO B signaling and actual timing still require verification. Other open findings retain their earlier evidence requirements. F13 has more regression coverage but remains open.

## Deployment and rollback

[Permanent UAT](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/) uses its own repository, version banner and automatic deployment. UAT changes cannot publish to LIVE through that workflow. [Deployment instructions](DEPLOYMENT.md) cover isolated promotion and rollback to the saved v20.10 reference. No unfinished features are included with this correction.

---

# Historical remediation record — v20.10

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
