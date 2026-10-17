# F13 — Independent evidence and browser coverage

Date: October 17, 2026. Candidate v20.22; final release results are recorded in [CODEX-PROGRESS.md](CODEX-PROGRESS.md).

## What this finding covers

The original suite could pass while an encoder and decoder shared the same mistake. Its transport delivered every response inside the send call, and its simplified DOM invented missing elements. F13 concerns those test weaknesses. It does not require a second person to repeat K4RJM's completed physical tests.

Useful unit tests remain, but they no longer provide the only evidence. New tests consume literal hardware bytes without first calling the encoder, drive the actual connection/discovery code through asynchronous GATT events, and exercise the real application HTML in a browser. Programming, codec, memory-map, validation and connection-recovery modules are unchanged from v20.21.

## Evidence and coverage map

| Requirement | Independent evidence and regression coverage | Boundary |
| --- | --- | --- |
| Physical captures / native output | Private Oct 15, F03, F06 and F08 manifests pin original files by SHA-256; replay scripts compare full 33,344-byte captures and 1,042 retained native output frames. | Private originals are not published. Native read-oracle code is partly transcribed and has two explicitly retained F02 differences. |
| Decoder input independent of encoder | `f13-independent.test.mjs` constructs input from literal F02/F03/F06 capture excerpts plus FF filler; checks delay 28, PTT-ID 3, mute 2, VFO byte 0x10 and channel 71. | The filler is synthetic, not a new physical capture or a valid full programming image. |
| Frequency rejection | `f07-frequency.test.mjs`, `f07-channel-policy.test.mjs`: literal decimal/BCD cases, all off-grid remainders, recorded factory channel boundaries, preserved import and blocked write preflight; real-browser invalid-edit navigation check. | VFO reception and RF certification are not implied. |
| Accepted F03 ambiguity | Literal 0x10 plus all 120 A/B direction/group cases; independent factory/capture file replay; explicit collision expectations. | Accepted factory-compatible packing is retained, not “fixed” by inventing independent fields. |
| Channel 999 / 1000 | `f08-layout.test.mjs`: literal 13-block tail, ordinary-edit isolation, clear/move/append boundaries and blocked record 1000; private full capture/native comparisons. | Existing hardware evidence is credited; no new physical write occurs. |
| Model/session identity | `f05-identity.test.mjs`, async GATT wrong-model test and real-browser wrong-model write attempt: exact fresh 5RMINI identity, malformed/stale/swapped device rejection before writes. | Matching model does not identify every firmware/hardware variant. |
| Unknown / unrelated memory | F01 accepted normalization test, pinned factory output, F06 exactly 322 intended changed bytes and zero outside intended regions, F08 ordinary-edit isolation and whole-image comparisons. | DAT reconstruction is accepted factory behavior, not universal preservation of arbitrary unmapped bytes. The proposed new-radio marker remains a hypothesis. |
| Reboot/disconnect | Existing F06 physical evidence and recovery tests; new EventTarget peripheral emits separate post-ACK disconnect and real notifications; explicit reconnect/readback browser flow. | Simulations cannot certify Windows adapter recovery. |
| Timeouts / uncertainty | F10 fault/race tests; asynchronous partial reply, dropped ACK, NAK and link loss; browser controls recover after a missing ACK while writing stays locked. | Browser timers may be delayed by suspension; OS calls cannot be forcibly cancelled. No automatic write retry. |
| Real DOM | Actual HTML/module startup, File/DataTransfer import, event bubbling, row editing, native modal focus, one checkbox, disabled confirmation, inert busy workspace, numeric max and control recovery. | Real Chromium engine in the in-app browser, not a claimed Android/Edge or screen-reader certification. |
| Test sensitivity | Four disposable-copy code mutations restore the three F02 modulus errors or change F03 packing. Browser variants remove confirmWrite or busy inertness; the same checks must fail. | Deliberately broken code exists only in temporary test copies or isolated iframe/blob modules. |
| Stable production behavior | Full regression suite, protected-core SHA-256 gate, unchanged module comparison, exact native frames and 262-write/521-read asynchronous transaction checks. | Finite regression evidence is not a guarantee of no future defects. |

## Running the tests

Run `npm test` and `npm run package`. Node tests include independent byte checks, the asynchronous peripheral and four mutation controls. A mutation counts as detected only when the intended test produces an assertion failure; syntax/import errors and protected-file checksum failures do not count. The unmodified control must first run and pass both evidence tests.

For real-browser checks, serve the repository or packaged site and open `tests/browser/index.html`, then choose **Run browser checks**. This runs the actual application in an isolated iframe and reports each result. This browser suite is an explicit release gate; it is not silently counted among Node's test totals or represented as automatic GitHub CI coverage.

The fixture page installs an immutable simulated `navigator.bluetooth` before importing the application, and the iframe also denies the Bluetooth permissions policy. If the substitute cannot be installed, application import stops. No path delegates to the real Bluetooth API. Test DATs are synthetic, stay in memory and are not uploaded. Opening a test page does not itself run tests. The ordinary application never imports this harness.

Private replay commands (paths supplied locally, files read only):

```
node scripts/check-oct15-evidence.mjs <testing-directory>
node scripts/check-f03-evidence.mjs <testing-directory>
node scripts/check-f06-evidence.mjs <testing-directory>
node scripts/check-f08-evidence.mjs <testing-directory> <retained-native-project>
node scripts/check-private-cps-fixtures.mjs <retained-native-project>
```

## Release limits

Closing F13 means the demonstrated coverage defects have targeted regression checks with independent evidence and successful negative controls. It does not mean every setting, browser or radio variant has exhaustive independent coverage. Original physical results remain credited to K4RJM. No repeat hardware test is required for this test-only correction.

The intermittent need to toggle PC/radio Bluetooth remains a separate investigation. The Experimental designation stays in place pending the previously agreed release-qualification criteria. No new radio commands, protocol timing, memory layout, disconnect/reset behavior or write permissions are introduced here.
