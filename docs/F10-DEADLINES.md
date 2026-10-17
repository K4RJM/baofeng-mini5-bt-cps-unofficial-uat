# F10 — Bounded Bluetooth operations

October 17, 2026 · v20.21 · **Remediated — Tested with fault injection**

## Confirmed defect and scope

The original F10 audit probe held a native memory-send promise pending. The application awaited that promise before installing its response timer and could remain busy indefinitely. Connection selection, GATT connection, service/characteristic discovery and notification setup likewise had no local deadline. This is a reproduced software defect, independent of whether it explains the intermittent PC/radio Bluetooth-reset symptom.

The master task explicitly authorizes correction of these defects, mock/fault-injection verification and incremental UAT-to-LIVE release after safety checks. No physical radio write is part of this work.

## Correction

| Phase | Application deadline |
| --- | --- |
| Bluetooth device selector | 120 seconds |
| GATT connection | 20 seconds |
| Each service/characteristic discovery call | 15 seconds |
| Notification setup | 15 seconds |
| Each native send, with or without response | 10 seconds |
| Protocol response after send completes | Existing 4 seconds, unchanged |

These are application waiting budgets, not radio reboot delays or new protocol timing requirements. They do not insert a delay into successful operations. Full transfers use fixed finite block counts and bounded individual operations.

On timeout, cancellation or unexpected link loss, pending application waits reject, the session generation is invalidated, and the characteristic/receive state is released. A late result cannot resume the abandoned handshake, read or write. Old notification and disconnect callbacks also check their original generation. A late successful GATT connection is explicitly disconnected.

JavaScript cannot guarantee cancellation of the underlying OS Bluetooth call. The application retains a record of unresolved native calls and refuses an overlapping connection until they settle. Its message offers waiting or saving work and reloading. This is containment, not proof that a reload repairs the Bluetooth adapter. Late native rejection is observed rather than left as an unhandled rejection.

Ordinary already-settled setup NetworkError failures retain at most three attempts and the existing 600 ms gap. That gap is cancellable. An observed setup link loss or native deadline stops the current connection operation; it is not automatically retried while host state is uncertain. A later explicit connection can proceed once pending native work has settled.

## Preserved programming behavior

- Connect still sends no radio programming commands.
- Each normal read starts fresh identification/initialization and reads 521 blocks from the existing addresses. No new settings probe, session reuse or E command is added to this path.
- Writes retain the exact 262 frames, addresses, payloads, one-use permits, identity checks and ACK validation. Native-send completion and the valid radio ACK are both required before a block is counted as acknowledged.
- A failed or cancelled attempted write is incomplete/uncertain, remains locked in the application and is never automatically retransmitted. Even a buffered ACK does not override an unresolved native send.
- The existing all-262-ACK completion state, browser-only post-write cleanup, expected reboot and explicit readiness/readback flow remain unchanged. No new reset command or fixed reboot delay is introduced.
- No codec, DAT, channel limit, memory mapping or safety-confirmation change is included.

## Verification

Thirty targeted tests use controllable browser-shaped native promises and real application handlers, without hardware access. They cover selection and every setup phase, timeout/cancel/link-loss, late success/rejection, session quarantine, stale callbacks, retry cancellation, both send methods, identity/read/verify stalls, first/final block uncertainty, successful repeated reads and exact full-write frames, and editing-control recovery. The original audit F10 TODO becomes a passing regression.

The full suite contains 135 tests, with zero failures and zero expected TODOs after the release gates. Existing F02–F08 physical-capture/factory-derived regressions and full-write/reboot/readback simulations remain intact. Protected-core hash changes are limited to the reviewed reader and writer. Packaging includes this report. Actual deployment results and rollback references are recorded in [CODEX-PROGRESS.md](CODEX-PROGRESS.md).

## Shared Bluetooth lab evidence

The [shared lab conversation](https://chatgpt.com/share/6ad366f1-e954-83ea-a1c1-d9e91b6451d3) provides useful failure evidence. The v0.4 initial connection and identification succeeded, but both actual reads failed at block 1. That lab also added an early programming handshake, a settings probe and session reuse. Its recovery sometimes took multiple attempts and included a service-discovery deadline. Those logs do not isolate a cause or justify adopting the lab's implementation. A v0.2 manual reconnection success was reported after several attempts; reliable repeatability was not established. No physical v0.5 result was visible in the reviewed discussion.

This release retains the main application's normal command sequence and addresses the independently reproduced F10 pending-promise defect. It does not claim that deadlines cure Windows, adapter or radio firmware reconnection problems.

## Limits and further physical observation

- Timers run when the browser can execute JavaScript; a suspended tab or sleeping computer can delay them. The existing programming readiness warning remains applicable.
- No new physical operation was performed during this correction. Previously completed programming/reboot/readback and memory tests remain credited; no repeat channel-capacity or deliberate interrupted-write test is requested.
- Read-only repeated-read and power-cycle/reconnect observation on UAT can assess the new failure handling against real browser/OS behavior. This would test changed lifecycle handling, not repeat accepted memory-format findings. Never deliberately interrupt a physical write.
- Any automatic reconnect or adapter-recovery feature requires separate evidence and UAT work. The experimental designation remains while F13 and final release verification are outstanding.
