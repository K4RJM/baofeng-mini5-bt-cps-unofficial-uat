# Permanent project checkpoint

Updated October 16, 2026. Resume here, then read AUDIT-REMEDIATION.md; inspect actual branch heads, tags and deployed versions before making changes. One finding/feature per version; no autonomous physical writes. Never repeat completed hardware tests or reopen an accepted limitation without new evidence.

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

Finish Phase 1 before features: F01, F08, F10, F13; review all 15 dispositions and regression coverage. Accepted factory-compatible limitation is allowed; an unverified corruption risk is not. Keep each completed finding independently versioned, UAT tested, LIVE verified and tagged.

Phase 2 (not started): A restore supported model-specific CHIRP IMG import/export, B CHIRP CSV import/export, C local RepeaterBook CSV import, D coherent import/export/preview/conflict interface. Genuine compatible fixtures and independent validation required. Never program automatically on file import; preserve DAT, identity, memory, frequency and overwrite safeguards. No RepeaterBook live API integration/token is required.
