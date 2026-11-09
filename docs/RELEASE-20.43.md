# UAT v20.43 — explicit UV-32 read transport comparison

November 9, 2026. UAT only. LIVE remains v20.33.

## Why this test

Two physical v20.42 attempts stopped after 3 and 14 blocks, respectively. One received a self-consistent 48-byte response to a 64-byte request; the other received only 00. The validated data matches earlier captures, and failing addresses have also read successfully. The 20 ms pause has not demonstrated a reliability fix. [Physical evidence](UV32-READ-EVIDENCE-2026-11-09.md).

Independent implementation review confirms a concrete comparison:

- [CHIRP's UV-32 driver](https://github.com/kk7ds/chirp/blob/19b5359693d37204e21ad11ce4e5613614de3886/chirp/drivers/baofeng_uv17Pro.py) inherits 64-byte reads. This agrees with the current Ham-Rx read frames.
- [dz0ny's browser read loop](https://github.com/dz0ny/5r-mini-ble-tool/blob/ccf04f9e4335bfdd6914ae8374c959a420903d08/5r-mini-tool/js/app.mjs#L162) sends the same four-byte 64-byte read request without a with-response override. Its [BLE transport](https://github.com/dz0ny/5r-mini-ble-tool/blob/ccf04f9e4335bfdd6914ae8374c959a420903d08/5r-mini-tool/js/ble-transport.mjs#L93) prefers writeValueWithoutResponse when advertised.
- That project lists a UV32 PRO profile, but its README and reviewed source do not provide an independently verified complete UV-32 physical capture. Treat this as implementation evidence for a controlled comparison, not proof of UV-32 reliability.
- The supplied phone-app APKs are no longer accessible at their prior local paths. The retained phone report establishes 128-byte reads for GM-30 Pro, not UV-32. No new claim about OLA's actual UV-32 send method is made.

## Application change

A separate **Read requests** selector appears only with the UV-32 profile:

- **With response** remains the default and preserves the previous channel-request send method.
- **Without response (test)** sends only channel-read requests through writeValueWithoutResponse, provided the characteristic advertises that capability.

The combined action always uses the physically confirmed **With response** identification sequence, including FF31 setup and 20 + 5-byte SEND. The existing Bluetooth send selector still controls the separate identification diagnostic.

The new selection is frozen when the read begins and disabled while busy. Its value and actual method are retained in the capture and request trace. Missing capabilities, native failures and timeouts stop the operation; no automatic method fallback or retry exists.

“Without response” refers only to the Bluetooth write acknowledgement. Every read still requires the exact 68-byte CPS reply, matching opcode, address and 64-byte length, with no excess data.

## Preserved boundaries

The fixed channel region, 500 requests, 64-byte block size, 20 ms pacing, immediate first read, payload decoder, bounded waits, receiver cleanup and cancellation remain unchanged. No alternate-length reply is accepted or padded. No new exit/reset command, memory write or UV-32 editor is added. MINI-5 protocol, mapping, encoding and programming behavior are unchanged. LIVE is not modified.

Only one transport variable differs in the requested physical comparison. This candidate is not a confirmed correction to the underlying radio communication failure.

## Verification

Five new automated regressions cover:

1. A complete simulated capture using without-response channel requests and the unchanged with-response handshake, with exact request bytes and one-use identity.
2. Invalid or unsupported method selections, including no automatic selection/fallback.
3. Native send failure/stall, bounded cleanup and no late resumption.
4. Malformed, short, silent and excess replies, including a 48-byte reply followed by 00.
5. Cancellation/disconnect and preservation of validated partial data.

The default-mode regression also checks that no without-response calls occur. Two existing browser scenarios cover the new control, busy locking, default and alternate transport, saved metadata, mobile containment and MINI-5 restoration. The suite remains 33 browser checks.

CI and UAT deployment results will be recorded after execution. Real-browser execution and physical UV-32 results remain pending. Local runtime/browser launch is unavailable; simulated tests cannot establish hardware success.

## One physical test

1. Refresh UAT and confirm **20.43-UAT**.
2. Select **UV-32**; leave **Bluetooth send** at **With response**.
3. Set the new **Read requests** selector to **Without response (test)**.
4. Enable Wireless CPS, disconnect other programming apps, and click **Read UV-32 channels** directly.
5. Save the capture whether it completes or stops. A separate Check radio ID is unnecessary.

Do not perform a radio write. A successful full read would justify repeat and content-comparison tests; it would not by itself establish programming compatibility.

## Release and rollback

- Prior UAT main: `0fe50b007c1bad35cebc7c84f02742220c82ddd9`.
- Prior deployed app: **20.42-UAT.e328362**, `e3283624bc898a1c806baca02cb5138f03cf0dfc`.
- LIVE main: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- LIVE deployed app: **v20.33**, `988db9d5163f93547c97cd449cfa4e03560f9b70`.

Revert only this UAT development commit through the existing tested deployment workflow if rollback is needed; do not force-push or merge UAT tooling into LIVE.

Credit: K4RJM's physical tests; CHIRP contributors for UV-32 framing; dz0ny's browser implementation for the transport comparison. No source implementation, APK or private radio capture is bundled from the comparison project.
