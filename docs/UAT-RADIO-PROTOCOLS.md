# UAT radio identification — v20.34

October 31, 2026. UAT only; LIVE v20.33 is unchanged.

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

The BLE service/characteristic remain `FFE0` / `FFE1`. Availability of those services and actual response timing on the two radios must be verified. An absent service is a transport mismatch, not a model-name restriction.

OLA includes 1,000 channels and ten zones for these families and a zone area beginning at `A200`; the MINI-5 application has 999 editable channels and a different write extent. That is why identification evidence does not justify applying MINI-5 programming frames to these radios.

### Reference hashes (SHA-256)

- `com.aewt.app.friends.apk`: `4596ba0f7845c7c7ecf743340b2fbad696fb82e7dc53909b7c71854a9de06c3a`
- `jsons/all_protocols.json`: `6d38d7d5bb4c1958f9220bdd97d2cac3a5f64a5ee77fe392d4df1fd484f41f9b`
- `jsons/model_config.json`: `e35d7414784796d758266ea5db73d80c12f248ca4d2b207d6d52bf8c26e40f2c`

Credit: protocol comparison against Baofeng's OLA Radio bundled configuration and the CHIRP project. [OLA official listing](https://play.google.com/store/apps/details?id=com.aewt.app.friends).

## Physical verification to perform

1. In UAT, choose the matching profile and enable the radio's wireless CPS mode. Close other programming apps.
2. Select Check radio ID. Record whether the returned name is `GM-30P` or `UV32PRO`, the identity length, and whether the final acknowledgement succeeds.
3. Save the handshake report. Disconnect using the existing control after the check.
4. If identification stops, save the connection log; do not automatically retry or start programming. The report/log will determine whether the response length, BLE transport, or model alias differs.

No GM-30 Pro or UV-32 physical test is claimed yet. Existing MINI-5 physical evidence remains valid and is recorded in Testing & Compatibility.

## Software validation

The full automated suite passed: 212 tests, zero failures/skips. New coverage checks all three selected profiles, fragmented 7/15-byte responses, optional identity suffix handling, mismatched model reporting, malformed/truncated responses, ACK failure, unchanged connection binding, busy controls and UAT-only packaging. Failure reports retain the partial exchange for diagnosis. No radio was contacted by these tests.

The isolated browser suite has a new check for the dropdown, all three handshakes, mismatch reporting, report download, controls during operations and phone-width layout. Its deployment result is recorded in RELEASE-20.34.md.
