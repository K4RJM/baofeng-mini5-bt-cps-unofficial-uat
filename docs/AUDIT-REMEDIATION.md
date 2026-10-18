# Audit remediation — v20.23

The application is now **Ham-Rx Mini-5**. [Public compatibility notes](KNOWN-LIMITATIONS.md) explain the accepted limitations and distinguish confirmed behavior from unconfirmed causes. No audit disposition is reopened or recategorized.

**F13: Remediated — Tested. All 15 original findings have final dispositions; zero remain open.** Thirteen are corrected, verified or remediated; F01 and F03 are explicitly accepted factory-compatible behavior/limitations.

The independent byte tests, asynchronous event transport and real-browser suite address the original shared-oracle, synchronous-response and simplified-DOM gaps. Four isolated code mutations and two browser mutations demonstrate that the new checks detect the targeted regressions. All 146 Node tests pass with zero failures/TODOs. Real-browser release results and publication are recorded in [CODEX-PROGRESS.md](CODEX-PROGRESS.md); [F13-COVERAGE.md](F13-COVERAGE.md) maps each requirement and its limits.

Radio programming, encoding, decoding, validation, memory map and connection recovery remain byte-identical to v20.21. Existing private evidence replays pass, including all 1,042 native frames and the original full physical captures. K4RJM's completed physical testing remains credited; no new physical-radio operation occurred. The Experimental designation was removed in v20.23 at K4RJM’s explicit request. This changes presentation, not the evidence or radio safeguards. Intermittent Windows/radio Bluetooth recovery remains a separate unresolved reliability question, not a claimed F13 fix.

| Disposition | Findings |
| --- | --- |
| Corrected / verified / remediated | F02, F04, F05, F06, F07, F08, F09, F10, F11, F12, F13, F14, F15 |
| Accepted factory-compatible behavior / limitation | F01, F03 |
| Open original audit findings | None |

Final cross-check: F04 parser limits, F09 scoped Undo, F11 capture retention, F12 unsaved-state protection and F14 dialog labels retain their regressions. F15 current-versus-historical evidence remains explicit. F01/F03 accepted limitations and F06/F07 hardware closures are preserved, not reopened. The remaining identity, memory-layout and interruption tests pass. No feature-development code is included.

---

# Audit remediation — v20.21

**F10: Remediated — Tested with fault injection. Fourteen of 15 findings resolved; F13 remains open.** Native Bluetooth selection, connection, discovery, notification setup and sends now have deadlines. Cancellation and unexpected disconnect invalidate the session; late results cannot resume it. A still-pending native call prevents a second overlapping connection. Editing controls recover, while an attempted write remains locked and uncertain.

The normal identification/read/write command sequence, 521 reads, 262 write frames, payloads, ACK checks, one-use permits and post-ACK cleanup/reset flow are preserved. No automatic write retry or experimental lab probe/session-reuse/E command was added. The existing response timeout stays four seconds. An actual setup link loss or native deadline now stops that attempt; already-settled NetworkError setup failures retain the three-attempt bound and 600 ms retry gap.

135 tests pass with no TODOs. Thirty new fault/race/UI checks cover the corrected lifecycle; the original F10 stall probe now passes. No physical radio was operated. Existing physical evidence remains credited; intermittent Windows/radio reconnection reliability is not claimed resolved by this software-deadline correction. See [F10 design, evidence and limits](F10-DEADLINES.md) and [publication checkpoint](CODEX-PROGRESS.md).

| Status | Findings |
| --- | --- |
| Corrected / verified / remediated | F02, F04, F05, F06, F07, F08, F09, F10, F11, F12, F14, F15 |
| Accepted factory-compatible behavior / limitation | F01, F03 |
| Open | F13 |

---

# Audit remediation — v20.20

**F08: Remediated — Tested. Thirteen of 15 findings resolved; two remain: F10 and F13.** The correction replaces the blanket channel-999 block with the factory trailing-buffer pattern, preserving an explicit block on unsupported record 1000. The exact factory write DAT reproduces all 33,344 bytes of the independently captured physical image. Completed channel-999 factory programming/Bluetooth reads and F06 clearing evidence are credited; no repeat capacity test is requested.

Nine targeted tests and the complete suite pass: 105 total, 104 passing, one expected F10 TODO, zero unexpected failures. All previous 29 private-file checks, five-file F08 replay and both native comparisons (1,042 frames) pass. Full-write addresses, 262 frame count, protocol, ACKs, no-retry, identity protections and reset/disconnect are unchanged. No physical write was performed during this development session. K4RJM explicitly approved UAT then LIVE publication.

| Status | Findings |
| --- | --- |
| Corrected / verified / remediated | F02, F04, F05, F06, F07, F08, F09, F11, F12, F14, F15 |
| Accepted factory-compatible behavior / limitation | F01, F03 |
| Open | F10, F13 |

See [F08 evidence and limits](F08-EVIDENCE.md) and [publication checkpoint](CODEX-PROGRESS.md). Next: F10 bounded Bluetooth operations, then F13 independent coverage. The meaning of the repeated trailing area is not claimed beyond the observed factory behavior.

---

# Audit remediation — v20.19

**F01: Closed — Accepted Factory-Compatible Behavior. Twelve of 15 findings resolved; three remain: F08, F10, F13.** K4RJM accepted the existing reconstruction policy after comparison with retained factory CPS output. Both factory outputs match the unchanged encoder across 1,042 frames / 66,688 payload bytes, including zero at 0x9018. The physical 1-to-0 observation remains documented. Its interpretation as a new-radio marker is a hypothesis, not an established field definition.

No programming code or safety protection changes. The rejected read-first/exact-reconstruction prototype is excluded. The original F01 probe is retained as an explicit normalization regression; F10 remains the only expected TODO. See [F01 evidence and limits](F01-FACTORY-COMPATIBILITY.md), [verification](VERIFICATION.md), and [publication](CODEX-PROGRESS.md).

| Status | Findings |
| --- | --- |
| Corrected / verified / remediated | F02, F04, F05, F06, F07, F09, F11, F12, F14, F15 |
| Accepted factory-compatible behavior / limitation | F01, F03 |
| Open | F08, F10, F13 |

F08 investigation (October 17): an isolated v20.20 candidate reproduces the exact 33,344-byte factory write DAT/capture pair, including twelve alternating trailing blocks. 104 tests pass with one F10 TODO. F08 stays open pending UAT publication approval and targeted physical Bluetooth verification. Deployed v20.19 retains its guard. See [evidence and candidate](F08-EVIDENCE.md).

---

# Audit remediation — v20.18

**F05: Remediated — Tested. Eleven of 15 findings resolved; four remain: F01, F08, F10, F13.** Each programming operation requires a fresh, complete 5RMINI identity and stays bound to the same device, characteristic and connection generation. Wrong/missing/malformed identities and changed sessions fail closed. The source policy distinguishes a loaded native DAT from current physical identity; opening a file never programs or verifies a radio.

Seven targeted tests exposed four pre-fix failures and now pass. The full suite has 96 tests: 94 passing, two expected TODOs (F01/F10), zero unexpected failures. All 29 retained private-file checks pass. Normal handshake commands, 262 write frames, ACK completion, expected reboot, disconnect/reset and no-retry behavior are unchanged. The two already tested MINI-5 radios do not require repeat physical compatibility testing. Firmware/hardware is not inferred from a model string.

[F05 policy and evidence](F05-IDENTITY-POLICY.md) documents the exact guards and limits; [permanent progress](CODEX-PROGRESS.md) records publication. F10 retains unbounded native-promise handling; F01/F08 retain unknown-memory/final-record risks. Next: F01 preservation investigation, one finding at a time.

| Status | Findings |
| --- | --- |
| Corrected / verified / remediated | F02, F04, F05, F06, F07, F09, F11, F12, F14, F15 |
| Accepted factory-compatible limitation | F03 |
| Open | F01, F08, F10, F13 |

---

# Audit remediation — v20.17

**F06: Closed — Verified on Physical Hardware. Ten of 15 findings resolved; five remain: F01, F05, F08, F10, F13.** K4RJM completed the LIVE v20.14 write/reboot/reconnect/readback workflow. Independent comparison of F06-BEFORE.json and F06-AFTER.json confirms exactly 322 changed bytes: 23 in channel 71, 299 in the intentionally cleared channel 999/trailing region, zero elsewhere. The post-reboot configuration contains F06TEST, 146.52000 simplex, Low power, no tones. VFO, general settings and DTMF are unchanged.

The normal automatic reboot is expected behavior. Existing code records all-blocks-acknowledged separately from verified readback, cleans the browser link without radio commands, and waits for explicit reconnect. Regressions cover that flow and literal captured channel bytes. No Bluetooth, codec, validation or write-safety code changes. No repeat physical F06 testing requested. Unexpected interruption stays under F10; unknown-memory and final-record layout risks stay under F01/F08.

Full suite: 89 tests, 86 pass, three expected TODOs, zero unexpected failures. The original 21 files, six F03 files and both F06 original files pass offline checks. [F06 evidence](F06-EVIDENCE-2026-10-16.md) distinguishes physical testimony from reproduced bytes; [permanent progress](CODEX-PROGRESS.md) records actual publication and next steps.

| Status | Findings |
| --- | --- |
| Corrected / Closed — Verified | F02, F04, F06, F07, F09, F11, F12, F14, F15 |
| Closed — Accepted Limitation | F03 |
| Open investigation | F01, F05, F08, F10, F13 |

Next: F05 exact current-device 5RMINI identity and source policy, using automated checks; no physical test is needed to establish compatibility of the two already tested radios.

---

# Audit remediation — v20.16

**F03: Closed — Accepted Factory-Compatible VFO Limitation. Nine of 15 findings are resolved; six remain: F01, F05, F06, F08, F10, F13.** The factory wired CPS and Bluetooth CPS exhibit the same tested VFO A OFF/17, PLUS/1 and PLUS/17 representation (0x800E=0x10; readback PLUS/17). The cause is not conclusively identified. Memory-channel programming is unaffected. No encoder or decoder changes, and no repeat F03 physical testing is requested.

Six newly inspected private files corroborate input/readback settings and the captured VFO A region. The separately reported fresh PLUS/1–PLUS/17 full-image equality is attributed accurately; the saved OFF/17–PLUS/1 pair has other differences. See the [accepted limitation and evidence](F02-F03-EVIDENCE-2026-10-15.md).

All 120 A/B combination cases are retained as characterization instead of a false expectation of independent fields. New independent hardware-byte and channel-isolation regressions pass. Full suite: 87 tests, 84 pass, three expected TODOs, zero unexpected failures. Original 21 and new six private-file checks pass. [Progress/publication](CODEX-PROGRESS.md) records the release gate. F06 is next as its own hardware-evidence closure.

| Status | Findings |
| --- | --- |
| Corrected / Closed — Verified | F02, F04, F07, F09, F11, F12, F14, F15 |
| Closed — Accepted Limitation | F03 |
| Awaiting separate evidence closure | F06 |
| Open investigation | F01, F05, F08, F10, F13 |

---

# Audit remediation — v20.15

**F07: Closed — Verified. Eight of the original 15 findings are resolved; seven remain open: F01, F03, F05, F06, F08, F10 and F13.** F03 and F06 have new completed hardware evidence awaiting their own separate release and disposition; they are not being bundled into this closure.

The original F07 channel conversion defect is corrected, and channel edits/write preflight follow the completed factory-CPS frequency tests. Supported RX/TX bounds are 136.00000–173.99875 and 400.00000–519.99875 MHz on a 1.25 kHz grid. The app rejects off-grid values rather than reproducing factory downward rounding. Existing imported/read values remain intact for export; unsupported channel programming is blocked. VFO reception and channel memory are distinct. The [F07 closure](F07-EVIDENCE-2026-10-15.md) reconciles the remaining scope without requesting repeat physical testing.

This documentation closure changes no radio, validation or transport behavior. Full regression: 85 tests, 81 passing, four expected TODOs, zero unexpected failures; all 21 existing private-file checks pass. See [progress and publication status](CODEX-PROGRESS.md).

## Current disposition

| Status | Findings |
| --- | --- |
| Corrected / closed | F02, F04, F07, F09, F11, F12, F14, F15 |
| Awaiting individual evidence closure | F03 (accepted factory-compatible VFO limitation), F06 (completed write/reboot/readback) |
| Open investigation | F01, F05, F08, F10, F13 |

The master task authorizes one tested correction/closure at a time, UAT verification before LIVE, and a separate version for each. F07 is finished first because its v20.14 implementation/release was in progress when that instruction arrived. F03 is next, then F06. No speculative protocol changes or autonomous physical writes are authorized.

---

# Audit remediation — v20.14

October 16, 2026. Baseline: LIVE v20.13, commit `1b1c6b434c130e3d799bf258ff9bce2d6bef6fe3`.

**F07 channel validation is implemented. Seven findings remain corrected and eight open; no unverified finding is closed.** The recorded factory-CPS channel RX/TX ranges and 1.25 kHz grid now apply to changed channel frequencies and every channel in write preflight. Invalid/off-grid values report the channel and field before confirmation, connection or encoding. They are never rounded or silently changed. Existing DAT/read values remain available for inspection, export and unrelated edits. Empty channels and blank receive-only TX are retained. VFO rules remain separate.

Eight new regression tests cover both fields at band edges and adjacent values, all 124 nonzero grid remainders, unchanged import/export, real edit/apply/next and write-preflight handlers, blanks, and separate VFO rules. Five reproduced missing restrictions before the fix. The existing broad-format decoder tests still preserve raw evidence and now also assert programming rejection for unsupported channels.

The remaining F07 work is the scoped physical/VFO questions in the [evidence record](F07-EVIDENCE-2026-10-15.md), not a repeat of the completed factory-CPS tests. F01, F03, F05, F06, F08, F10 and F13 retain their existing status. Your completed hardware testing remains credited below.

Only channel edit validation and write-plan preflight change executable behavior. The encoder/decoder, Reader/Writer transaction methods, frame layout, acknowledgements, disconnect/reset behavior, existing backup acknowledgement and all other write protections are unchanged. No additional physical-radio operation was performed in this development session.

See [verification](VERIFICATION.md) and [deployment/rollback](DEPLOYMENT.md).

---

# Historical audit remediation — v20.13

## Evidence reconciliation — October 16, 2026

**Physical testing has been performed by K4RJM.** Earlier statements about no physical radio operations described the coding/automated verification sessions, not the whole project. Existing hardware results count toward verification; they must not be discarded or needlessly repeated. The application remains v20.13; this update corrects Help and documentation only.

**Open Audit Findings: eight. Corrected: seven (F02, F04, F09, F11, F12, F14, F15).** An open finding can already have substantial completed work. The table separates that evidence from the remaining engineering task.

| Finding | Completed work / existing evidence | What remains |
| --- | --- | --- |
| F01 — Radio-memory preservation | A real capture identifies the unmapped byte at 0x9018; reconstruction changes it. The supplied test summary also reports a factory-CPS change. | Establish the byte’s role and a safe preservation policy. Retained snapshots alone do not identify the intervening writer or prove that normalization is intentional. |
| F03 — VFO direction / SignalCode collision | Three distinct factory DAT inputs reproduce the collision. Factory write/read and a matching Bluetooth capture establish A PLUS / group 17 at 0x800E = 0x10. | Obtain the missing isolated raw states for Off/group 17 and Plus/group 1, then establish the A/B mapping and behavior. No speculative encoder change. |
| F05 — Radio and DAT compatibility | Radio 100 / V0.05 / V1.7 is identified; native DATs and captures have been compared. The supplied test summary reports factory-CPS recovery of an inoperable radio. | Define and implement a supported-device/source policy. Model identity and a parsed DAT do not establish firmware compatibility; successful recovery does not establish compatibility for other profiles. |
| F06 — Write completion and disconnect | K4RJM has physically programmed, read and reconnected the radio, observed its post-write reboot, and reported cases requiring Wireless CPS or PC Bluetooth toggles. | Record final-ACK/disconnect timing, persistence after reboot/power cycling, and repeated reconnection results for an identified build/browser/radio. Existing operations are evidence; reliable recovery is still unresolved. |
| F07 — Frequency validation | v20.12 fixed silent frequency loss and malformed-decimal handling. Prior manual testing recorded factory-CPS channel RX/TX ranges, 1.25 kHz increments/downward normalization, rejected cases and separate VFO behavior. | Incorporate those recorded channel rules into validation and regressions without applying them blindly to VFOs or silently rounding existing data. Resolve only the remaining radio-specific capability/behavior questions. See the [F07 evidence table](F07-EVIDENCE-2026-10-15.md). |
| F08 — Channel 999 | A native factory DAT contains channel 999 and passes export/reimport checks. | Obtain an independent populated radio capture and establish final-pair mapping before changing the existing writer restriction. |
| F10 — Bluetooth timeouts | Real connection/recovery problems are reported; a simulated unresolved native promise demonstrates an unbounded wait. | Add and test deadlines, cancellation and late-result handling without retrying uncertain writes. Reports alone do not identify this failure as the cause of every Bluetooth problem. |
| F13 — Independent verification | Sixteen factory DATs, five complete Bluetooth diagnostics, three exact DAT/capture pairs, retained native frames, browser checks and K4RJM’s hands-on tests are already recorded. | Extend independent coverage to the unresolved cases, retaining build/device/results for each test. This is targeted coverage work, not a claim that physical testing is absent. |

### Next correction

F07 channel validation is the next bounded software task: use the recorded factory-CPS channel limits, test both RX and TX boundaries and the 1.25 kHz grid, retain empty/receive-only behavior, and review imported/off-grid data handling. Preserve decoded evidence and do not silently rewrite frequencies. VFO rules remain separate. New radio tests should address named gaps rather than repeat the completed factory-CPS checks. Bluetooth protocol, disconnect/reset behavior and writing restrictions are unchanged by this documentation update.


The header build badge, short changelog and single-checkbox preparation checklist are presentation-only changes; the existing backup/risk acknowledgement remains a self-confirmation, with no backup-file verification. Audit status remains **seven corrected findings and eight open**; the v20.12 corrections and limitations below are unchanged.

---

# Remediation detail — v20.12

Date: October 15, 2026. Baseline: v20.11, commit `dcb609729bf2ea29e4ae25785de8666cf824d090`.

**Seven findings are corrected; eight remain open.** F07's silent frequency loss is corrected in this release, while its hardware capability verification remains open. No other finding is reclassified.

Channel frequencies in the existing 100.00000–999.99999 file-format range now survive decoding, including values previously cleared at 600 MHz and above. Malformed decimal bytes and nonempty values below that format are rejected with the raw diagnostic retained and the workspace unchanged. Preflight validation blocks out-of-format imported channel frequencies before connection. This does not establish hardware band limits or change the encoded payloads or Bluetooth transaction behavior.

Verification: **73 passing tests, four expected TODO failures, zero unexpected failures** (77 total). Six new regressions failed before the correction. All 21 supplied private-file checks and 1,042 retained native-frame comparisons still pass. See the [F07 evidence and read-first hardware checklist](F07-EVIDENCE-2026-10-15.md).

| Status | Findings |
| --- | --- |
| Corrected | F02, F04, F09, F11, F12, F14, F15 |
| Open | F01, F03, F05, F06, F07 (representation corrected; hardware domain pending), F08, F10, F13 |

The encoder, Bluetooth reader, memory map, command sequence, acknowledgements, disconnect/reset behavior and existing safety guards are unchanged. `writer.mjs` adds only format validation before a plan is made; no transport method changes. These development checks performed no additional physical radio operations. Rollback is available at `rollback/v20.11-before-f07`.

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
- Only radio-decoder.mjs changes executable protected-core logic. All ten other protected files are byte-identical to v20.10. These automated/offline checks performed no additional physical radio connection, read or write. K4RJM’s supplied physical evidence is recorded below.

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
- The coding-session checks performed no additional physical radio connection, read, write, reboot or firmware operation. This does not describe K4RJM’s separate hardware tests. No RepeaterBook request or token was used.

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
