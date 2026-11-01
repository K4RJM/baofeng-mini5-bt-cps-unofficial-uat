# v20.35 — UAT Bluetooth connection diagnostics

November 1, 2026. UAT only. LIVE remains v20.33.

## Changes

- Retain and download connection failures, including a Bluetooth link ending during radio-service discovery.
- Record characteristic UUIDs/properties within the existing FFE0 service, the active FFE1 data path, selected Bluetooth send method, exchange timings and bounded notification traces.
- Add Automatic / With response / Without response selection for Check radio ID only. Unsupported selections stop; no command retry or fallback is added.
- Keep the same four identification commands. No new memory-read/write, reset, baud-rate or reboot command is introduced. This is a diagnostic release, not a claimed fix for either physical failure.
- Record the actual GM-30 Pro opening-command timeout and the separately reported UV-32 service-discovery disconnect in [UAT-RADIO-PROTOCOLS.md](UAT-RADIO-PROTOCOLS.md).

## Validation

Automated suite: **218 tests passed**, zero failures, skips or TODOs. Six new automated cases cover the added diagnostics.

The isolated browser suite now contains 30 checks. Its new case checks failure-report downloads, stage visibility, send-method selection, busy controls and no fallback/retry. A v20.35 browser result is pending; the 29/29 result for v20.34 is preserved separately and is not reused. This environment currently cannot access the browser for execution, so the deployed suite must be run and its exact build/result recorded.

Existing MINI-5 reader, writer, memory map, encoder/decoder, connection recovery and write protections are unchanged. Source and packaged protected-core hashes must match the v20.34 baseline before publication. No physical radio was accessed by the development agent.

GM-30 Pro and UV-32 connection/identification remain unresolved pending new physical reports. Full channel/settings programming for these models is outside this release.

## Deployment and rollback

Target: [UAT](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/), using the repository's existing test-and-Pages workflow. The source commit is recorded in the deployed build badge and deployment.json; final workflow evidence will be added after publication.

UAT rollback source: `f511f7fed5860313bf76e56a03f6b976171cffd8`; previously deployed application: `d1c7ae96b99dda5bdf8b7f89bd2f3f8b97594797` (20.34-UAT.d1c7ae9). Restore the prior UAT tree through a normal commit and the same test/deploy workflow. Do not force-push.

LIVE main preserved: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`; deployed/tagged v20.33 application: `988db9d5163f93547c97cd449cfa4e03560f9b70`. No LIVE promotion is authorized for these UAT diagnostics.
