# UAT radio identification — v20.35

Updated November 1, 2026. UAT only; LIVE v20.33 is unchanged.

## Controls and scope

Choose MINI-5, GM-30 Pro or UV-32 in **Radio protocol**, then **Check radio ID**. This connects if needed and runs the selected identification handshake. A different printable model name is displayed rather than rejected. Save the handshake report to retain the exact request/response bytes. Selection alone sends nothing. No physical-radio operation was performed while developing this release.

These tools establish a Bluetooth programming connection and identify the radio. They do not read channel memory, load another model's channels through the MINI-5 decoder, or send programming frames. The existing MINI-5 read/write path, identity checks, same-device binding, acknowledgement requirements and confirmation remain unchanged. The new dropdown controls the identification tool, not a full GM-30 Pro/UV-32 codeplug driver.

## Evidence

Static inspection of the locally supplied **OLA Radio Android 2.5.6**, package `com.aewt.app.friends`, found bundled `assets/flutter_assets/assets/jsons/all_protocols.json` and `model_config.json`. No app execution, private service request or shared token was used. The APK and its full proprietary configuration databases are not included in this repository.

| Profile | OLA evidence | Reported model prefix | Identification length used |
| --- | --- | --- | --- |
| MINI-5 | protocol10, 5R Mini | `5RMINI` | 15 bytes, existing captured behavior |
| GM-30 Pro | protocol15, additional-model entry, UV19-BT GMRS family | `GM-30P ` | 7 bytes per CHIRP family; optional 8-byte BLE suffix collected |
| UV-32 | protocol12, UV32 PRO | `UV32PRO` | 7 bytes per CHIRP family; optional 8-byte BLE suffix collected |

All three OLA entries use `PROGRAMCOLORPROU` -> ACK `06`, `46` -> 16-byte configuration, `4D` -> model information, then `53454e4421050d010101041108050d0d01110f091209100400` -> ACK `06`. OLA's model prefix lists are **not proof of the complete response length**: its MINI-5 entry lists six prefix bytes while our captured reply is fifteen bytes.

Independent [CHIRP baofeng_uv17Pro driver](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/baofeng_uv17Pro.py) uses this command sequence. `RadioddityGM30Pro` inherits from `UV17ProGPSGMRS`, and `UV32` inherits from `UV17ProGPS`; that family requests seven bytes after `4D`, whereas the MINI-5 base requests fifteen. This is wired-driver evidence, not a completed Bluetooth test on either new model.

The new diagnostic waits 250 ms after a seven-byte identity to collect an optional eight-byte suffix. A partial or oversized suffix is rejected, never treated as the initialization ACK. This timing accommodation is a UAT assumption requiring physical verification; it changes none of the existing MINI-5 transport deadlines. No retries, new reset commands or disconnect behavior are added.

The BLE service/characteristic remain `FFE0` / `FFE1`. Availability of those services and actual response timing on the two radios must be verified. A missing service or a link loss during service discovery occurs before the model response; it does not establish the underlying cause.

OLA includes 1,000 channels and ten zones for these families and a zone area beginning at `A200`; the MINI-5 application has 999 editable channels and a different write extent. That is why identification evidence does not justify applying MINI-5 programming frames to these radios.

### Reference hashes (SHA-256)

- `com.aewt.app.friends.apk`: `4596ba0f7845c7c7ecf743340b2fbad696fb82e7dc53909b7c71854a9de06c3a`
- `jsons/all_protocols.json`: `6d38d7d5bb4c1958f9220bdd97d2cac3a5f64a5ee77fe392d4df1fd484f41f9b`
- `jsons/model_config.json`: `e35d7414784796d758266ea5db73d80c12f248ca4d2b207d6d52bf8c26e40f2c`

Credit: protocol comparison against Baofeng's OLA Radio bundled configuration and the CHIRP project. [OLA official listing](https://play.google.com/store/apps/details?id=com.aewt.app.friends).

## Physical results received — November 1, 2026

These are real-radio results from K4RJM, separate from the simulated regression tests:

- **GM-30 Pro:** the saved v20.34 report records one attempted `PROGRAMCOLORPROU` command, expecting one response byte, followed by `Timeout: expected 1 response bytes, received 0`. No response bytes were pending. The handshake did not reach F, M, or SEND. The report records zero memory reads/writes. Wireless CPS was enabled and other programming apps were disconnected, as confirmed in the project chat.
- **UV-32:** the reported error is `Handshake stopped: Finding radio service: Bluetooth link ended; the current operation stopped.` The app lost the Bluetooth link while locating FFE0, before obtaining its data characteristic or sending the opening command. This is a reported connection failure, not a successful identity exchange or a full notification capture.

The two failures occur at different stages. Neither has an established root cause. They are not evidence of a model-name block, and a successful simulated handshake does not show that the physical radios work.

## v20.35 transport diagnostics

**Bluetooth send** applies only to **Check radio ID**:

- **Automatic** keeps the existing choice: without-response when advertised, otherwise with-response.
- **With response** and **Without response** explicitly select the corresponding advertised GATT operation. An unsupported selection stops before sending. There is no automatic method fallback or command retry.

A Bluetooth write-with-response acknowledgement is not the radio's CPS acknowledgement. Identification still requires the existing `06` replies and the same four commands. This control does not select a memory-writing mode or change MINI-5 Read/Write behavior.

The report now records the selected characteristic and its properties, the characteristics visible within the connected FFE0 service, the selected send method, command/response timing, and a bounded notification trace (64 entries, up to 256 bytes each). It also records connection-stage messages and can be saved after a connection failure. Private radio channel data is not read by this tool. A report may contain model/identification bytes; review it before sharing publicly.

Characteristic enumeration never changes the FFE1 data path or subscribes to another characteristic. OLA's binary contains FFE2 and other UUID strings, but strings alone do not prove per-model roles or justify switching to them. No speculative baud-rate, preamble, reset or reboot command has been added.

API references: [service characteristic enumeration](https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTService/getCharacteristics), [write with response](https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/writeValueWithResponse).

## Next physical diagnostic checks

1. Open the main UAT application, not the isolated browser-test page. Confirm build 20.35-UAT. Enable Wireless CPS and keep other programming apps disconnected.
2. For GM-30 Pro, select its profile and **With response**, then run **Check radio ID** once. Save the handshake report whether it succeeds, times out, or says that method is unsupported. This tests an advertised send method with the same identification command; it is not a confirmed repair.
3. For UV-32, select its profile and **Automatic**, run **Check radio ID** once, then save the report. If the link ends during discovery again, the connection log should retain that stage even though no commands were sent.
4. Disconnect with the existing control after the check. Share the saved reports for comparison. Do not use MINI-5 channel-memory programming to test either new model.

No physical operation was performed by the development agent. Existing MINI-5 physical evidence remains valid and is recorded in Testing & Compatibility. Successful identification of GM-30 Pro and UV-32 remains unverified.

## Software validation

The v20.35 automated suite and packaging results are recorded in [the release record](RELEASE-20.35.md). Coverage includes the silent opening-command symptom, both explicit send methods, unsupported capabilities, exact command allowlisting, notification traces, cleanup, and unchanged connection binding. The browser suite adds downloadable service-discovery failure and silent-handshake checks, bringing it to 30 checks. These use simulated Bluetooth only.

The preceding v20.34 suite passed 212 automated tests. K4RJM supplied the complete passing browser output on November 1, 2026: all 29 browser checks passed on 20.34-UAT.d1c7ae9. See [the browser result](BROWSER-20.34.md). That result belongs to v20.34 and is not a v20.35 browser verification.
