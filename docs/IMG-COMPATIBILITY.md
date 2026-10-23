# MINI-5 image files — v20.29 UAT

Use **Open .dat / .img** for a native CPS DAT, a CHIRP **Baofeng UV-5R Mini** image, or a legacy Mini 5 Studio image. Use **Save CHIRP .img** to download the current workspace for CHIRP. Use **Save .dat copy** for stock Baofeng CPS. Append remains a native DAT operation.

The filename extension alone does not establish compatibility. Other radio models (including UV-5R and UV-5G Mini), generic binary files, CSV, truncated files, malformed metadata, and ambiguous legacy encodings are rejected without replacing the workspace. Importing or exporting never connects to a radio. Existing programming validation, identity checks, confirmation, and 999-channel safeguards still apply.

## The two image representations

Both use 33,344 memory bytes in the MINI-5 CPS regions: 0x0000–0x803F, 0x9000–0x903F, and 0xA000–0xA1BF. They are not firmware images or full-device backups.

- **Mini 5 Studio:** encoded bytes as captured from the radio, followed by the ten-byte `UV-5R Mini` model trailer. All five supplied October 11/12 images use this representation.
- **CHIRP:** decoded memory bytes. Current images carry the CHIRP metadata marker and base64 JSON identifying Baofeng / UV-5R Mini. The loader also accepts decoded legacy images with the exact model trailer. When metadata is absent, channel BCD and VFO digit structure must unambiguously identify the byte representation; otherwise import stops.

Exports use CHIRP's decoded memory representation and model metadata. They identify Ham-Rx as the exporter and do not invent a CHIRP version. They should not be opened by old Mini 5 Studio loaders that simply assume encoded bytes.

## What export preserves

An unchanged image import or radio read retains every captured memory byte, converted to CHIRP's storage representation. CHIRP metadata such as comments is not imported into Ham-Rx and is not retained in an export. Keep the original file.

After any workspace edit, export rebuilds the existing factory-compatible CPS layout using the established encoder and validation. This can replace unmapped bytes and has the same accepted VFO limitations as DAT-based programming. It is not a byte-preserving image editor. File export does not force the Wireless CPS setting on. There is no raw-image programming shortcut; the radio still receives the existing validated full CPS write plan.

The extra 1,000th record can be preserved in an unchanged image but cannot be edited or programmed. Unsupported channel frequencies remain subject to the existing editing and programming policy. This release does not broaden hardware support or resolve the accepted F01/F03 limitations.

## Evidence and verification

The five supplied images contain 42 occupied channels each and two distinct memory captures. Four before-write files have SHA-256 `3703a1fc44e24c5338c446d2385da76007098dac8537b5da9de487645091083d`; the read-only file has SHA-256 `8911c5b07120351586cfc2ec12427fc8b8b7f4dd2ac7aecab13add578bb7cd19`. Original files are retained privately and are not published in this repository.

Independent offline interoperability uses CHIRP source commit `0bfb2b50e33dcaab59c380238f34e053d95dfd50`: its actual model detector and UV5RMini loader open Ham-Rx exports, check frequencies, names, power, bandwidth and scan flags, then save them for reimport into Ham-Rx. This is software/file testing, not a new physical-radio test.

Primary implementation references:

- [CHIRP UV5RMini layout, decoded downloads and encoded uploads](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/drivers/baofeng_uv17Pro.py)
- [CHIRP CloneModeRadio metadata and file lifecycle](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/chirp_common.py)
- [CHIRP model identification](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/directory.py)
- [Mini 5 Studio encoded image representation](https://github.com/replicationbench/Mini5/blob/de65d2d2726d99f29861dd8dd61c8e35459048f9/js/codec.js) and [image save/load](https://github.com/replicationbench/Mini5/blob/de65d2d2726d99f29861dd8dd61c8e35459048f9/js/app.js).

Existing [audit dispositions](AUDIT-REMEDIATION.md), [factory-compatible reconstruction](F01-FACTORY-COMPATIBILITY.md) and [known limitations](KNOWN-LIMITATIONS.md) remain unchanged. The PDF guide is labeled v20.27; this document covers the new file controls.

## Deployment and rollback

UAT only. Baseline UAT `62d92f3cb583acd1c426d07bb81f19e971f6ccf5` (application v20.28). LIVE remains v20.28 at `4f5e789e29333f659665ea94ba1a5900b914220c`, with documentation head `f425c0ca92db4b4131a02795b70f3c778f2e4b0e`. Roll back the UAT file-interchange patch through a normal tested commit; do not force-push or copy UAT deployment configuration to LIVE.

## Verified UAT release — October 23, 2026

Application commit: `36eaea5a7cfe1025024cccd51ee2f3b2594a7ce7`. [Deployment 39906603120](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/39906603120) succeeded. All **163 automated tests** and **23 actual-browser checks** passed. The browser checks cover both image imports, a CHIRP download, invalid-import retention, original DAT workflows, high contrast, all editable channel fields, and existing safety protections.

The actual CHIRP loader passed six independent offline cases: all five supplied captures and an edited 43-channel image with channel 999 populated. Frequencies, names, power, bandwidth and scan inclusion matched. CHIRP saved each image, and Ham-Rx reimported every memory byte unchanged. All 16 protected modules and connection/read/write/reset handlers remain unchanged. No private capture content is published.

LIVE head was rechecked and remains `f425c0ca92db4b4131a02795b70f3c778f2e4b0e`. UAT is ready for review; LIVE promotion is not part of this deployment.
