# F08 — Channel 999: remediated with factory and physical-capture evidence

October 17, 2026. Status: **Remediated — Tested against independent factory output and physical-radio captures (v20.20).** K4RJM explicitly approved publication to both UAT and LIVE after reviewing the correction. Completed factory programming and Bluetooth reading of channel 999 are credited. No additional physical Bluetooth write was performed during this release session.

## What the existing evidence establishes

| Question | Finding |
| --- | --- |
| Channel 998 location | Record index 997 occupies 0x7CA0–0x7CBF under the existing sequential 32-byte layout. Boundary regressions confirm it does not overlap 999; no separate populated-998 physical fixture is claimed. |
| Channel 999 location | Record index 998 occupies 0x7CC0–0x7CDF, independently confirmed by F08-CHANNEL999-WRITE.dat and F08-CHANNEL999.json. |
| Extra native record | Index 999 occupies 0x7CE0–0x7CFF. It is stored in DAT but not exposed as channel 1000. A populated record remains blocked from programming. |
| Trailing records | The factory routine reuses its final 64-byte channel buffer at twelve more addresses from 0x7D00 through 0x7FC0. Each send applies its reversible byte transform again, producing alternating payloads. This is observed buffer reuse, not proof that firmware requires intentional mirrored channels. |
| Ordinary edits with 999 retained | The correction preserves all 832 bytes from 0x7CC0–0x7FFF. Independent whole-image comparison and isolated-edit regressions pass; the changed release has not received an additional physical Bluetooth write test in this session. |
| Editing 999 | The correction regenerates its primary record and all twelve repeated records using the factory pattern. Software comparisons pass; K4RJM approved enabling this behavior based on the independent evidence. |
| Clearing 999 | Both halves empty yield FF across the whole final region. The existing F06 physical test already confirmed the explicit clearing of 299 non-FF bytes. That completed test is retained, not requested again. |
| Why the guard existed | The old encoder initialized the trailing region to FF, so a populated final pair would differ from factory output. It rejected that case rather than guessing. |
| Unknown/reserved meaning | The operational purpose of trailing storage is unconfirmed. The correction reproduces observed factory output; it does not invent extra channel capacity or claim all variants are equivalent. |

## Independent evidence

F08-CHANNEL999-WRITE.dat contains F08TEST at slot 999, RX/TX 146.52000 MHz, no tones, High power. F08-CHANNEL999.json is the subsequent build-20.14 Bluetooth capture, timestamp 2026-10-16T06:53:34.482Z. The correction reconstructs **all 33,344 captured bytes exactly from that factory write DAT**. Reconstruction of the decoded capture also matches all bytes. F06-BEFORE.json has the same complete raw-image hash. F06-AFTER.json independently confirms the earlier successful clearing and normal-channel write.

The older F08-CHANNEL999.dat is a different TEST999 receive-only case; it is not mislabeled as the matching write/read pair. It remains an offline DAT round-trip and representation test.

The retained native cps-write-gap-test.json output was obtained by instrumenting the factory CPS write routine with offline serial stubs. Its synthetic populated extra record produces the same twelve-block alternating pattern. It reports hardwareAccess=false; this is factory-code evidence, not a new radio test. That synthetic record does not authorize channel 1000 in the app. The routine's inspected branches encode channels below 0x7D00, then reuse the buffer until rebuilding it for VFO at 0x8000.

Fingerprints and selected nonpersonal test bytes are in tests/evidence/f08-private-files.json. The original private DATs, diagnostic identities and other channels are not published. scripts/check-f08-evidence.mjs checks the five original files, three whole captures, exact factory write DAT equality and the independent native output. No hardware or network API is used.

## Implemented correction

Only the pure encoder's final-region construction changes. It rejects a populated unsupported record 1000, then fills the twelve trailing blocks with alternating forms of the final channel pair before the existing frame encoding. The Writer import URL changes only to prevent reuse of a cached old encoder. Its transaction methods, 262 full-write blocks, addresses, payload lengths, acknowledgements, connection/session checks, no-retry rule, disconnect/reboot behavior and confirmation are unchanged. There is no partial write, automatic write, new command, forced backup download or mandatory preliminary read.

The correction was developed in an isolated work/baofeng-mini5-f08-review folder. UAT verification precedes LIVE promotion. v20.19 remains the rollback baseline. F01 remains closed under its accepted policy.

## Verification and release authorization

Nine targeted tests first failed with the existing block/rejection behavior and now pass with the correction. They cover literal captured trailing bytes, slot 998 isolation, ordinary edits retaining 999, clearing every repeat, changing 999, record-1000 containment, insert/move/append/DAT boundaries, simulated full write/readback and actual application handlers with an isolated transport double. The record-1000 check already rejected writes before the change; its updated error now names the actual unsupported record.

The full suite passed: 105 total, 104 passing, one expected F10 TODO, zero unexpected failures. All previous 29 private-file checks, five-file F08 replay and both native write-output replays passed. Results are recorded in CODEX-PROGRESS.md. Packaging passed. Simulated success is not physical Bluetooth verification.

K4RJM initially approved UAT publication, then clarified that channel-999 capability had already been physically tested and explicitly authorized LIVE publication too. This authorizes the specific encoder correction; it does not authorize an autonomous radio write or justify claiming a new hardware test. UAT deployment and browser verification remain release gates before LIVE.

## Physical evidence and remaining practical check

The completed factory write/read and successful Bluetooth read establish that channel 999 exists and works. The F06 write/readback already establishes clearing the entire final region. These tests are accepted and are not requested again.

The corrected full image matches the factory write DAT and independently captured bytes exactly; this resolves the editor/writer capacity mismatch. The new release itself has not undergone a new physical Bluetooth write in this development session. During the next ordinary programming operation, retaining channel 999 and comparing the existing readback result can provide additional confirmation without repeating a separate capacity experiment. The unchanged app continues to distinguish acknowledged transfer from verified stored bytes. Any new contradictory evidence should be investigated; no automatic write retry is introduced.
