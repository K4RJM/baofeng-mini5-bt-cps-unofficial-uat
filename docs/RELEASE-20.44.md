# UAT v20.44 — UV-32 diagnostic read sweep

November 16, 2026. UAT only. LIVE and MINI-5 programming are unchanged. This is an experimental, read-only diagnostic for intermittent UV-32 replies.

The optional **Continue diagnostic sweep** control is off by default. The ordinary read still stops at the first malformed, short, excess, or missing reply. With the control on, a failed block is recorded with its address, request, observed bytes, and error. The reader waits for late bytes to settle, discards them from the next block, and moves to the next address. It never retries a failed address. A disconnected radio, failed Bluetooth send, cancellation, unsettled stream, or ten anomalies stop the sweep.

Only individually validated 64-byte blocks are retained as data. A sweep with gaps cannot produce a channel preview or complete codeplug. Save the JSON capture to inspect the valid blocks and anomalies. This may reach the end of the channel address range without constituting a successful full read. No UV-32 memory write, reset, or speculative decoder repair is added.

Physical evidence from user-provided captures includes 91, 187, and 341 validated blocks before failures at different addresses. The matching prefixes support valid reads up to those points; malformed replies and trailing bytes remain unexplained. The new sweep is for gathering evidence, not a claim that the radio or browser transport has been fixed.

The previously supplied OLA and Walkie-Talkie Tool APKs were inspected locally. Their general BLE code does not establish a UV-32-specific reply repair. Ordinary ADB logcat on the current phone shows GATT event status and lengths, not the payload bytes; accessible prior bugreports did not contain ACL payloads. A phone-app physical write is therefore not requested merely to repeat that capture route.

The local automated suite passed 270/270 tests. Packaging and UAT stamping passed. Physical verification of this diagnostic mode remains pending. Raw radio captures and APKs are not published.
