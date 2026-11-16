# UAT v20.45 — visible UV-32 read progress

November 16, 2026. UAT only. LIVE and MINI-5 programming are unchanged.

During a UV-32 channel read, the UAT toolbar and status line now show the current block out of 500, its hexadecimal address, the number of validated blocks, and the number of read errors. The status changes when a request starts, when a block validates, and as soon as a malformed or missing reply is detected. This makes it possible to compare the radio's Wireless CPS screen with the first error. An identification failure happens before the block counter starts.

The diagnostic sweep remains optional and read-only. Its request frames, validation, wait times, anomaly limit, and channel-data safeguards are unchanged. This change does not attempt to keep the radio in programming mode or infer why it leaves that mode.

The local automated suite passed 270/270 tests. Packaging and UAT stamping passed. A browser regression checks that the live status is visible during a simulated read; physical timing remains to be tested.
