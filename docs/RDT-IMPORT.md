# AnyTone RDT channel import — v20.33

Use **Import file** or **Append channels** in the left toolbar to select an RDT directly. Import replaces the channel list after confirmation; Append adds selected channels to an empty destination. Both show an analog-only preview, preserve the current MINI-5 settings, and support Undo. A file import never starts radio programming.

## Supported files

| Model stored in file | Format marker | Import / append |
| --- | --- | --- |
| AnyTone D168UV | V1292 | Supported with the limits below |
| AnyTone D890UV | V1323 | Supported with the limits below |

RDT is model/version specific. These markers are file-format identifiers, not claimed CPS release numbers. Other model/format pairs are refused. Maximum file size is 32 MB. RDT export is not provided; save the converted MINI-5 workspace as DAT or CHIRP UV-5R Mini IMG.

## What transfers

- Analog memory-channel name, RX/TX frequency, supported RX/TX CTCSS or normal DCS, bandwidth, and receive-only setting.
- High/Low power when directly representable. Turbo/Mid use the visible High/Low fallback, initially Low; no equivalent wattage is claimed.
- Names longer than 12 encoded bytes are shortened with a preview note. Non-ASCII RDT names are excluded until their encoding is verified.

Digital and mixed digital/analog channel records are filtered out and counted. Source VFO A/B records, zones, named scan lists, contacts and radio-wide settings are not imported. Missing scan inclusion defaults to Include, matching the CSV converter. Existing MINI-5 settings remain in place.

Unverified analog option combinations, custom/inverted tone encodings, unsupported tones, out-of-band frequencies and off-grid values remain excluded with a reason. No value is guessed or rounded. Eight records in the supplied D890UV sample have extended/squelch options outside the verified profile and therefore remain excluded. This is an importer coverage limit, not a claim that those source channels are defective.

## Digital filtering across file imports

CSV, TSV and HMK adapters remove explicitly digital channels before the selectable preview. The summary reports the number filtered. Digital filtering alone does not require the partial-import checkbox. Other invalid/unsupported analog rows still require acknowledgement before importing the valid selection. An all-digital file cannot clear or replace the workspace.

A RepeaterBook entry explicitly offering FM as well as a digital mode can contribute its FM settings only; digital-only entries are filtered. Supported native MINI-5 DAT/IMG formats carry analog channel records; unrelated radio-image models remain refused. The application does not infer channel mode from a channel name.

## Structural validation

The two supported layouts share a 48-byte channel header and null-terminated name. Their trailers differ: 35 bytes for D168UV V1292, 50 for D890UV V1323. The importer validates the complete table within the first 8 KiB, its 16-bit count, strictly increasing unique source IDs, bounded record sizes, and terminal VFO IDs 4000/4001. It requires exactly one complete matching table. It never selects a best-looking partial table, uses known channel names, or hard-codes either supplied file's channel offset. Parsing work is bounded. Files outside this verified structural envelope are refused.

The file header and declared length are checked. Non-channel sections are not decoded, copied, repaired, or written. This is channel-file conversion, not radio-memory decoding or an AnyTone programmer.

Unknown analog flag combinations must match the inactive profiles established by the samples. Radio-specific digital metadata is discarded. Only supported scalar fields pass through the existing MINI-5 channel validation and native-file path. No Bluetooth, memory mapping, programming, disconnect or reset changes are included.

## Evidence — October 24, 2026

Original files and full channel data stay private. Only synthetic test fixtures are published.

| Supplied sample | Records | Analog imported | Digital filtered | VFO omitted | Analog excluded |
| --- | ---: | ---: | ---: | ---: | ---: |
| D168UV backup260901.rdt | 1,429 | 661 | 737 | 2 | 29 outside supported frequencies |
| D890UV new.rdt | 958 | 661 | 287 | 2 | 8 unverified options |

Both preserve 17 receive-only channels. Every one of the 661 imported D168UV channels matches the independently parsed factory CSV for RX, TX, both tones, bandwidth, power conversion and name handling. All 661 accepted D890UV records have the same source binary values for those fields as the corresponding validated D168UV records and pass the same expected-value checks. The separately supplied D890UV CSV is a different revision and is not described as an exact match.

Four complete native DAT save/reopen checks passed across actual RDT import/append results, preserving optional settings, VFOs, DTMF and the reserved 1,000th file record. Input files and original workspaces were unchanged. Synthetic tests cover both layouts, shifted tables, renamed/sparse channels, ambiguity, truncation, invalid headers/counts/IDs, unsupported flags, offsets, tones, receive-only, digital filtering, all-digital files, cancellation, 999-channel limits, confirmation, Undo and write guards.

The complete automated suite passes 202 tests. All 28 deployed browser checks passed on both UAT and LIVE. Final deployment evidence is recorded below. No new physical-radio writes were performed. Earlier physical MINI-5 evidence remains credited in [Testing & Compatibility](testing-compatibility.html).

## Independent references and credit

- [emerson000/anytone-cli](https://github.com/emerson000/anytone-cli/tree/2e91ccbc094e2cd0e1b1b346af4e2bb41f25e8e4), particularly `pkg/codeplug/channel.go`: independent RDT field-layout comparison. Its D878UVII count/address/trailer assumptions do not fit these samples and were not reused as a parser.
- [xbenkozx/anytone-cps constants](https://github.com/xbenkozx/anytone-cps/blob/c3d0d90b3e1a7a333883421df4b1dbae5239b4b1/anytone-lib/src/constants.cpp): independent confirmation of standard AnyTone CTCSS choices, power/bandwidth labels and mode names; not treated as an RDT specification.
- [AnyTone CSV export-format reference](https://github.com/pskillen/codeplug-studio/blob/main/docs/reference/export-formats/anytone/channels.md): file-interchange context; device memory layouts are distinct from RDT serialization.
- K4RJM supplied the RDT files and factory channel exports used for direct comparison.

## Release and rollback

K4RJM authorized LIVE publication after UAT checks on October 24, 2026. This promotion includes the related v20.29–20.32 image/channel-list foundation and v20.33 RDT/filtering work; it excludes UAT workflow/stamping configuration and unrelated historical documentation changes.

Pre-release UAT head: `ebd780fdded13371f5c990c9cae8a72b92e2e643` (v20.32 app `9e778f8f11dadd0a29ce69f7ac2bb1ad8aea88b1`). Pre-release LIVE head: `f425c0ca92db4b4131a02795b70f3c778f2e4b0e` (v20.28 app `4f5e789e29333f659665ea94ba1a5900b914220c`). Restore the appropriate environment's source through a new revert commit and the normal tested deployment workflow; do not force-push or exchange environment workflows.

## Verified publication

Both deployments succeeded on October 24, 2026. The release tag [v20.33](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/releases/tag/v20.33) points to the verified LIVE application commit.

| Environment | Application commit | Pages workflow | Deployed browser result |
| --- | --- | --- | --- |
| UAT | `63327af90cd8651792902658e85359285fb67e80` | [40131234207](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/40131234207) | 28/28 passed |
| LIVE | `988db9d5163f93547c97cd449cfa4e03560f9b70` | [40131446330](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial/actions/runs/40131446330) | 28/28 passed |

The exact UAT and composed LIVE source candidates each passed all 202 automated tests and public-artifact packaging. Their GitHub Actions test/package/deploy jobs also passed. The browser suites covered every import format, replacement confirmation, appending, digital filtering, all-digital refusal, Undo, editing geometry, keyboard behavior, responsive layouts, manuals and simulated write safeguards. A separate LIVE file-picker check imported a synthetic RDT, displayed one analog row with one digital channel filtered and both VFO records omitted, applied it and restored the empty workspace with Undo.

Seventeen protected production modules and the radio-action handler section are unchanged from LIVE v20.28. LIVE retains its own workflow; UAT retains its separate version stamping. Personal codeplugs were not published. Documentation-only evidence commits after these application commits do not alter the verified deployment.
