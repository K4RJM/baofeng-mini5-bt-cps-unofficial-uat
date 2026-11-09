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

## v20.42 physical follow-up — 13:37 UTC

K4RJM's newer `ham-rx-uv32-channels-partial (2).json` identifies **20.42-UAT.e328362**, captured at `2026-11-09T13:37:36.087Z`. SHA-256: `aeca0391bf5c46973cca7068968196bbaf5af7f7c38ff5ac4a4c46d998443939`. The separately attached file numbered (1) is unchanged from the earlier v20.41 capture listed above; the newer report was found beside it and examined separately.

The full handshake succeeded. Three complete blocks (192 bytes / six channel records) were validated; the fourth request stopped. The validated prefix is identical to the earlier physical capture. Zero memory writes were attempted.

| Observation | Trace evidence |
| --- | --- |
| Fourth request, address 0x00C0 | `52 00 c0 40` at 980 ms: requests 64 payload bytes |
| First response notification | `52 00 c0 30` at 1,139 ms: declares 48 payload bytes |
| Response delivery | Notifications of 20, 20 and 12 bytes by 1,140 ms: 4-byte header + exactly 48 payload bytes |
| Payload comparison | All 48 payload bytes match the corresponding prefix of the earlier validated block at 0x00C0 |
| Later notification | Single `00` at 4,144 ms, 3,004 ms after the short response |
| Final result | Timeout waiting for 68 bytes, with 53 buffered (52-byte short response + later 00) |

The 20 ms inter-block pause is present: observed gaps from a validated response to the next request are 21, 22 and 21 ms. It did **not** prevent failure in this attempt. One attempt does not establish whether pacing helps or worsens reliability overall.

The saved trace shows a self-consistent shorter response already arriving at the application's receiver. This is not explained solely by lost final notification bytes or channel-table decoding: the response header itself declares 0x30 and the payload length agrees. The record establishes what the app passed to the Bluetooth write call and what notifications it received; it does **not** establish what the bridge put onto its serial link or what the radio actually received. The layer responsible for the length discrepancy remains unproven. The later 00 is consistent with a timeout/idle response, but its exact meaning remains unconfirmed.

The stale-response diagnostics correction worked: `lastResponseHex` and `lastResponseAddress` are null for the incomplete fourth reply, while the notification trace preserves the bytes. Strict validation continues to exclude the short block from `wireHex`. It must not be treated as a complete 64-byte block or silently padded.

Next investigation should compare the UV-32 read transport with an independently successful UV-32 phone-app session. The earlier GM-30 phone log used 128-byte reads; it does not prove the UV-32 uses that block size. No change to block length, header acceptance, retry behavior or programming is justified by this report alone. This evidence update changes documentation only; UAT remains 20.42 and LIVE remains 20.33.

## Second v20.42 physical attempt — 13:43 UTC

The newer local file `ham-rx-uv32-channels-partial (3).json` records **20.42-UAT.e328362** at `2026-11-09T13:43:15.035Z`. SHA-256: `b28d1d2494f22db214a4f5f53ca0a818d222f0c4c2ca330d6438b183ccabc7cd`. The attached file numbered (1) still hashes identically to the earlier v20.41 report; this newer file was discovered alongside it.

- Initialization succeeded with UV32PRO and With response. The first read began 1 ms later, with an empty receive buffer and all session guards satisfied.
- Fourteen blocks / 896 bytes / 28 complete channel records were validated. Every payload byte matches the earlier v20.41 capture.
- Address 0x00C0, which previously returned only 48 bytes, returned the full expected 64-byte payload this time with header `52 00 c0 40`.
- Request 15 at 0x0380 was `52 03 80 40`, sent at 2,180 ms; the native send resolved at 2,278 ms.
- No channel response followed. The only subsequent notification was `00` at 5,279 ms, 3,001 ms after send completion. The app timed out waiting for 68 bytes.
- The trace retained all 57 notifications, the last 12 requests, and correctly left the failed request's response fields null. Twenty-millisecond inter-block pacing remained active. The connection still reported connected at download. Zero memory writes were attempted.

The failed address 0x0380 was readable in the earlier v20.41 capture. Together with the successful 0x00C0 response in this run, this shows the failures are not confined to one address or a fixed short-block boundary. It does not establish a particular Bluetooth/serial/firmware cause or prove that every untested address is valid.

The two v20.42 attempts completed 3 and 14 blocks, respectively. Neither completed all 500. There is no demonstrated reliability fix from the 20 ms pause. The approximately three-second delayed 00 recurs, but its protocol meaning remains unconfirmed. Preserve strict framing and the original captures for comparison with an independently successful UV-32 phone-app read. No application change, retry or protocol adjustment accompanies this evidence-only update.

## v20.43 Without response comparison — 23:13 UTC

K4RJM supplied a new `ham-rx-uv32-channels-partial.json` captured at `2026-11-09T23:13:43.108Z`, identifying **20.43-UAT.abe10e1**. SHA-256: `9f7535e81935cef4bad6d096d22eda089b91dfa9b1fdde7673c62a08e581042a`. This filename now contains a different capture from the earlier v20.41 original; distinguish the reports by hash and timestamp.

| Stage | Observed result |
| --- | --- |
| Initialization | Completed; UV32PRO identity; With response used throughout |
| Final SEND | 20 + 5-byte portions; final CPS ACK 06 |
| Channel-read choice | Without response, confirmed by requestedReadSendMode, sendMethod and the per-request trace |
| First request | `52 00 00 40`, address 0x0000, at 0 ms after identification |
| Native send | Resolved at 3 ms; this is not proof of delivery to the radio's serial parser |
| Received notification | Single `00` at 3,183 ms; no channel header or payload |
| Result | Timeout waiting for 68 bytes; zero validated blocks, one attempted read, zero memory writes |
| Connection state | All initial guards passed with an empty receive buffer; still reported connected at download |

The 20 ms inter-block pause never ran because the first block did not complete. This is an explicitly selected without-response trial with the existing with-response initialization, not a test of an all-without-response handshake. The trace contains one request and one notification, with no dropped trace entries.

This attempt provides no evidence that changing the read send method improves reliability. It does not prove that write-without-response can never work on UV-32 or identify the origin/meaning of 00. Keep With response as the default; no automatic fallback or retry is justified.

The next evidence gap is a currently successful full read of this same UV-32 on the S25 Ultra, with the exact app identified. The retained successful phone command log is GM-30 Pro evidence; the earlier UV-32 bug report lacked the equivalent command/ACL trace. Confirming the UV-32 reference read distinguishes a Ham-Rx/host-specific failure from a problem also affecting the phone path and guides a useful capture comparison.

Documentation only. UAT remains v20.43, LIVE remains v20.33, and no physical operation was performed by the development agent.
