# UV-32 physical identification evidence — November 8, 2026

## Earlier v20.37 failure

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

## Confirmed successful physical handshake — v20.38

K4RJM supplied `ham-rx-uv32-handshake (1).json` and a matching screenshot from **20.38-UAT.3082c50**, captured at `2026-11-08T19:16:00.119Z`. Private file SHA-256: `5d1938791ccb6f982e36d7df096591172285a2ea5d10bcf57292d84f78538b4b`.

**Result: complete physical UV-32 identification and initialization.** The report records `completed: true`, model `UV32PRO`, and `matchesExpected: true`.

| Stage | Confirmed result |
| --- | --- |
| FF31 bridge verification | Variant 1; verified by 56 ms |
| Opening command | Radio ACK `06` by 1,408 ms |
| F query | 16-byte response by 1,648 ms |
| M query | Seven-byte `UV32PRO` identity by 1,829 ms |
| SEND first portion | 20 bytes; native send resolved at 2,187 ms |
| SEND second portion | 5 bytes; native send resolved at 2,307 ms |
| Final initialization | Radio ACK `06` at 2,308 ms |

The selected FFE1 send mode was **With response** (`writeValueWithResponse`). The two recorded portions concatenate exactly to the unchanged 25-byte SEND command. The screenshot also displays **Handshake complete: UV32PRO / 7-byte ID**.

This establishes the combination **FF31 setup + With response + 20/5-byte SEND delivery** on K4RJM's tested UV-32. The earlier failure used Automatic/without-response and a single 25-byte send, so the comparison does not isolate packet size from send method. A complete physical handshake using Automatic/without-response remains unverified. The 2.308-second duration excludes the preceding connection setup.

The report explicitly records **zero memory reads and zero memory writes**. The empty channel table is expected: this diagnostic does not yet implement a UV-32 channel-memory reader or writer.

### Diagnostic trace limitation

The exchange record contains the final `06`, but the separate notification list contains only four entries and omits that terminal acknowledgement. Do not label the notification list a complete packet trace. This is a remaining diagnostic-report discrepancy; the exchange acknowledgement and completed result establish the successful handshake. Its cause has not been established from this report.

### Working test configuration and next stage

Keep **UV-32 / With response** as the physically verified configuration. Development can now move to a UV-32-specific, read-only memory download using independently verified commands and layout. The MINI-5 memory decoder/writer must not be reused as a compatibility assumption. UV-32 memory reading, channel decoding, repeat/reconnect reliability and programming remain unverified or unimplemented as applicable.

No physical operation was performed by the development agent. K4RJM performed this test. This documentation update changes no application code, protocol, default send mode or LIVE deployment.
