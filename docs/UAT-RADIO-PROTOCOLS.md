# UAT radio identification — v20.38

Updated November 8, 2026. **Active profiles: MINI-5 and UV-32.** GM-30 Pro remains removed. LIVE v20.33 is unchanged.

## Current physical result

K4RJM's **20.38-UAT.3082c50** report confirms a complete physical handshake: bridge verification, opening ACK, frequency-range response, seven-byte **UV32PRO** identity and final SEND ACK **06**. The working configuration is **With response** with SEND delivered as **20 + 5 bytes**. This establishes initialization on the tested radio, not channel-memory reading or repeat/reconnect reliability. [Full evidence](UV32-HANDSHAKE-2026-11-08.md).

## Physically verified v20.38 identification configuration

Choose **UV-32**, set **Bluetooth send** to **With response**, and run **Check radio ID** once. Save the handshake report after either success or failure.

The diagnostic retains the now physically confirmed FF31 setup, then sends the existing CPS commands. It delivers final SEND as 20 + 5 bytes, matching the phone-app transport. Each piece is awaited, recorded and bounded; a failure is not retried. The single final ACK remains required. The complete combination is physically verified. The earlier failing run also used a different send method, so the evidence does not isolate packet size as the only cause or establish a measured MTU.

A complete handshake displays **Handshake complete: UV32PRO**. It will not load channels: **UV-32 channel-memory reading and programming are not implemented**. The selector controls identification only. MINI-5 memory, programming, identity safeguards, reset and disconnect behavior are unchanged.

K4RJM performed the physical test. No physical radio operation was performed by the development agent. [v20.38 release checks and rollback](RELEASE-20.38.md). Browser regression checks use simulated peripherals and cannot connect to the physical radio.

## Historical investigation record

The evidence below is retained for traceability. Earlier GM-30 references are historical, and earlier UV-32 uncertainty is superseded only as described in the November 8 result above.

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

## New report review — November 1, 2026

- **UV-32, build 20.35-UAT.14530dc:** captured at `2026-11-01T14:24:50.456Z`. Connection and FFE0 service discovery succeeded this time, followed by FFE1 notification setup. The opening exchange records `00` after approximately 3.74 seconds, instead of required ACK `06`; identification stopped before F, M or SEND. This does not establish what `00` means or which component generated it.
- FFE1 advertises read, write, write-without-response and notify. Automatic chose write-without-response. FFE0 also exposes FF31 (write with response) and FFE2 (read only). Enumeration establishes properties, not characteristic purpose; no commands were sent to FF31 or FFE2.
- The report says zero notifications despite its recorded response. A deterministic callback-order test reproduces a trace-listener race: the receiver resolves the request, promise continuations finish the handshake and remove the trace listener, then the later listener never observes that last event. This is a demonstrated diagnostic defect and a plausible explanation for this report's inconsistency, not proof of all physical callback timing.
- **GM-30 Pro file (2):** SHA-256 is identical to the previously supplied report (1). It still says build 20.34-UAT.d1c7ae9 and `2026-11-01T07:23:24.113Z`. It supplies no new v20.35 send-method evidence.

Private file SHA-256 references (original JSON files are not republished):

- UV-32: `86726f3d8325e6fb9989462cffc6911fb7495270f099e9e3c1e560eb0565098c`
- Both GM-30 Pro copies: `e7fb2728be131bb8b242f9a366189577265e97e7529801abcd584a84dd5b2243`

### v20.36 diagnostic correction

The temporary trace listener now runs in the event's capture phase, before the existing receiver resolves the response. It is removed with the matching capture option on success or failure. The regression reproduces the missing terminal event before the correction and verifies both `00` failure and final `06` success afterwards. This changes tracing order only; it neither changes accepted acknowledgements nor modifies the receiver or send commands.

References: [DOM event dispatch/capture ordering](https://dom.spec.whatwg.org/#concept-event-dispatch), [HTML script cleanup and microtask checkpoint](https://html.spec.whatwg.org/multipage/webappapis.html#clean-up-after-running-script).

The [29-check v20.35 browser result](BROWSER-20.35.md) is retained as partial verification. It omits the new diagnostic test. v20.36 displays its own test-suite version and rejects an application version mismatch or an incomplete check count.

## v20.35 transport diagnostics

**Bluetooth send** applies only to **Check radio ID**:

- **Automatic** keeps the existing choice: without-response when advertised, otherwise with-response.
- **With response** and **Without response** explicitly select the corresponding advertised GATT operation. An unsupported selection stops before sending. There is no automatic method fallback or command retry.

A Bluetooth write-with-response acknowledgement is not the radio's CPS acknowledgement. Identification still requires the existing `06` replies and the same four commands. This control does not select a memory-writing mode or change MINI-5 Read/Write behavior.

The report now records the selected characteristic and its properties, the characteristics visible within the connected FFE0 service, the selected send method, command/response timing, and a bounded notification trace (64 entries, up to 256 bytes each). It also records connection-stage messages and can be saved after a connection failure. Private radio channel data is not read by this tool. A report may contain model/identification bytes; review it before sharing publicly.

Characteristic enumeration never changes the FFE1 data path or subscribes to another characteristic. OLA's binary contains FFE2 and other UUID strings, but strings alone do not prove per-model roles or justify switching to them. No speculative baud-rate, preamble, reset or reboot command has been added.

API references: [service characteristic enumeration](https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTService/getCharacteristics), [write with response](https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/writeValueWithResponse).


