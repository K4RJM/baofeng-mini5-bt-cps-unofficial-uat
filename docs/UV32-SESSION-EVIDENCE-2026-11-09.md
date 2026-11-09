# UV-32 session evidence — November 9, 2026

K4RJM supplied three JSON reports and one browser partial-download file from **20.40-UAT.8ce144d**. All four local files parse as complete JSON; the .crdownload suffix alone does not make its recorded JSON unusable. No full private capture or screenshot is republished here.

## Observed facts

| Report | SHA-256 | Result |
| --- | --- | --- |
| ham-rx-uv32-handshake (2).json | `97260074c347fed9bd675884e73636193164b4e0638c3fa4088eea9d13376dae` | Bridge verification, opening ACK and 16-byte F reply succeeded. M expected 7 bytes; only 00 arrived. Final initialization was not sent. |
| ham-rx-uv32-read-diagnostics (2).json | `a792da54e3bed4d3f431d3fb513f6132c46a992953e0947ab945946665d790cb` | A later successful UV32PRO handshake was still bound to the same connection, device, characteristic and generation. The only failed pre-read guard was a buffered 00 byte. |
| ham-rx-uv32-read-diagnostics (1).json | `e892bc3a958cc0ba37a83eeec48cdd21d1b886fa733a98973cd7ea75c98dd092` | No available successful handshake; 00 buffered, Bluetooth connected. |
| ham-rx-uv32-read-diagnostics.json.crdownload | `7a1c7567ec703f88a8d124152ebabf0fece19853712d424417955d423ef64dce` | Same state as the preceding snapshot at an earlier timestamp; complete parseable JSON. |

The later read diagnostic records:
- Successful handshake: **2026-11-09T06:35:36.912Z**.
- Read attempted: **2026-11-09T06:35:44.595Z**, **7.683 seconds later**.
- Same device, same characteristic, same generation **5**, connected, idle, not connecting.
- Exactly one buffered byte: **00**.
- UI and reader used the same versioned protocol-module URL and agreed on the failed guard.
- The rejected attempt consumed its one-use capability; the later missing-session state is a consequence of rejection, not evidence that the successful handshake never occurred.

The separate failed handshake sent M at 2147 ms and recorded a 00 notification at 5447 ms: **3.300 seconds after M was sent**. It timed out at 6267 ms while waiting for seven bytes. The report does not prove why M failed or whether a request was lost.

Every supplied report records **zero memory reads and zero memory writes**.

## Interpretation and limits

An idle programming-session timeout is a plausible explanation for 00 arriving while the interface waited for a second click. The exact meaning of 00 and its arrival time after the successful handshake are not captured. Do not declare a firmware fault, a defined timeout duration, or a demonstrated Bluetooth read fix.

The earlier successful v20.38 hardware handshake remains valid evidence. These new failures do not erase it.

CHIRP's pinned [UV-32 parent download implementation](https://github.com/kk7ds/chirp/blob/19b5359693d37204e21ad11ce4e5613614de3886/chirp/drivers/baofeng_uv17Pro.py) calls identification and then enters its read loop without an intervening interaction. This supports removing Ham-Rx's manual gap; it does not prove the meaning of 00 on Bluetooth.

## UAT correction candidate

v20.41 makes Read UV-32 channels one action: retain the old state, reopen an existing browser connection through the existing disconnect/connect methods, identify with the already-tested handshake and begin the existing read loop immediately. No timeout byte is ignored on an active session, no new CPS reset/exit is sent, and no operation is retried automatically.

Failed identification produces a downloadable read diagnostic containing its handshake report. A physical channel read and decoded channel comparison remain pending. The separate M-query failure remains open.

See [release results](RELEASE-20.41.md) and [read implementation scope](UV32-READ.md).
