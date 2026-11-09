# UV-32 partial physical reads — November 9, 2026

K4RJM performed two physical Bluetooth channel reads using **20.41-UAT.71a3eef**, UV-32 and With response. These are physical-radio results, separate from simulated regression tests. Neither attempt completed all 500 blocks. Both report zero memory writes.

## Capture provenance

| Local capture | SHA-256 | Validated blocks | Validated bytes | Attempted reads |
| --- | --- | ---: | ---: | ---: |
| ham-rx-uv32-channels-partial.json | d57e4477d0245db14af45eda86f4b796761dfdaa1c9317ca4fcbc7ec99292bae | 26 | 1664 | 27 |
| ham-rx-uv32-channels-partial (1).json | c6d696c7b4980a48da1e52f86a92401b19bc375de692f89bfa0151be3083814e | 17 | 1088 | 18 |

Private captures and the full channel list are not published. Both captures identify UV32PRO successfully with the final initialization ACK. The first channel read starts 1 ms and 0 ms after identification respectively. The new connection's guard checks match and its initial receive buffer is empty.

## What is physically established

The shared 1,088-byte validated prefix is identical. Both decode to 33 populated channel records, without invalid frequency BCD in those records. The first three RX/TX pairs and tones match the supplied factory CPS screenshot:

| Channel | RX MHz | TX MHz | RX tone | TX tone |
| --- | --- | --- | --- | --- |
| 1 | 444.22500 | 449.22500 | Off | 110.9 |
| 2 | 146.71500 | 146.11500 | Off | 110.9 |
| 3 | 443.82500 | 448.82500 | Off | 110.9 |

This supports the initial channel read framing and CO7 decoding. It does not verify every field, every bank, a complete capture, repeated-read reliability or programming.

## Failures

**First capture:** the request at 0x0680 was `52 06 80 40`. Its 68-byte response began `52 47 06 80` followed by 64 FF bytes. The expected header was `52 06 80 40`. Twelve additional FF bytes were buffered at failure; the later download snapshot contained 64 FF bytes followed by 00. The reader correctly rejected the mismatched header and retained only the 26 validated blocks.

**Second capture:** after 17 valid blocks, the request at 0x0440 was `52 04 40 40`. Waiting for 68 response bytes timed out with only 00 buffered. The old report's `lastResponseHex` still contained the preceding successful response from 0x0400. That is a diagnostics defect, not evidence that the radio returned the previous block again.

The failures occur at different addresses. Transport/framing instability is a possible explanation, not an established cause. The reports do not preserve notification boundaries or sufficient timing to establish which layer introduced the malformed response or what 00 means. The extra bytes are not accepted as an alternative format.

## v20.42 follow-up

- Keep the first read immediate; pause 20 ms before each subsequent block (499 pauses, about 10 seconds of added minimum time).
- Retain the last 12 requests and 80 notifications, timing, lengths, pending bytes and per-request validation/error status. Notification hex is capped at 256 bytes with explicit truncation metadata.
- Reset per-request response fields before sending so a timeout cannot be attributed to the preceding block.
- Keep exact header/address/length checks, bounded waits, one-use identification, cancellation and no retry.
- Leave the handshake, memory region, read commands, decoding and MINI-5 code unchanged.

The pause is an experimental UAT pacing adjustment. Its physical benefit remains unverified until another capture is supplied. Automated tests replay the malformed header and single-byte timeout condition; they do not substitute for a complete hardware read.

See [current read instructions](UV32-READ.md), [v20.42 release](RELEASE-20.42.md), and [earlier pre-read session evidence](UV32-SESSION-EVIDENCE-2026-11-09.md).
