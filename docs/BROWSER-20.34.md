# UAT v20.34 browser regression result

Recorded November 1, 2026 from the complete browser-test output supplied by K4RJM. The development agent did not independently rerun this browser session because browser control was unavailable. Browser/OS version was not supplied.

- Tested: **UAT · build 20.34-UAT.d1c7ae9**
- Application commit: `d1c7ae96b99dda5bdf8b7f89bd2f3f8b97594797`
- Result: **All 29 browser checks passed**
- Runner: https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/tests/browser/index.html
- Isolation: Bluetooth is replaced by a simulated peripheral before the application loads. Physical-radio access is disabled.

1. PASS: High contrast text follows theme, persists, and fits a phone
2. PASS: CHIRP and Studio imports, CHIRP download and failed-import retention
3. PASS: Native DAT import uses actual File / input events and never connects
4. PASS: DAT and both IMG formats append with preview, duplicate skipping, protected blocks and Undo
5. PASS: All ten channel-list layouts preview, append and undo through actual file controls
6. PASS: CSV row paging and UTF-16 Kenwood imports retain selection and reject broken input
7. PASS: Separate sidebar Import/Append controls replace CSV, TSV and HMK with consent and Undo
8. PASS: RDT Import and Append filter digital channels, preserve settings and Undo in both formats
9. PASS: Factory column order, compact rows, striping and responsive overflow
10. PASS: Every inline column keeps its geometry, compact height and focus
11. PASS: Checkbox clicks bubble without opening editor; cells edit inline and Edit opens the popup
12. PASS: Invalid frequencies block navigation; valid short entries are padded
13. PASS: Inline all controls, grouped tones, keyboard navigation, cancel, Undo and popup consistency
14. PASS: Inline upper boundaries, invalid restoration, channel 999 and Add/Insert
15. PASS: Bulk preview, occupied destination, range rejection and one-step Undo
16. PASS: Desktop single table scroll, pinned pagination and responsive height
17. PASS: Approved radio photo and all 23 interactive Help controls
18. PASS: Help layout, single active navigation, manuals and responsive restoration
19. PASS: Published guide is a local PDF and testing document retains evidence links
20. PASS: One-checkbox confirmation, modal focus isolation and Cancel
21. PASS: Real busy inertness, disabled controls and recovery
22. PASS: Actual HTML number constraints reject channel 1000
23. PASS: Simulated full write stays unverified until explicit reconnect/readback
24. PASS: Wrong simulated radio identity blocks every memory write
25. PASS: Missing simulated ACK unlocks editing and never retries the uncertain write
26. PASS: Bluetooth icon follows the simulated connection and returns to offline
27. PASS: UAT protocol selector identifies MINI-5, GM-30 Pro and UV-32 without memory access
28. PASS: Missing HTML control mutation is detected by actual app startup
29. PASS: Removed inertness mutation is caught by the same busy check

This verifies browser behavior and simulated protocol exchanges. It does not establish a successful physical GM-30 Pro or UV-32 handshake, memory download, upload, or readback. No additional model's programming compatibility is claimed.
