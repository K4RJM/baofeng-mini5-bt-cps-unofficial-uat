# Ham-Rx Mini-5 — Known factory-compatible limitations

Updated October 18, 2026. Ham-Rx Mini-5 is the new name for **Baofeng Mini 5 BT CPS – Unofficial**. These notes explain the practical limits established by K4RJM’s physical tests, factory CPS comparisons and independent Bluetooth memory captures. They apply to the tested configuration; they do not certify every radio or firmware version.

## VFO offset direction and DTMF group can overlap

**The same VFO limitation occurs with stock Baofeng wired CPS and this Bluetooth CPS.** Some combinations of offset direction and DTMF group share a stored representation, so both choices cannot always be retained independently.

The completed VFO A tests produced:

| Settings written with factory CPS | Factory CPS readback, corroborated by Bluetooth evidence |
| --- | --- |
| OFF / DTMF group 17 | PLUS / DTMF group 17 |
| PLUS / DTMF group 1 | PLUS / DTMF group 17 |
| PLUS / DTMF group 17 | PLUS / DTMF group 17 |

DTMF groups are numbered signaling-code entries, not collections of channels. OFF/PLUS in this table refers to the VFO transmit-offset direction.

**Practical effect:** a selected VFO direction or signaling group can read back differently after programming, including a change from OFF to PLUS. Do not assume that selecting both fields makes them independent. Use saved memory channels with explicit receive/transmit frequencies for repeater operation, and review VFO settings after readback. This overlap does not affect normal memory-channel records. Verification of stored bytes does not verify all on-air behavior.

The shared behavior likely involves radio firmware or the configuration format, but the exact cause has not been established. It is not a demonstrated defect unique to Ham-Rx Mini-5. The tested mapping is retained for factory compatibility; changing it without evidence could introduce a programming fault. The examples above do not establish every VFO A/B combination.

Audit disposition: **F03 — Closed, accepted factory-compatible VFO limitation.** See the [physical evidence and scope](F02-F03-EVIDENCE-2026-10-15.md). Historical open-status sections in that report describe the earlier investigation, not the current disposition.

## A native DAT backs up CPS configuration

A native DAT stores channels and CPS settings. The same file can be opened in Ham-Rx Mini-5 for Bluetooth programming or stock Baofeng CPS for programming with a compatible cable. It does not contain firmware or every raw memory byte.

Both programmers reconstruct the CPS memory layout. The retained factory write output uses fixed values in some areas that are not represented by editable settings; the Bluetooth CPS reproduces that behavior. Those areas can be normalized during a full configuration write. This is not evidence that every unmapped byte is unused, and factory compatibility alone does not establish a firmware fault.

**Practical effect:** keep a native DAT backup for restoring configuration. If original captured bytes are needed for troubleshooting, also save the diagnostic report privately. A diagnostic capture is not a firmware backup or a supported file to flash back to the radio.

Audit disposition: **F01 — Closed, accepted factory-compatible behavior.** See [factory-output comparisons and limits](F01-FACTORY-COMPATIBILITY.md).

## Stock CPS settings display: a separate caveat

K4RJM observed stock wired CPS displaying defaults for some PTT-ID and VFO settings after reading the radio, while independent Bluetooth captures retained the intended stored values. A later factory-CPS write changed the PTT-ID delay back to code 0. Reading/displaying defaults and subsequently writing them are separate events.

Ham-Rx Mini-5 retains the v20.11 correction that preserves the evidenced stored codes: **3000 ms PTT-ID delay**, **BOTH VFO PTT-ID**, and **QT/DQT + DTMF for VFO A**. This corrects the earlier Bluetooth decoder reduction; it does not prove every signaling function on every firmware version.

**Practical effect:** recheck these settings before writing with stock CPS, especially when moving a configuration between programmers. Do not attribute the reported factory display/write sequence to the Bluetooth CPS or automatically classify it as a firmware fault. See [F02 evidence](F02-F03-EVIDENCE-2026-10-15.md#f02--corrected-decoding).

## Testing and release status

Physical testing includes successful programming, normal reboot, reconnection, readback and factory comparisons on the recorded MINI-5 test setup. The identified baseline is Radio 100 / firmware V0.05 / hardware V1.7. The original 15 audit findings have final dispositions; F01 and F03 are accepted limitations, not claims that the underlying behavior has been removed.

The app was renamed and the Experimental designation removed at K4RJM’s request in v20.23. Programming-risk notices, model checks, confirmation, no automatic write retry and readback verification remain. Intermittent cases requiring PC/radio Bluetooth toggles are not claimed resolved. See [audit status](AUDIT-REMEDIATION.md), [automated coverage](F13-COVERAGE.md) and [release verification](CODEX-PROGRESS.md).
