# UAT v20.46 — retain UV-32 failure position

November 16, 2026. UAT only. LIVE and MINI-5 programming are unchanged.

When a UV-32 read stops, the visible error now includes the attempted block number, hexadecimal address, number of validated blocks, and error count. The previous build replaced the live counter with a bare timeout message, making it difficult to compare the failure with the radio leaving Wireless CPS mode. A failure during identification still has no block number because channel reading never began.

This is a display-only correction. It does not alter Bluetooth requests, response validation, waiting, pacing, diagnostic-sweep behavior, or any memory-write path. The saved diagnostic JSON retains the original error and received bytes.
