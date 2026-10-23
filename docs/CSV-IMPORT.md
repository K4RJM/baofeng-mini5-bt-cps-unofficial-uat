# Channel-list import — v20.32 UAT

Use the two file buttons in the left toolbar from any screen. Both accept DAT, IMG, CSV, TSV and HMK.

- **Import file:** DAT/IMG opens the complete configuration, replacing channels and radio settings after confirmation when work is already loaded. CSV/TSV/HMK opens a preview, replaces channels 1 onward with the selected records and clears the remaining editable slots. Existing radio settings and the reserved record stay intact. Confirm replacement when channels already exist; one Undo restores the previous channel list.
- **Append channels:** Review selected channels and choose an empty destination. Existing channels and settings stay intact. Duplicate skipping, numbered blocks and Undo are retained.

Read the radio first to retain its current configuration. Channel lists can also be imported or appended to a blank workspace, but do not grant radio-write permission. DAT/IMG append requires a loaded configuration. Neither button programs the radio automatically.

## Supported layouts

| Layout | Supported interpretation |
| --- | --- |
| RepeaterBook CSV | Explicit receive/transmit frequencies and separate tones; FM channels only |
| CHIRP CSV | Simplex, signed offset, split and disabled transmit; Tone, TSQL, DTCS and supported Cross modes |
| RT Systems CSV | Receive/transmit frequencies, tone modes, bandwidth and scan selection |
| Yaesu ADMS-7 | The supplied headerless 54-column layout; empty numbered rows are ignored |
| Icom ID-31 | Analog FM/NFM records; digital DV records are excluded |
| AnyTone | Analog channels, explicit frequencies, tones, bandwidth and High/Low power |
| OpenGD77 | Analog channels with explicit frequencies, separate tones and bandwidth |
| BTECH UV-PRO / GMRS-PRO | Whole-Hz frequencies, CTCSS values multiplied by 100, explicit DCS notation and transmit-disable |
| Kenwood HMK | Memory Channels section, leading-zero MHz, shift/split, tones and lockout |
| Kenwood DR TSV | Tab-separated repeater records, including UTF-16 exports, signed offsets and separate tones |
| Common-column CSV/TSV | Recognized aliases for name/callsign, receive/transmit frequency, tones, mode, bandwidth, power and scan |

Comma, semicolon and tab separators, quoted fields, UTF-8, BOM-marked UTF-16 and Windows-1252 are supported. Named columns may be reordered; case, spacing and punctuation are normalized. Unknown layouts and ambiguous duplicate field aliases are rejected. Generic layouts need a recognized receive-frequency and name column; unfamiliar tone-mode schemes need a supported vendor layout or explicit separate tones. Generic frequencies are MHz unless the header specifies Hz. Missing transmit frequency and duplex information disables transmit and is reported in the preview.

## Review before adding

- Preview pages contain up to 25 rows. Select individual valid rows across pages; excluded rows show the reason. Importing the valid part of a file with errors requires acknowledgement.
- Source channel numbers do not determine destination slots. For Append, choose the next free consecutive slots or an available empty block. Import replaces the channel list from channel 1 and retains duplicate rows as selected. Existing placement and 999-channel safeguards remain in force.
- High/Low power is retained where unambiguous. Missing, inherited, numeric-watt or intermediate power uses the selected fallback, initially Low, with a note. High/Low does not establish a particular wattage or service eligibility.
- FM/NFM channels are supported. Digital-only, AM, active reverse/talk-around, unsupported signaling and malformed tones are excluded. An FM-capable mixed-mode listing is imported as FM with a note.
- Frequencies must pass the existing band and 1.25 kHz grid checks. Values are not rounded. Explicit transmit frequencies must agree with supplied offset information where the format requires both.
- Names use the existing 12-byte radio field. Truncation is reported; the original name is available in the preview tooltip. Unsupported characters exclude the row.
- CHIRP TSQL uses cToneFreq for both transmit and receive. DTCS uses DtcsCode for both, with its polarity setting; supported Cross modes can use separate receive and transmit signaling.
- Location, comments, contacts, zones and digital configuration are not copied. Conversion notes identify missing fields or defaults. Review frequencies, tones, bandwidth and power before applying.

File import makes no RepeaterBook or other live API calls and embeds no shared credentials. Save the resulting workspace using DAT or IMG export. CSV export is not included.

## Evidence and scope

All eleven supplied files were checked locally against expected receive/transmit frequencies and tones: 71 populated records. The ID-31 sample has one record; the other ten have seven each. The ADMS-7 sample also contains 493 empty numbered records. Original files and their channel data are not published. Public regression fixtures use invented records and the observed column layouts.

Software checks cover conversion, malformed inputs, mixed valid/invalid files, encoding, selection, placement, settings preservation, cancellation, Undo and existing write guards. The v20.31 release passed 185 automated tests and 26 deployed-browser checks. The v20.32 verification is recorded below. No physical-radio write is performed for this release. K4RJM's earlier physical-radio evidence remains credited in [Testing & Compatibility](testing-compatibility.html); [audit dispositions](AUDIT-REMEDIATION.md) and F01/F03 limitations are unchanged.

## Format references

Adapters were written for Ham-Rx using the supplied layouts and independently checked format semantics. Credit to CHIRP for its published file-format implementations:

- [CHIRP CSV and RT Systems reader](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/drivers/generic_csv.py)
- [CHIRP tone semantics](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/chirp_common.py)
- [CHIRP Kenwood HMK reader](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/drivers/kenwood_hmk.py)
- RepeaterBook documentation: [BTECH](https://www.repeaterbook.com/wiki/doku.php?id=btech_uv_pro_gmrs_pro), [ADMS-7](https://www.repeaterbook.com/wiki/doku.php?id=yaesu_adms_7), [Kenwood HMK](https://www.repeaterbook.com/wiki/doku.php?id=kenwood_hmk_file), [Kenwood DR list](https://www.repeaterbook.com/wiki/doku.php?id=kenwood_dr_repeater_list).

## Deployment and rollback

UAT only. Pre-change rollback: `33b8b874d2f39f6482b60eb37a5ec23ec5583796` (v20.30 application `f372dd2dff150524427cf13f85acfbe112e5146b`). LIVE remains v20.28 at `f425c0ca92db4b4131a02795b70f3c778f2e4b0e`. Follow the existing [rollback procedure](DEPLOYMENT.md); do not promote this feature without approval.


## Verified v20.31 UAT release — October 23, 2026

Application commit: `9b40e0815fc931c5c7090fea006beea52774ba35`. [Deployment 39993726837](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/39993726837) succeeded. All **185 automated tests** and **26 deployed-browser checks** passed. The final browser run identified `20.31-UAT.9b40e08`.

Checks cover all ten named layouts, common-column import, UTF-16 Kenwood TSV, row paging/selection, explicit partial-import acknowledgement, fallback power, active-reverse rejection, malformed-file retention, settings preservation, native DAT/IMG compatibility, placement, duplicate skipping, Undo, light/dark appearance, phone layouts and existing programming protections. A separate manual file-picker check and desktop/phone visual review confirmed the preview and reachable confirmation controls. All eleven original samples were rechecked against expected frequencies and tones after the final conversion change: 71 records, no rejected rows.

Seventeen protected modules match the pre-change UAT source byte for byte; connection/read/write/reset handlers also match. No Bluetooth connection or physical-radio write was performed. The historical physical-radio evidence and unresolved firmware/reconnection limitations are unchanged. No new hardware compatibility claim is made by these file-import checks.

LIVE was rechecked at `f425c0ca92db4b4131a02795b70f3c778f2e4b0e` (v20.28) and remains unchanged. UAT is ready for review. Restore the application state at `33b8b874d2f39f6482b60eb37a5ec23ec5583796` through a normal tested commit to roll back; do not force-push. This post-verification record follows the repository's documentation-only publication procedure and does not change the deployed application commit.


## v20.32 toolbar update

The toolbar relocation and channel-list replacement are limited to UAT. The pre-change rollback point is `c0c34528ee047f57adceb9548896137544120700` (v20.31 application `9b40e0815fc931c5c7090fea006beea52774ba35`). The existing converters, protected radio code and programming sequence are unchanged. Native-file replacement confirmation occurs after successful parsing, so an invalid file does not discard the workspace. Cancellation and late reads cannot apply a channel-list replacement.


## Verified v20.32 UAT release — October 23, 2026

Deployed commit: `9e778f8f11dadd0a29ce69f7ac2bb1ad8aea88b1`. [Deployment 40009380914](https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial-uat/actions/runs/40009380914) succeeded. All **190 automated tests** and **27 deployed-browser checks** passed against `20.32-UAT.9e778f8`.

The additional checks cover separate sidebar buttons, all five file extensions, import/append from other screens, CSV/TSV/HMK replacement, confirmation, exact Undo restoration, duplicate retention during replacement, 999-channel overflow rejection, reserved-record/settings preservation, native replacement cancellation, invalid-file retention, late-read cancellation and the blank-workspace write guard. Browser tests retain native DAT/CHIRP/Studio import/export, append placement and all existing safety checks. Manual desktop/phone review confirmed both buttons remain accessible, and the real file picker opens the channel-list replacement preview.

Nineteen existing radio, placement and file-conversion modules are unchanged, along with connection/read/write/reset handlers. No physical-radio connection or write was performed. LIVE was rechecked at `f425c0ca92db4b4131a02795b70f3c778f2e4b0e` (v20.28) and remains unchanged. UAT rollback is `c0c34528ee047f57adceb9548896137544120700` (v20.31); restore it through a normal tested commit. This verification-only record follows the established post-publication documentation procedure and does not change the deployed application.
