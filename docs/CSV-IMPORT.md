# Channel-list import — v20.31 UAT

Choose **Channels → Import / append**, select a CSV, TSV or HMK file, review the channel rows and destination, then apply. This adds selected channels to empty slots, preserves existing channels and settings, and supports Undo. It never programs the radio automatically.

Read the radio first to retain its current configuration. CSV lists can also be added to a blank workspace, but this does not satisfy the existing radio-read and identity requirements for programming. DAT/IMG appends still require a loaded configuration. The main Open command still opens DAT/IMG configurations.

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
- Source channel numbers do not determine destination slots. Choose the next free consecutive slots or an available empty block. Existing placement and 999-channel safeguards remain in force.
- High/Low power is retained where unambiguous. Missing, inherited, numeric-watt or intermediate power uses the selected fallback, initially Low, with a note. High/Low does not establish a particular wattage or service eligibility.
- FM/NFM channels are supported. Digital-only, AM, active reverse/talk-around, unsupported signaling and malformed tones are excluded. An FM-capable mixed-mode listing is imported as FM with a note.
- Frequencies must pass the existing band and 1.25 kHz grid checks. Values are not rounded. Explicit transmit frequencies must agree with supplied offset information where the format requires both.
- Names use the existing 12-byte radio field. Truncation is reported; the original name is available in the preview tooltip. Unsupported characters exclude the row.
- CHIRP TSQL uses cToneFreq for both transmit and receive. DTCS uses DtcsCode for both, with its polarity setting; supported Cross modes can use separate receive and transmit signaling.
- Location, comments, contacts, zones and digital configuration are not copied. Conversion notes identify missing fields or defaults. Review frequencies, tones, bandwidth and power before applying.

File import makes no RepeaterBook or other live API calls and embeds no shared credentials. Save the resulting workspace using DAT or IMG export. CSV export is not included.

## Evidence and scope

All eleven supplied files were checked locally against expected receive/transmit frequencies and tones: 71 populated records. The ID-31 sample has one record; the other ten have seven each. The ADMS-7 sample also contains 493 empty numbered records. Original files and their channel data are not published. Public regression fixtures use invented records and the observed column layouts.

Software checks cover conversion, malformed inputs, mixed valid/invalid files, encoding, selection, placement, settings preservation, cancellation, Undo and existing write guards. Release totals and deployed checks will be recorded after completion. No physical-radio write is performed for this release. K4RJM's earlier physical-radio evidence remains credited in [Testing & Compatibility](testing-compatibility.html); [audit dispositions](AUDIT-REMEDIATION.md) and F01/F03 limitations are unchanged.

## Format references

Adapters were written for Ham-Rx using the supplied layouts and independently checked format semantics. Credit to CHIRP for its published file-format implementations:

- [CHIRP CSV and RT Systems reader](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/drivers/generic_csv.py)
- [CHIRP tone semantics](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/chirp_common.py)
- [CHIRP Kenwood HMK reader](https://github.com/kk7ds/chirp/blob/0bfb2b50e33dcaab59c380238f34e053d95dfd50/chirp/drivers/kenwood_hmk.py)
- RepeaterBook documentation: [BTECH](https://www.repeaterbook.com/wiki/doku.php?id=btech_uv_pro_gmrs_pro), [ADMS-7](https://www.repeaterbook.com/wiki/doku.php?id=yaesu_adms_7), [Kenwood HMK](https://www.repeaterbook.com/wiki/doku.php?id=kenwood_hmk_file), [Kenwood DR list](https://www.repeaterbook.com/wiki/doku.php?id=kenwood_dr_repeater_list).

## Deployment and rollback

UAT only. Pre-change rollback: `33b8b874d2f39f6482b60eb37a5ec23ec5583796` (v20.30 application `f372dd2dff150524427cf13f85acfbe112e5146b`). LIVE remains v20.28 at `f425c0ca92db4b4131a02795b70f3c778f2e4b0e`. Follow the existing [rollback procedure](DEPLOYMENT.md); do not promote this feature without approval.
