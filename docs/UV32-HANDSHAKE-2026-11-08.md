# UV-32 physical identification evidence — November 8, 2026

## Source and observed result

K4RJM supplied `ham-rx-uv32-handshake.json` from **20.37-UAT.2bad73a**, captured at `2026-11-08T19:06:37.696Z`. Private file SHA-256: `c622aa896195d831a99f48697bec3fae34241e1c717fb361fd490324a8835a66`. The original file is not republished.

This is a physical radio result, not a simulated test:

| Stage | Observed result |
| --- | --- |
| Bluetooth connection and FFE1 notifications | Established |
| FF31 bridge request / FFE1 verification | Valid variant-1 reply, completed at 31 ms |
| PROGRAMCOLORPROU | ACK `06`, completed at 1,425 ms |
| F query | 16-byte response, completed at 1,545 ms |
| M query | Seven bytes `55 56 33 32 50 52 4f`, ASCII `UV32PRO`, completed at 1,665 ms |
| Final SEND initialization | Attempted at 1,924 ms; native GATT failure by 1,931 ms; no CPS reply recorded |

The exact error is `GATT operation failed for unknown reason.` The selected FFE1 method was `writeValueWithoutResponse`. The report contains four notifications and zero memory reads/writes. It does **not** show a completed initialization or a channel-memory read.

The physical UV-32 result independently confirms that the FF31 setup calculation applies to this radio. The prior GM-30 capture remains historical supporting evidence, not an active development target.

## Independent UV-32 calculation oracle

- Request: `3f3f3f3f023525591e01540c0f1541381d1f0c11`
- Reply: `21212121210108190125330000080309203f183a`
- Verified algorithm: variant 1.

This pair is included in a regression test independently of the older GM-30 oracle.

## v20.38 targeted correction

v20.37 sends the 25-byte SEND command in one GATT operation. The [recorded phone-app transport](BLUETOOTH-CAPTURE-2026-11-01.md) sends SEND in **20-byte and 5-byte portions**. That transport difference is a plausible explanation for the native GATT failure; the report does not establish the negotiated MTU or prove that length is its only cause.

The UV-32 diagnostic now splits the same allowlisted SEND command into 20 + 5 bytes. It waits for each native send to resolve, retains connection checks and bounded deadlines, and requires the single final CPS ACK `06`. It does not retry either portion, change the SEND payload, add memory access, or alter MINI-5 transport.

The diagnostic records each portion's offset, length, bytes, send/completion time and any native error. A failure or connection change prevents later portions; an early unexpected response is rejected.

## Next physical verification

1. Confirm **20.38-UAT** in the main application.
2. Enable Wireless CPS and disconnect other programming apps. Select **UV-32**, leave Bluetooth send at **Automatic**, and run **Check radio ID** once.
3. Save the new handshake report after either success or failure. The expected improvement is a final `06` and **Handshake complete: UV32PRO**.
4. Disconnect normally afterward.

UV-32 channel-memory reading and programming are not implemented. Successful identification will not itself load channels. No physical operation was performed by the development agent. MINI-5 memory and programming safeguards are unchanged.
