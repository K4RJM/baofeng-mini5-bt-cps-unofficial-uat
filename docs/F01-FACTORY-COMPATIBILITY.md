# F01 — Closed: Accepted Factory-Compatible Behavior (v20.19)

On October 16, 2026, K4RJM accepted the existing native-DAT reconstruction behavior and requested F01 closure because it follows the factory CPS. The original observation is retained: rebuilding a DAT configuration can normalize bytes outside its represented fields. No writer or codec correction is made, and byte-for-byte preservation of an arbitrary downloaded image is not claimed.

## Evidence and scope

- The retained CpsWriteCapture.cs harness instrumented the factory CPS write routine with offline serial/acknowledgement stubs. Both outputs report success, hardwareAccess=false and 521 frames containing 64 payload bytes each. These are factory-code outputs, not new physical transmissions.
- Replaying the unchanged offline encoder against both original input objects reproduces every captured frame: 1,042 frames and 66,688 payload bytes. The factory routine includes twelve blocks covering 0x7D00–0x7FFF. In these two fixtures the gap payloads are FF; the settings block sets both 0x9013 and 0x9018 to 00. The factory write routine zero-initializes its settings buffer and does not assign 0x9018.
- Selected values and SHA-256 fingerprints are published in tests/evidence/f01-factory-captures.json. Full original inputs, DATs and diagnostic captures remain private. scripts/check-private-cps-fixtures.mjs replays the retained outputs offline; it does not load the CPS executable or access hardware.
- The earliest physical diagnostic, mini5-diagnostic.json, contains plaintext 1 at radio address 0x9018 (transport 0x42; compact image offset 0x8058). Reconstruction changes only that byte to zero. Seven later inspected diagnostics contain zero there: F02-AFTER, F03-AFTER, F02-F03-COMBINED, F03-OFF-GROUP17, F03-PLUS-GROUP1, F06-BEFORE and F06-AFTER. No causal claim is made about which intervening operation changed the initial byte.
- The original synthetic probes at 0x7D00 and 0x9013 remain in regression coverage, together with the observed 0x9018 case. Their expected normalization is now explicit and compared with the selected factory output. The retained physical-file checks still assert the original one-byte difference; the observation has not been removed to obtain a passing test.

## Meaning of 0x9018 remains unconfirmed

K4RJM proposes that 1 marks a new, unprogrammed radio and 0 marks a previously programmed radio. This is recorded as a hypothesis, not an established memory definition. An independent CHIRP implementation labels the corresponding inherited settings byte a_or_b_selected (A=0, B=1), another possible explanation that has not been confirmed on these radios. Neither explanation is required for this closure, and neither is used to change encoding. The observed 1-to-0 transition alone does not distinguish them.

The finite evidence supports acceptance of the tested factory-compatible reconstruction. It does not establish that every unmapped location is unused, always blank, or interchangeable across firmware variants. Factory compatibility is the disposition; arbitrary raw-memory preservation is not a new requirement. Do not reopen F01 without new contrary evidence.

## Boundaries and verification

The writer, encoder, decoder, Bluetooth commands, block addresses, acknowledgements, no-retry policy, reboot/disconnect/reset behavior and existing safety protections remain byte-identical to v20.18. No read-first or exact-reconstruction gate is introduced. The rejected local guard prototype is excluded from both deployments. No physical operation was performed for this documentation release, and no repeat physical F01 testing is requested.

F08 remains separate: factory final-channel data can affect the trailing region, so the all-FF result above must not be generalized to a populated final channel. The existing final-pair guard remains intact. F10 (unsettled Bluetooth operations) and F13 (independent coverage) remain open.

Full regression target: 96 tests, 95 passing, one expected F10 TODO, zero unexpected failures. The 29 retained physical-file checks and both native write-output replays are release gates. Actual results and publication are recorded in [verification](VERIFICATION.md) and [progress](CODEX-PROGRESS.md).
