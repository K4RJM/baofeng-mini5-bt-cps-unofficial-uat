# Permanent project checkpoint

Updated October 18, 2026. Resume here, then read AUDIT-REMEDIATION.md; inspect actual branch heads, tags and deployed versions before making changes. One finding/feature per version; no autonomous physical writes. Never repeat completed hardware tests or reopen an accepted limitation without new evidence.

## Current task — v20.23 / Ham-Rx Mini-5 public information

- Date: October 18, 2026. Explicit request: explain shared factory-compatible limitations publicly, rename the app Ham-Rx Mini-5 and remove the Experimental designation.
- Scope: title/header/Help/version/README/safety wording and public known-limitations document. Existing programming warning, one-checkbox confirmation and all radio safeguards remain. Cause attribution distinguishes shared VFO behavior from the separate stock-CPS display/write issue.
- Tests/publication: pending full suite, package verification and UAT/LIVE browser checks. All protected radio modules must remain byte-identical to v20.22. No physical radio access.
- UAT: separate badge stamp updated for the Version label; separate workflow preserved. Deployment pending.
- LIVE/tag: pending v20.23 after UAT verification. Rollback: v20.22 / f7c749c7b2accf08198047fbdb29e6019954163d.
- Remaining original audit findings: none; F01/F03 remain accepted factory-compatible limitations. Intermittent Bluetooth recovery is not claimed resolved. Phase 2 file-format features not started.
- Approval needed: none; requests and established tested publication process are explicit. No autonomous physical writes.

## Completed release — v20.22 / F13

- Developed October 17; release/tag completed October 18, 2026.
- Disposition: Remediated — Tested. All 15 original findings have final dispositions: 13 corrected/verified/remediated and two accepted factory-compatible limitations (F01/F03); zero open original findings.
- Work: independent literal captured-byte checks; actual discovery with delayed EventTarget notifications; real-browser HTML/File/modal/inertness/write/reconnect checks; four code and two browser negative controls. All 11 protected production modules remain byte-identical to v20.21.
- Tests: 146 Node tests pass, zero failures/TODOs; all five private evidence replays pass, including 1,042 native frames / 66,688 bytes. All 11 browser checks pass separately on final UAT and LIVE. Package contains 43 files.
- UAT: 20.22-UAT.a9c7053; commit a9c70537b130264c441fe81673766e62d7fff72f; Pages run 39078788041 succeeded. Badge, changelog and all 11 browser checks verified.
- LIVE: build 20.22; commit f7c749c7b2accf08198047fbdb29e6019954163d; Pages run 39078909376 succeeded. Badge, changelog and all 11 browser checks verified. All 21 release files match tested UAT; separate workflows preserved.
- Release: [v20.22](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.22), verified tag target f7c749c7b2accf08198047fbdb29e6019954163d.
- Files changed: app.mjs, docs/AUDIT-2026-10-14.md, docs/AUDIT-REMEDIATION.md, docs/CODEX-PROGRESS.md, docs/DEPLOYMENT.md, docs/F13-COVERAGE.md, docs/VERIFICATION.md, index.html, package.json, README.md, scripts/check-f08-evidence.mjs, scripts/check-oct15-evidence.mjs, scripts/check-private-cps-fixtures.mjs, scripts/package.mjs, tests/async-radio.mjs, tests/browser/frame.mjs, tests/browser/index.html, tests/browser/runner.mjs, tests/f13-independent.test.mjs, tests/f13-mutations.test.mjs, tests/f13-transport.test.mjs.
- Rollback: v20.21 / e187006d21868a81cbdee47be9a814795ec6c305.
- Limits: no physical radio operated during this release; completed K4RJM hardware evidence remains credited. Intermittent adapter recovery is not proven resolved. Browser tests cover the in-app Chromium environment, not every browser/OS/firmware variant.
- Next: requested public explanation of factory-compatible limitations, app rename to Ham-Rx Mini-5 and removal of the Experimental designation in v20.23. The October 18 instruction supersedes the earlier instruction to retain that designation. Keep the programming-risk notice and unchanged radio behavior. Phase 2 file-format features have not started.
- Approval needed: none for the expressly requested presentation/documentation release and established tested publication process. No autonomous physical writes.

## Completed release — v20.21 / F10

- Date: October 17, 2026. Initial status: a native Bluetooth promise could hang before the response timer started, leaving the application busy.
- Disposition: Remediated — Tested with fault injection. Release gates passed; UAT and LIVE published and browser-verified.
- Work: per-phase deadlines, cancellation/session invalidation, late-result isolation and unresolved-call quarantine. Original response timeout and successful command/payload/ACK/cleanup sequence preserved. No lab probes, new radio commands or automatic write retry.
- Tests: 135 tests pass, zero failures, zero TODOs; all 30 targeted tests pass. Original F10 stall probe converted to a passing regression. Protected-core hashes and 38-file packaging pass. Both retained native replays match all 1,042 frames / 66,688 bytes; five-file F08 evidence replay passes, including full physical-capture equality.
- UAT: published and browser-verified 20.21-UAT.72c4de4; commit 72c4de4c3a48ba6abaff9d50fe12e05076cee756; Pages run 39053255371 succeeded. Native DAT including channel 999 loaded correctly; Help and changelog verified without connecting a radio.
- LIVE: published and browser-verified build 20.21 and F10 changelog; commit e187006d21868a81cbdee47be9a814795ec6c305; Pages run 39053350965 succeeded. All 15 release-file hashes match tested UAT; separate deployment workflows preserved.
- Release: [v20.21](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.21), verified target e187006d21868a81cbdee47be9a814795ec6c305.
- Files changed: read-test/reader.mjs, writer.mjs, app.mjs, index.html, package.json, README.md, tests/f10-deadlines.test.mjs, tests/audit-radio.test.mjs, scripts/package.mjs, docs/protected-core.json, docs/F10-DEADLINES.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.20 / c9953338d313f7be2b321cabb9852619a0939329.
- Remaining: F13 independent test coverage (one finding). Next: review independent fixture/browser/transport coverage without reopening accepted findings.
- Limits: browser/OS work cannot be forcibly cancelled by JavaScript; unresolved native calls block overlapping reconnect until settled or a saved-work reload. Browser suspension can delay timers. No physical radio operated; no claim to fix intermittent adapter-reset/reconnection reliability. Existing F06 physical evidence is retained, not reopened.
- Approval needed: none for this explicitly authorized bounded F10 correction/release; no autonomous physical writes. A future reconnect experiment is separate UAT work.

## Completed release — v20.20 / F08

- Date: October 17, 2026. Initial status: editor exposed 999, but the writer blocked it because the trailing-buffer pattern was unresolved.
- Final disposition: Remediated — Tested against independent factory output and physical-radio captures. K4RJM explicitly approved UAT and LIVE publication; no repeat channel-capacity test required.
- Work: reproduce the observed twelve alternating trailing blocks, preserve ordinary edits with 999 present, retain unsupported-record-1000 rejection. Writer executable change is an encoder import URL refresh only; transaction logic/protocol/262-frame sequence/ACK/no-retry/disconnect/reset unchanged.
- Tests: 105 total, 104 pass, one expected F10 TODO, zero unexpected failures; nine targeted tests. All previous 29 private-file checks, five-file F08 replay and 1,042 native frame comparisons pass. Exact factory write DAT to 33,344-byte capture match. Protected hashes and packaging pass.
- UAT: published and browser-verified 20.20-UAT.53c8c52; commit 53c8c52bb0603501bc967963940d6bff7394f599; Pages run 39008093372 succeeded. Synthetic native DAT with channel 999 loaded; write preflight reached the normal confirmation dialog, then was cancelled without connecting or programming. Changelog verified.
- LIVE: published and browser-verified build 20.20 and F08 changelog; commit c9953338d313f7be2b321cabb9852619a0939329; Pages run 39031575293 succeeded. All 18 release-file hashes match tested UAT; deployment workflows remain separate and unchanged.
- Release: [v20.20](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.20), verified target c9953338d313f7be2b321cabb9852619a0939329.
- Files changed: radio-encoder.mjs, writer.mjs, app.mjs, index.html, package.json, README.md, tests/f08-layout.test.mjs, tests/audit-radio.test.mjs, tests/evidence/f08-private-files.json, scripts/check-f08-evidence.mjs, scripts/check-oct15-evidence.mjs, scripts/package.mjs, docs/protected-core.json, docs/F08-EVIDENCE.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.19 / 4e2750b778c3affb3caf5c4ea6a9380053ca2dc1.
- Remaining: F10, F13 (two). Next: F10 native-operation deadlines and interruption handling.
- Known limits: factory buffer reuse is confirmed, but firmware's purpose for repeated storage is not. No new physical Bluetooth write of this release occurred in this session; do not misrepresent the prior factory/physical-capture evidence as such. Existing readback verifies stored data after an explicit write.
- Approval needed: none for publication; K4RJM explicitly requested LIVE too. No autonomous physical writes.

## Completed release — v20.19 / F01

- Accepted October 16; LIVE release completed October 17, 2026.
- Initial status: DAT reconstruction changes unmapped bytes; factory compatibility needed a final disposition.
- Final disposition: Closed — Accepted Factory-Compatible Behavior, explicitly requested by K4RJM.
- Work: compared both retained factory outputs; recorded exact scope and physical 0x9018 observation; retained normalization regression; recorded the proposed new-radio marker as an unconfirmed hypothesis. No writer, codec or transport change.
- Tests: 96 total, 95 pass, one expected F10 TODO, zero unexpected failures. All 29 retained private-file checks pass; both factory write-output replays match all 1,042 frames / 66,688 payload bytes. Protected-core hashes pass.
- UAT: published and browser-verified 20.19-UAT.4fff43a; commit 4fff43a51fdf986e35f47282e261973a98bd4b25; Pages run 38986533680 succeeded. Editor, changelog and updated Help verified.
- LIVE: published and browser-verified build 20.19 and F01 changelog; commit 4e2750b778c3affb3caf5c4ea6a9380053ca2dc1; Pages run 39007297727 succeeded. All 14 release-file hashes match tested UAT.
- Release: [v20.19](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.19), verified target 4e2750b778c3affb3caf5c4ea6a9380053ca2dc1.
- Files changed: package.json, index.html, app.mjs, README.md, tests/audit-radio.test.mjs, tests/evidence/f01-factory-captures.json, scripts/check-oct15-evidence.mjs, scripts/check-private-cps-fixtures.mjs, scripts/package.mjs, docs/F01-FACTORY-COMPATIBILITY.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.18 / accd878c03831ab7ea21beee2e63a835da986e19.
- Remaining: F08, F10, F13 (three). Next: F08 channel 999/trailing layout, retaining its existing guard until justified.
- Known limits: no universal assertion that unmapped bytes are unused; 0x9018 meaning remains unconfirmed. Factory compatibility does not certify all variants. The proposed read-first guard was rejected, restored out of active source, archived locally and never published; do not revive or bundle it.
- Approval needed: none for this explicitly accepted closure and authorized incremental release. No autonomous physical writes; no repeat F01 hardware test requested.

## Completed release — v20.18 / F05

- Initial status: fresh model checks existed, but final identity-object validation and session binding were incomplete; loaded-file trust wording was misleading.
- Final disposition: Remediated — Tested.
- Work: complete exact 5RMINI identity validation; device/id/characteristic/generation binding before each programming frame; explicit loaded-source policy; preserved protocol and reboot handling.
- Tests: 96 total, 94 passing, two expected TODOs (F01/F10), zero unexpected failures. Seven new F05 tests, four failing before correction. Original 21, six F03 and two F06 file checks pass. Identity dimensions/model bytes match retained physical diagnostics.
- UAT: published and browser-verified 20.18-UAT.6bcced4; commit 6bcced49bc4e33e739bf5d552179fbf22ce014f3; Pages run 38984439028 succeeded. Workspace, Help, changelog and DAT loaded-source label verified.
- LIVE: published and browser-verified build 20.18 and F05 changelog; commit accd878c03831ab7ea21beee2e63a835da986e19; Pages run 38984885250 succeeded. Exact application payload matched tested UAT.
- Release: [v20.18](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.18), verified tag target accd878c03831ab7ea21beee2e63a835da986e19.
- Files changed: writer.mjs, tests/f05-identity.test.mjs, tests/audit-ui.test.mjs, package.json, index.html, app.mjs, README.md, scripts/package.mjs, docs/protected-core.json, docs/F05-IDENTITY-POLICY.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.17 / b667e4b6d493e7717566e7f636a549bc963c4c25.
- Remaining: F01, F08, F10, F13 (four). Next: F01 unknown-memory preservation.
- Known limits: model does not certify firmware/hardware variants. F10 still covers native operations that never settle; F01/F08 memory protections remain open and unchanged. No additional hardware compatibility test needed for the two already tested radios.
- Approval needed: none for the authorized guard correction; no autonomous physical writes.

## Completed release — v20.17 / F06

- Initial status: successful physical programming/reboot known; final evidence disposition pending.
- Final disposition: Closed — Verified on Physical Hardware.
- Work: independently reproduced both original diagnostics, all 322 intended changes and zero unrelated changes; reviewed existing acknowledged/reboot/verify behavior without modifying it; added captured-record and application-flow regressions; updated Help and audit.
- Tests: 89 total, 86 passing, three expected TODOs (F01/F05/F10), zero unexpected failures. All 21 original files, six F03 files and two F06 files pass offline checks. Exact 33,344-byte post-read reconstruction matches independent hardware capture.
- UAT: published and browser-verified 20.17-UAT.7358da1; commit 7358da1e8968ec3454ee87c6823fad4ec2d752c3; Pages run 38952384811 succeeded. Editor, Help and F06 changelog verified.
- LIVE: published and browser-verified build 20.17 and F06 changelog; commit b667e4b6d493e7717566e7f636a549bc963c4c25; Pages run 38952619870 succeeded. Exact application payload matched tested UAT.
- Release: [v20.17](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.17), verified tag target b667e4b6d493e7717566e7f636a549bc963c4c25.
- Files changed: package.json, index.html, app.mjs, README.md, tests/f06-evidence.test.mjs, tests/evidence/f06-oct16-private-files.json, scripts/check-f06-evidence.mjs, scripts/package.mjs, docs/F06-EVIDENCE-2026-10-16.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.16 / 1d7cd4459f145b7c335737677cd42dfab5eb7315.
- Remaining: F01, F05, F08, F10, F13 (five). Next: F05 current-device identity and source policy.
- Known limits: physical reboot sequence is K4RJM testimony; final files contain successful read reports, not ACK timing traces. F01 unknown bytes, F08 trailing layout and F10 unexpected interruptions remain open. No repeat F06 physical test requested.
- Approval needed: none for this evidence closure; no autonomous physical radio write authorized.

## Completed release — v20.16 / F03

- Initial status: open VFO direction/SignalCode overlap; factory behavior now independently corroborated and explicitly accepted by K4RJM.
- Final disposition: Closed — Accepted Factory-Compatible VFO Limitation.
- Work: preserved codec; documented completed physical tests, exact private-file corroboration and reported-versus-reproduced distinction; retained all 120 cases as characterization; added independent hardware-byte and channel-isolation checks.
- Tests: 87 total, 84 passing, three expected TODOs (F01/F05/F10), zero unexpected failures; 21 original plus six new private-file checks pass.
- UAT: published and browser-verified 20.16-UAT.2ca82d3; commit 2ca82d36b303a8529f4a479e509596dfbc670872; Pages run 38910539745 succeeded. Editor, Help and F03 changelog verified.
- LIVE: published and browser-verified build 20.16 and F03 changelog; commit 1d7cd4459f145b7c335737677cd42dfab5eb7315; Pages run 38951684198 succeeded. Exact application payload matched tested UAT.
- Release: [v20.16](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.16), verified tag target 1d7cd4459f145b7c335737677cd42dfab5eb7315.
- Files changed: package.json, index.html, app.mjs, README.md, tests/audit-radio.test.mjs, tests/f03-evidence.test.mjs, tests/evidence/f03-oct16-private-files.json, scripts/check-f03-evidence.mjs, scripts/check-oct15-evidence.mjs, docs/F02-F03-EVIDENCE-2026-10-15.md, docs/AUDIT-REMEDIATION.md, docs/AUDIT-2026-10-14.md, docs/VERIFICATION.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.15 / 473d3da77f758574eb65969ecc9a4bd943034cb3.
- Remaining: F01, F05, F06, F08, F10, F13 (six). Next: F06 independent original-file comparison and closure.
- Known limits: VFO fields are not independently selectable in all combinations; precise origin unknown. Fresh PLUS/1–PLUS/17 full-image equality is recorded as reported hardware evidence, not independently reproduced from the differently labeled saved pair. No new physical test requested.
- Approval needed: none for this accepted closure; no physical radio write authorized.

## Completed release — v20.15 / F07

- Initial status: channel representation corrected in v20.12; channel-policy correction implemented and deployed in v20.14; awaiting reconciliation of completed hardware evidence.
- Final disposition: Closed — Verified. Existing factory-CPS testing covers the memory-channel ranges/grid; the original channel defect is covered. VFO reception is separate and is not RF certification or an expanded channel limit.
- Work: reconciled scope, retained all regression and hardware evidence, corrected current Help/audit status. Radio, codec, frequency-validation and transport code unchanged.
- Tests: 85 total; 81 passing; four expected TODOs (F01/F03/F05/F10); zero unexpected failures. F07 targeted: 15 pass. Original 21 private-file checks pass.
- UAT: published and browser-verified 20.15-UAT.b97111a; commit b97111a81c45feb9902c76c7e6f4bd8fc533c480; Pages run 38909390660 succeeded. Editor initialized and F07 changelog matched.
- LIVE: published and browser-verified build 20.15 and F07 changelog; commit 473d3da77f758574eb65969ecc9a4bd943034cb3; Pages run 38909659809 succeeded. Exact application payload matched tested UAT.
- Release: [v20.15](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.15), verified tag target 473d3da77f758574eb65969ecc9a4bd943034cb3.
- Files changed: package.json, index.html, app.mjs, README.md, scripts/package.mjs, docs/AUDIT-2026-10-14.md, docs/AUDIT-REMEDIATION.md, docs/F07-EVIDENCE-2026-10-15.md, docs/VERIFICATION.md, docs/DEPLOYMENT.md, docs/CODEX-PROGRESS.md.
- Rollback: v20.14 source c38d90f8bf047e8ccc84eb3032f05bf0d59c4fef.
- Remaining findings after this closure: F01, F03, F05, F06, F08, F10, F13 (seven).
- Next: F03 accepted factory-compatible VFO limitation, then F06 write/reboot/readback evidence, each separately versioned and published. F07 is completed first because its implementation/release was already underway on receipt of the master task.
- Known limits: F01 unknown memory, F05 identity/provenance, F08 final channel pair, F10 bounded async operations and F13 independent coverage still need investigation. F03/F06 already have completed physical evidence and need formal individual dispositions.
- Approval needed: none for this bounded documentation release; no physical write is authorized. Stop on a failed release gate/publication and record the blocker.

## Verified starting release — v20.14 / F07 channel validation

- LIVE: tag v20.14 verified at c38d90f8bf047e8ccc84eb3032f05bf0d59c4fef; Pages run 38858089515 succeeded; fresh browser page and changelog confirmed build 20.14.
- UAT: 9a627493e9f6bf69e5b95832ee255c939b2d2312; Pages run 38857839155 succeeded; browser confirmed 20.14-UAT.9a62749.
- Tests: 85 total, 81 passing, four expected TODOs; 12 full accepted payload/frame fingerprints unchanged from v20.13; 21 private-file checks passed.
- Browser: invalid imported frequency preserved; programming preflight blocks before connection; range and grid errors block Apply/Next; short valid input pads zeros; blank TX retained; VFO 350.00000 exported unchanged. No Bluetooth connection/read/write performed.
- Rollback: 1b1c6b434c130e3d799bf258ff9bce2d6bef6fe3.

## Remaining master-task sequence

Phase 1 is complete as of v20.22: all 15 original findings have final dispositions. Accepted factory-compatible limitation is allowed; an unverified corruption risk is not. Keep each completed finding independently versioned, UAT tested, LIVE verified and tagged.

Phase 2 (not started): A restore supported model-specific CHIRP IMG import/export, B CHIRP CSV import/export, C local RepeaterBook CSV import, D coherent import/export/preview/conflict interface. Genuine compatible fixtures and independent validation required. Never program automatically on file import; preserve DAT, identity, memory, frequency and overwrite safeguards. No RepeaterBook live API integration/token is required.
