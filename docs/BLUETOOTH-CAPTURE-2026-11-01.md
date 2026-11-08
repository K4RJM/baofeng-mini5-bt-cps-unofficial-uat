# GM-30 Pro and UV-32 phone-report analysis

**November 8 update:** K4RJM subsequently confirmed the same bridge verification on the physical UV-32, followed by its model response and a native failure sending final SEND. See [the UV-32 report and v20.38 transport correction](UV32-HANDSHAKE-2026-11-08.md). The November 1 evidence below remains historical.

November 1, 2026. Evidence review and **v20.37 UAT identification candidate**. LIVE remains **v20.33**. MINI-5 transport, memory handling and programming behavior are unchanged. No physical radio was operated by the development agent.

## Result

The GM-30 Pro report contains a successful **Walkie-Talkie Tool** read with an additional Bluetooth verification exchange before `PROGRAMCOLORPROU`. The v20.36 Ham-Rx diagnostic omits that preceding exchange. The v20.37 candidate adds the documented FF31 setup before the existing identification sequence for UV-32. GM-30 Pro was removed from active development and the selector on November 8, 2026; its capture remains supporting evidence. The calculation matches the physical GM-30 Pro reply exactly; a successful Ham-Rx connection still requires physical verification.

The UV-32 report does not contain the equivalent application command trace or Bluetooth ACL data. It does not establish whether the UV-32 requires the same setup.

## Correct application attribution

The successful GM-30 Pro trace is emitted by PID 14162 / UID 10288. Android's process-start entry at `dumpstate.txt` line 224647 identifies that process as `com.uniapp.kdh.uniplugin_kdh`, **Walkie-Talkie Tool**. The package's name is confirmed by its [publisher's Google Play listing](https://play.google.com/store/apps/details?id=com.uniapp.kdh.uniplugin_kdh).

OLA (`com.aewt.app.friends`) also appears in the reports, under a different process/UID. Its presence does not make these command logs OLA evidence. Preliminary chat updates attributing this successful exchange to OLA were corrected after checking process identity. The earlier OLA APK/static configuration evidence remains separate.

## GM-30 Pro sequence

Times are the report's displayed log times. Line numbers refer to the original private `dumpstate.txt`. These are application logs, not a complete over-the-air or ATT packet capture.

| Time | Original line(s) | Observation |
| --- | --- | --- |
| 13:15:01.000 | 294334 | Android reports the Bluetooth connection established. |
| 13:15:01.713 | 294711–294714 | App finds FFE1 and enables notifications. |
| 13:15:20.895 | 296460–296462 | App calls `setNotifyFF32`; its helper reports FF32 is null. This is not proof that FF32 is required. |
| 13:15:21.900 | 296565 | App generates a `serialNum`. The initial transmitted payload is not exposed by this log entry. |
| 13:15:21.948 | 296582 | App receives a 20-byte notification beginning `21 21 21 21 21`. |
| 13:15:21.949 | 296594–296600 | App verifies the response through `RadioDataCheck.generateSecretCheck(serialNum, hexValue)`. Its later `onCharacteristicWrite` callback logs the initial 20-byte request beginning `3F 3F 3F 3F`. APK inspection establishes that this is the completion log for the initial request, not a second request after verification. |
| 13:15:21.969–.972 | 296603–296615 | App returns to FFE1 notifications and writes its 2902 notification descriptor. |
| 13:15:22.972–.976 | 296655–296663 | App sends `PROGRAMCOLORPROU`. |
| 13:15:23.147 | 296680 | App receives `06`. |
| 13:15:23.149–.236 | 296697–296712 | `46` (F) receives 16 bytes. |
| 13:15:23.237–.326 | 296729–296742 | `4D` (M) receives seven bytes: `GM-30P `, including the trailing space. |
| 13:15:23.327–.445 | 296759–296778 | App generates a 25-byte SEND request, logs two outgoing portions of 20 and 5 bytes, then receives `06`. |
| 13:15:23.447 | 296796 | App starts memory reading with `52 00 00 80`. This is an observation of the phone app; it has not been added to the Ham-Rx diagnostic. |
| 13:15:48.026–.027 | 339223–339239 | App reaches 255/255 blocks, reports completion and sets `isSuccess = 1`. This records the phone application's successful read, not independent validation of every returned setting. |

The observed SEND payload is `53454e44240611040300070d0d1308070c0f07100700030100`. It differs from the fixed SEND value used by the UAT identification test. This does not establish that the existing fixed value is invalid: the cable/factory evidence already describes variable SEND data. The derivation and accepted alternatives still need verification.

## What the reports do and do not supply

Both reports say full Bluetooth snoop logging was enabled. Neither supplied ZIP contains a standalone full Bluetooth snoop file. Their embedded `BTSNOOP_LOG_SUMMARY` sections were decoded with the [AOSP btsnooz extractor](https://android.googlesource.com/platform/packages/modules/Bluetooth/+/refs/heads/main/system/tools/scripts/btsnooz.py), following [Android's Bluetooth debugging documentation](https://source.android.com/docs/core/connect/bluetooth/verifying_debugging).

| Report | Decoded records | HCI commands | HCI events | ACL packets |
| --- | ---: | ---: | ---: | ---: |
| GM-30 Pro | 6,990 | 507 | 6,483 | 0 |
| UV-32 | 4,516 | 1,026 | 3,490 | 0 |

The decoded summaries contain no ACL/ATT data packets, so they cannot establish the characteristic handles or ATT write types for the extra exchange. Enabling full logging and receiving a full packet capture in the exported bug report are separate facts. The UV-32 report has no `FlutterRadio`, `KDH_Radio` or `InterphoneUtil` command logs of the kind found in the GM-30 Pro report; this does not show that its attempted operation never occurred.

Enumeration alone could not identify the verification characteristic. Subsequent APK inspection establishes FF31 as the request characteristic and FFE1 as the notification path when FF32 is absent. The FF32-null message confirms that fallback path in the recorded session. The candidate does not add an untested FF32 subscription.

## APK confirmation and UAT implementation

Static DEX inspection of the supplied Walkie-Talkie Tool **1.4.7** confirms:

- `FlutterRadio$3.onServicesDiscovered` assigns FF31 to `mCheckCharacteristic` and FFE1 to `mReadAndWriteCharacteristic`. `InterphoneUtil.init` preserves those roles.
- `InterphoneUtil.generateSerialNum` creates 20 bytes: four `3F` bytes, a baud selector, then 15 freshly generated values from 0 through 98. Baud setting 7 maps to selector `02`; the recorded GM-30 Pro configuration has `baudrate:7` and its request uses `02`.
- That method writes the request to the check characteristic. FF31 advertises write with response in the supplied enumeration. The candidate explicitly uses that operation independently of the FFE1 send-method selector.
- `RadioDataCheck.generateSecretCheck` accepts two calculated reply variants. Both begin with five `21` bytes. The captured GM-30 Pro reply matches variant 1 exactly.
- For request bytes `q` and reply indices `i = 5..19`, variant 1 is `sum(q[0..i]) % (q[24-i] + i - 4)`. Variant 2 is `sum(q[19-i..24-i]) % (q[24-i] + 25 - i)`. These are independently implemented protocol facts; vendor code and binaries are not bundled.
- `BluetoothBleUtil$3.onCharacteristicWrite` prints the request bytes on callback. This explains the delayed outgoing-payload log. There is no extra post-reply verification command.

Inspection used the [AOSP DEX format](https://source.android.com/docs/core/runtime/dex-format) and [instruction reference](https://source.android.com/docs/core/runtime/dalvik-bytecode).

The newly supplied **OLA 2.5.9** package remains a separate reference. Its bundled configuration places UV32 PRO and UV19-BT GMRS in model type 4, both at 115200 baud. Protocol12/protocol15 retain the existing MAGIC, F, M and fixed SEND sequence. This supports baud selection and CPS framing; it does not independently establish OLA's runtime FF31 algorithm. OLA's ARM64 Flutter runtime was not fully reverse engineered.

The UAT candidate sends one fresh FF31 request for the UV-32 profile, validates the entire reply, and waits the captured app's 20 ms + 1000 ms interval before the existing four CPS commands. Unavailable/nonwritable FF31, bad or unexpected responses, timeout and connection changes stop the operation. No automatic retry is added. The diagnostic report separates bridge setup from CPS exchanges. MINI-5 identification never sends the added request.

UV-32 applicability remains a **candidate**, based on the matching FF31/FFE1 capabilities, model baud configuration and shared protocol family. A physical UV-32 verification exchange is still missing. The diagnostic continues reporting other printable model names; it is not a full additional-model memory driver.

The fixed SEND value is unchanged. The successful phone session's different SEND value is documented, not replayed. No memory-read/write, reset, disconnect or firmware command was added.

## Next physical checks

1. Confirm **20.37-UAT** in the main application's badge. The browser-test page uses a simulated radio and cannot connect to a real radio.
2. With Wireless CPS on and other radio apps disconnected, select **UV-32**, leave Bluetooth send at **Automatic**, and press **Check radio ID** once. Save the report whether it succeeds or stops.
3. The report distinguishes FF31 setup from the later CPS opening command. No further GM-30 Pro testing is requested.
4. Use the normal Disconnect control afterward. Do not use MINI-5 memory Read/Write controls with the UV-32. This candidate performs identification only.

Successful Ham-Rx identification and full model-specific memory drivers remain pending.

The existing manual send-method tests remain transport diagnostics; switching between with-response and without-response is not established as a substitute for the missing setup exchange.

## Verification and privacy

Offline checks verified the extracted snoop structure, exchange order, reply lengths and read completion. The earlier three-profile v20.37 candidate passed **231/231 local tests**, including eleven new bridge tests and the physical-capture oracle. The November 8 UV-32-only revision has its own CI result recorded in [RELEASE-20.37.md](RELEASE-20.37.md). These are offline/simulated checks, not a successful physical Ham-Rx test. The separately reported compact-row browser issue remains recorded in [BROWSER-20.36.md](BROWSER-20.36.md).

Full bug reports, radio channel contents, device addresses and private APK files are not published. Private archive SHA-256 identifiers:

- GM-30 Pro: `d0eba44647733e4304e34663ef9d379e7903c0bab0856f816d71ab4b4e5d5116`
- UV-32: `9c2be23631fedb0c01a435a93ae65ec22e6d57f0715a0f41f5347ecd5434d1a8`

Related: [UAT protocol investigation](UAT-RADIO-PROTOCOLS.md), [UV-32 factory interface reference](UV32-FACTORY-FIELDS.md). The screenshot reference does not establish radio-memory offsets or make the MINI-5 writer compatible with the UV-32.

APK SHA-256 references:

- Walkie-Talkie Tool 1.4.7 XAPK: `0b1e6d4e06eba3a7e445b5afa648a89e0623d8e0c1f1b1fb49fecf79f5cbdd3a`
- Walkie-Talkie Tool base APK: `5ec56b149e653f28019373a0898373521f991418eee21f3201285c34e62733cf`
- Its inspected DEX: `eade80bdf296a689bb9f1035195d9d9b05ca226d08aa182a7d9b99ed4035f04f`
- OLA 2.5.9 XAPK: `21ca8c2b4d8e35fee6c3da800939aaac58ee6334751ab30f30544d431ec6f307`
- OLA base APK: `ba2234c01391a5c03b9ba3610bbf6e727644b9ff9e441447d268902c293bc1fa`

Credit: K4RJM's physical captures/screenshots; Kediheng's Walkie-Talkie Tool for observed bridge behavior; Baofeng OLA's model/protocol facts; CHIRP's cable handshake; AOSP's capture and bytecode references. APKs were inspected offline, never executed. No private app-service API was called.
