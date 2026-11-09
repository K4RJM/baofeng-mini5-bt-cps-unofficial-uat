# UV-32 read-only channel capture — UAT v20.40

Updated November 9, 2026. UAT only. MINI-5 programming and LIVE are unchanged.

## What this adds

After **UV-32 / With response / Check radio ID** completes, **Read UV-32 channels** captures channel records and opens a separate, read-only preview. The existing MINI-5 workspace is preserved. **Save UV-32 capture** downloads the latest successful or partial capture as JSON. The preview can also save its last successful capture after a later attempt fails.

The capture covers **1,000 records of 32 bytes**, addresses **0x0000–0x7CFF**, in **500 reads of 64 bytes**. It contains channels only: it does not read VFO/settings areas, bank names, firmware, or a complete codeplug. No DAT/IMG export or UV-32 editing/writing is enabled.

The table shows bank numbers (100 channels per bank), frequencies, tones, power, bandwidth, scan, PTT-ID, signaling, busy lock, FHSS and names. Squelch mode is shown as a raw code because its UV-32 label mapping is not yet independently confirmed. Unknown values and invalid BCD are flagged instead of reduced modulo a range or silently corrected. Physical comparison of the decoded channels remains pending.

## Evidence and implementation boundary

The physical [v20.38 handshake](UV32-HANDSHAKE-2026-11-08.md) established bridge setup, opening ACK, frequency-range response, UV32PRO identity and final initialization ACK with **With response** and **20 + 5-byte SEND**. It did not read memory.

The independent wired implementation is [CHIRP's baofeng_uv17Pro.py at commit 19b5359693d37204e21ad11ce4e5613614de3886](https://github.com/kk7ds/chirp/blob/19b5359693d37204e21ad11ce4e5613614de3886/chirp/drivers/baofeng_uv17Pro.py):

- UV32 inherits the UV17ProGPS memory layout, 1,000 channel records and 64-byte reads.
- Its download command is `52 address-high address-low 40`.
- A record contains little-endian BCD RX/TX frequencies, 16-bit tones, signaling/PTT-ID, flags and a 12-byte name.
- The UV-32 class inherits the CO7 payload transformation. The candidate applies it only to the read-only preview and retains every original received payload byte.
- The selected region is a channel-only subset of CHIRP's first read region. Settings and other regions are deliberately excluded from this first hardware test.
- No exit/reset command is added. CHIRP's download loop returns after reading; the normal Disconnect control remains available.

The candidate additionally requires an exact response opcode `52`, requested address and length `40`, with no trailing bytes. CHIRP discards the four response-header bytes without validating them; the **UV-32 Bluetooth header convention and wire transformation still need physical verification**. Any mismatch stops at the first affected block and preserves diagnostic bytes. The code does not guess an alternate header, size, cipher or address.

## Read protections

- A completed With-response UV32PRO handshake creates an internal capability bound to the same device object, characteristic and connection generation. It is consumed once. A saved JSON report cannot grant read access.
- The general identification tool still displays other printable model names. That does not grant use of the UV-32 memory layout.
- Only aligned 64-byte channel reads in the fixed range can be constructed. No arbitrary-address input, memory write, firmware command or retry exists.
- Each native send and response wait is bounded. Disconnect, replacement connection, cancellation, malformed data, excess data or timeout stops the capture. Late operations cannot resume it.
- A partial report contains only validated blocks in `wireHex`, plus the failing request/response or pending bytes. It is labelled incomplete.
- Cancel stops after the current bounded Bluetooth operation. It does not add a reset or radio command.
- MINI-5 radio actions are disabled in the UAT UI while UV-32 is selected; switching back restores their normal controls. MINI-5 protocol and safeguards are unchanged.

## First physical test

1. Open UAT and confirm **20.40-UAT**.
2. Select **UV-32**. The send selector changes to the physically verified **With response** setting.
3. Enable Wireless CPS and disconnect other programming apps. Click **Check radio ID**.
4. After **Handshake complete: UV32PRO**, click **Read UV-32 channels**.
5. Save the capture whether it succeeds or stops. Compare the first channels, a later bank and the last populated channel against the radio/factory CPS.
6. Use Disconnect when finished. A new read requires another successful identity check.

The development agent does not perform physical-radio operations. K4RJM performs the hardware test. Captures may contain private channel names/frequencies; nothing is uploaded automatically.

## Software evidence and credit

Twelve targeted tests cover region boundaries, header rejection, the independent CHIRP fixture, decoding/unknown values, capability binding, channel 1000, all 500 requests, malformed/truncated/silent/excess replies, partial retention, cancellation and native deadlines. The existing suite remains required. A browser regression checks the read-only preview, workspace preservation, hostile-name text rendering, download, mobile containment and failed-read retention.

The two fixed channel records used in tests come from [CHIRP's public UV-17ProGPS test image](https://github.com/kk7ds/chirp/blob/19b5359693d37204e21ad11ce4e5613614de3886/tests/images/Baofeng_UV-17ProGPS.img), Git blob `e3ded1fa6f9240cb2edaff8023af9254defc593f`. This exercises the inherited layout, **not a physical UV-32 memory capture**. The fixture's first channels decode to VHF 1 (160.65000 / 156.05000) and VHF 2 (160.70000 / 156.10000).

Credit: K4RJM's physical testing; CHIRP contributors, including Sander van der Wel, for the independent UV-17Pro/UV-32 format and protocol reference; the previously credited phone-app capture for Bluetooth bridge setup. This repository remains GPL v3. No APK, private capture or shared token is published.

See [initial reader release](RELEASE-20.39.md) and [current diagnostics release and rollback](RELEASE-20.40.md). This candidate does not establish UV-32 programming compatibility, repeated-read reliability or full settings support.

## v20.40 pre-read diagnostic update

K4RJM's successful handshake was followed by a rejected read-session check in v20.39. The screenshot did not identify the failed condition. v20.40 retains a before-read report with the exact guard results and any buffered bytes; **Save read diagnostics** remains available when no channel capture exists. The top toolbar displays a failed read instead of leaving the previous handshake success as the latest result. Diagnostics do not clear pending bytes or authorize a read. The physical cause remains open until the saved report is inspected. Three added Node regressions and one added browser check cover these diagnostic paths; execution results are recorded in the release document.
