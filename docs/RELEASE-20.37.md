# v20.37 — UAT UV-32 identification candidate

November 8, 2026. **UAT only. LIVE stays v20.33.**

## Changes

- Removed GM-30 Pro from the protocol selector, profile registry and deployment metadata. Active choices are MINI-5 and UV-32.
- Narrowed the previously unpublished Bluetooth setup candidate to UV-32. It sends one fresh FF31 request, validates the FFE1 reply, then runs the existing four identification commands. No automatic retry.
- Retargeted simulated connection, error and browser coverage to UV-32. The removed profile is explicitly rejected before any send.
- Preserved the historical GM-30 capture as an independently sourced calculation oracle, not a claim of physical UV-32 success.
- MINI-5 protocol, memory layout, encoder/decoder, programming and disconnect/reset behavior are unchanged. No physical radio was operated.

The bridge calculation matches the supplied Walkie-Talkie Tool capture and APK evidence. UV-32 applicability is a hardware-test candidate, supported by its characteristic enumeration and model baud configuration. Successful physical Ham-Rx UV-32 identification remains unverified.

## Verification

- The earlier unpublished three-profile candidate passed 231/231 local automated tests. That is not a test result for this revision.
- This revision will run the complete automated suite and packaging in the existing UAT workflow before deployment. Record the actual result below after completion.
- Browser suite updated to 31 checks. Browser execution is pending; no browser pass is claimed. The existing [compact-row issue](BROWSER-20.36.md) is unchanged.
- Local execution was unavailable on this machine because the previous project directory is missing and Windows denies recreating it despite the granted folder permissions. No test success is inferred from that failure.
- Original private captures/APKs remain private.

## Deployment and rollback

- Previous UAT branch head / rollback: `ac9f00a03ec0902679ba6b53bbe00e29838feb67`.
- Previous deployed UAT: `bf570af6411370eb398ea2ed6bd1ab625ca2eb43`, build `20.36-UAT.bf570af`.
- Earlier unpublished v20.37 candidate: `a2c89037db8ea71d1da575179c1b37776b31c917`; superseded by this focused revision.
- LIVE branch head: `7a9b363a0fb643e188bb4c3b3917bb9f6cc78cd8` (v20.33), unchanged.
- Roll back through a normal revert and the UAT test/deploy workflow; do not force-push or modify LIVE.

See [UV-32 test instructions](UAT-RADIO-PROTOCOLS.md), [capture/APK analysis](BLUETOOTH-CAPTURE-2026-11-01.md), and [factory field reference](UV32-FACTORY-FIELDS.md).
