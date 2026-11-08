# v20.38 — UAT UV-32 initialization transport

November 8, 2026. **UAT only. LIVE stays v20.33.**

## Physical evidence and change

K4RJM's v20.37 test established Bluetooth setup, an opening ACK and the seven-byte UV32PRO identity. It failed in the native GATT operation for the final 25-byte SEND command. It did not read memory. [Evidence and next test](UV32-HANDSHAKE-2026-11-08.md).

The UV-32 diagnostic now delivers the unchanged initialization command in 20-byte and 5-byte portions, matching the recorded phone-app transport. Each send is bounded and sequential; the final CPS ACK remains required. No replay or automatic retry. The report records per-portion progress/failure.

This is a transport candidate for the observed failure, not a claim that initialization is physically verified. The UI explicitly says UV-32 identification testing does not yet read or program channels. GM-30 Pro remains removed from active profiles.

MINI-5 core, memory mapping, codec, programming and disconnect/reset behavior are unchanged. No physical radio was operated during development.

## Verification

Eight targeted tests cover the new physical UV-32 calculation oracle, reproduction of a rejected 25-byte GATT operation, exact 20 + 5 delivery for all send modes, unchanged MINI-5 initialization, failure of either portion, bounded stalled calls and late completion, connection changes/early responses, and missing/negative final acknowledgements. The existing full suite is also required.

The complete CI suite passed: **239/239 tests**, zero failures/skips. Packaging and Pages deployment succeeded; details below. Browser suite remains 31 checks, updated to require UV-32 success through a simulated 20-byte peripheral and verify both recorded portions. Browser execution and physical final-initialization verification remain pending. The existing compact-row issue is retained.

## Rollback

- UAT rollback: `2bad73ae672efae5b83e9beb7fb33c79f8fa547d`, deployed build `20.37-UAT.2bad73a`.
- Prior UAT workflow: [42512827358](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/42512827358), successful; 231 automated tests passed.
- LIVE: v20.33, branch head `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- Use a normal source revert and UAT deployment workflow to roll back. No force push or LIVE change.

## Completed UAT verification

- Application commit: `3082c50c2e683e181861479db2c432b7807fb9dd`; build **20.38-UAT.3082c50**.
- [Workflow 42513910726](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/42513910726) completed successfully: **239/239 automated tests passed**, zero failures/skips, packaging succeeded, Pages deployment succeeded.
- All 16 protected MINI-5 source files have identical Git blob hashes to v20.37. LIVE branch head was rechecked and remains `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8`.
- An earlier CI attempt stopped deployment because a new cancellation test expected different error wording. The bounded transport correctly cancelled; the assertion now accepts its existing cancellation error and still requires that no second portion is sent. The complete rerun passed.
- Browser execution and physical final-initialization verification remain pending. Web-fetch tools could not retrieve the Pages URL for an independent content check; deployment success is confirmed through GitHub's workflow, not a claimed rendered-browser pass.
- Rollback remains `2bad73ae672efae5b83e9beb7fb33c79f8fa547d` / **20.37-UAT.2bad73a**.
