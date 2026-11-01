# v20.36 — UAT trace accuracy and browser version checks

November 1, 2026. UAT only; LIVE stays v20.33.

## Evidence and correction

K4RJM's new UV-32 report reaches the opening handshake and records `00`, not required ACK `06`. Its zero-notification trace exposed a diagnostic ordering defect reproduced in a deterministic native-callback-order model. Capture-phase tracing now records the terminal event before request completion removes the trace listener. All handshake bytes, acknowledgement requirements, timeouts and memory protections remain unchanged.

The submitted GM-30 Pro JSON is identical to its earlier v20.34 report; a fresh report with the chosen send method is still needed. The supplied browser output passes 29 checks against a v20.35 application badge, but omits the added diagnostic check. The runner now shows its own version, rejects a mismatched application version, and requires all 30 checks to complete. See [the supplied browser result](BROWSER-20.35.md) and [physical evidence analysis](UAT-RADIO-PROTOCOLS.md).

## Validation

**220 automated tests passed**, zero failures, skips or TODOs. All 16 checked protected MINI-5 modules remain byte-identical to the v20.35 source and packaged artifact. The ordinary app.mjs change is its version string only; UAT tracing changes stay in the UAT overlay.

The terminal-notification regression failed before the tracing correction and passed afterwards. It verifies both an invalid opening `00` and a valid final `06`, exact command count, busy cleanup and trace-listener removal. A separate regression covers stale/missing browser build labels. The browser diagnostic case now also verifies consistent `00` exchange and notification records.

Browser execution of suite **20.36 / 30 checks** is pending. Earlier results are preserved under their actual revisions. No physical-radio operation was performed by the development agent. Neither GM-30 Pro nor UV-32 is claimed to identify successfully or support channel-memory programming.

## Deployment and rollback

Target: [UAT](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/). Application commit: `bf570af6411370eb398ea2ed6bd1ab625ca2eb43`, build **20.36-UAT.bf570af**. [Pages workflow 41316919672](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/41316919672) completed successfully, including all 220 automated tests and packaging. Interactive browser checks remain pending; direct site verification was unavailable to the development agent. This deployment record is documentation-only [skip ci] and does not redeploy the application.

Rollback source: `f7eaf83696ec100b8b4e8a610f9fee894f4a566b`; previously deployed application: `14530dc239eff3bce9eb05644eb5df5c3df7dd2d` (20.35-UAT.14530dc). Restore the prior UAT source through a normal commit and test/deploy workflow, without force-pushing.

LIVE main is preserved at `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`, with application/tag v20.33 at `988db9d5163f93547c97cd449cfa4e03560f9b70`. No LIVE publication is authorized for this diagnostic work.
