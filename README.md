# Ham-Rx Baofeng Mini-5

Free, noncommercial browser software by K4RJM, hosted on GitHub Pages.

**Version 20.33.** Open native DAT, CHIRP UV-5R Mini and legacy Mini 5 Studio images; export genuine CHIRP images. **Import file** and **Append channels** are separate left-toolbar buttons for DAT, IMG, CSV, TSV, HMK and supported AnyTone RDT files. Digital channels are filtered out automatically. Import opens DAT/IMG configurations or previews channel-list replacement; Append adds channels with empty-slot previews, duplicate skipping and Undo, preserving the current radio settings. [Image compatibility, preservation limits and evidence](docs/IMG-COMPATIBILITY.md). [Channel-list formats, conversion rules and verification](docs/CSV-IMPORT.md). High-contrast text from v20.28 is retained. Compact channel editing and Radio & Help, all 23 button tutorials, expandable Known Firmware Limitations, and a locally hosted Ham-Rx PDF guide. The radio manual opens Baofeng’s official PDF in a new tab.

Releases are verified in the permanent [UAT site](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/) before publication to [LIVE](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/). The on-screen version and UAT banner identify the environment. [RDT support, verified samples and release/rollback evidence](docs/RDT-IMPORT.md).

Click a channel cell to edit in place. Tab / Shift+Tab saves and moves between cells; Enter saves; Escape cancels an unsaved entry. Checkboxes and dropdowns save immediately. The explicit **Edit** button opens the full editor with Previous / Next navigation. **+ Add channel** starts at the first empty slot; **Ins Ch** inserts above the row.

**Move selected (X)** gathers selected occupied channels, including selections on other pages, into a contiguous block. Enter its first destination channel, review all affected channel numbers, then apply. Displaced records retain their order. The complete move is one Undo action; no operation writes automatically to a radio.

New inline entries of 174 MHz and 520 MHz change to 173.99875 and 519.99875 MHz, with a notification. Other invalid or off-grid entries restore the previous value. Imported/read frequencies remain intact. The popup and final write checks retain their existing validation.

Compact rows, alternating shading and factory CPS column order are retained. Desktop Channels keeps pagination visible and scrolls the table body. Narrow/short windows use a responsive fallback, with horizontal table scrolling. The header and interactive Help use the blue MINI-5 photograph supplied by K4RJM; the favicon is a simplified blue radio.

The v20.29 image foundation passed 163 automated tests, 23 deployed browser checks and six offline interoperability cases using CHIRP’s actual loader. The v20.30 append release adds preservation, cancellation and oversize checks plus an actual-browser append/Undo check. [Current verification and rollback](docs/IMG-COMPATIBILITY.md). No physical radio was accessed for this file-handling release.

**Retained v20.23 update:** Ham-Rx Baofeng Mini-5 is the new name for Baofeng Mini 5 BT CPS – Unofficial. The Experimental designation is removed at K4RJM’s request; the programming-risk notice, verification and write protections remain. Existing URLs and native DAT files remain compatible. Radio programming behavior is unchanged.

All 15 original audit findings have final dispositions: 13 corrected/verified/remediated and two accepted factory-compatible limitations. See [audit status](docs/AUDIT-REMEDIATION.md), [test coverage](docs/F13-COVERAGE.md) and [publication checkpoint](docs/CODEX-PROGRESS.md). Intermittent PC/radio Bluetooth recovery is not claimed fixed.

## Known factory-compatible limitations

- **VFO offset direction and DTMF group overlap:** factory wired CPS and Bluetooth captures reproduce the same limitation. On the tested VFO A, OFF/group 17 and PLUS/group 1 both read back as PLUS/group 17. Normal memory-channel records are unaffected by this overlap. Prefer saved channels with explicit receive/transmit frequencies for repeaters; review VFO readback.
- **DAT backup scope:** native DAT files contain CPS configuration, not firmware or every raw memory byte. Factory-compatible writes reconstruct parts of the memory layout, including fixed values in unmapped areas.
- **Separate stock-CPS caveat:** stock CPS displayed defaults for some stored PTT-ID/VFO values; a later factory write reset the delay. The Bluetooth decoder correction preserves the evidenced values. Recheck settings before a stock-CPS write.

The VFO limitation likely involves radio firmware or the configuration format, but its precise cause is unconfirmed. Factory-compatible reconstruction is not itself a demonstrated firmware fault. [Read the practical effects, examples and evidence](docs/KNOWN-LIMITATIONS.md).

**Retained v20.13 interface:** The build number appears in the top header on both LIVE and UAT, beside a compact “What’s new” changelog. The existing write-confirmation window now includes a preparation checklist and one acknowledgement covering readiness, the backup reminder and risk acceptance. The checklist’s timing statement comes from maintainer-reported physical testing. Radio programming behavior is unchanged.

**Retained v20.12 correction:** Channel frequencies no longer silently disappear at 600 MHz and above during decoding. Malformed or out-of-format channel frequencies are rejected; failed reads retain raw diagnostics and the previous workspace. This corrects F07's representation defect, not hardware band limits. At that historical release, seven findings were corrected and eight remained open. F02 corrections are retained; F03 packing and Bluetooth transaction behavior are unchanged. See the [remediation tracker](docs/AUDIT-REMEDIATION.md), [F07 evidence and radio-test checklist](docs/F07-EVIDENCE-2026-10-15.md) and [verification](docs/VERIFICATION.md).

[Open LIVE](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/) · [Open UAT for future development](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/). The deployments use separate repositories; see [promotion and rollback](docs/DEPLOYMENT.md).

## Earlier releases

Build 19 replaced the placeholder with a single-screen editor, preserving the retained build 18 radio core.

Build 19.1 adds trailing-zero completion for edited channel/VFO frequencies: `146.52` becomes `146.52000` on leaving the field or applying/saving. Blank transmit fields remain blank, excess precision is rejected rather than rounded, and untouched imported values remain unchanged. All 28 tests pass; protected radio/codec/validation files remain unchanged.

Build 19.2 places the workspace title, description and source badge on one compact line, removes the redundant workspace label, and reduces spacing around the status bar. Long descriptions truncate visually on narrow screens while their full text remains available to assistive technology. Radio behavior is unchanged.

Build 19.3 adds Help guidance that only native CPS DAT files are supported and explains using the same file with stock Baofeng CPS/cable or this app/Bluetooth.

Build 19.4 adds K4RJM's GitHub profile and QRZ callsign links below the developer credit. Both open in a new tab.

Build 19.5 adds expandable feature guides on the editing screens and a Help walkthrough covering files, channels, optional settings, VFOs and DTMF. It distinguishes signaling-code groups from channel groups, explains the radio’s built-in weather button, and marks unavailable presets and RepeaterBook import. Radio programming behavior is unchanged.

Build 19.6 adds a simplified interactive Mini 5 button diagram in Radio & help. Hover, keyboard focus or tap shows a tutorial, labels fixed versus assignable controls, and explains the workspace side-key assignment. The diagram only displays instructions; it sends no radio commands.

Build 19.7 expands the SK1 tutorial with all six supported programmable short-press assignments and their functions. The list uses the existing CPS option table; no assignments or radio behavior were added.

Build 19.8 retains normal number-key entry instructions for 0 and 8 and puts their hold functions under a larger Longpress heading. MENU, * and # also separate short-press instructions from documented hold functions. Radio behavior is unchanged.

Build 20.1 builds on the maintainer’s v20.0 help revisions. It standardizes Key / Short Press / Long Press typography; explains all six hold shortcuts; corrects # to the reported DTMF dialing behavior with its transmission warning; expands reverse/talkaround, frequency search and SK1 activation-tone guidance. The guide is display-only. Radio programming behavior and all safety restrictions remain unchanged.

Build 20.2 shortens SK1 instructions and keeps the tutorial panel at a steady height, with internal scrolling for longer guides. Hovering between keys no longer changes the page height. Radio programming behavior is unchanged.

Build 20.3 removes the redundant SK1 assignment-list heading. The six descriptions, current assignment, transmission warnings and steady tutorial height are retained.

Build 20.4 simplifies the button tutorials by removing the SK1 workspace/diagram notes, repetitive DTMF paragraphs, number-key assignment note, power/workspace note and flashlight/search note. Help uses direct wording. Operating steps, six SK1 functions and steady panel height remain; radio programming behavior is unchanged.

Build 20.5 / 20.6 adds a compact Channels popup for built-in service presets and native DAT channel appends. It previews next available consecutive slots or fully empty 101–901 blocks, skips matching channels by default, preserves all existing channels/settings and supports Undo. Presets include receive/transmit frequencies and offer the existing High/Low power choices with service notices. Actual output power and equipment eligibility require verification. The full radio-write process is unchanged.

Build 20.7 opens the channel editor when a row is clicked or activated with Enter. Checkboxes, action buttons and dragging retain their own behavior. The channel table preserves vertical/horizontal scroll through edits, selection and deletion, and returns focus to a nearby row without jumping to channel 1. Radio programming behavior is unchanged.

⚠ **Programming risk — Radio damage**

Programming errors, software defects, or interrupted communication may render your radio inoperable. Always maintain a backup dat for use with official CPS and programming cable.

## Implemented

- System-aware dark/light appearance and manual override, responsive left navigation, fixed warning/progress and connection status.
- Blank workspace, 999 editable channels, edit/delete/add-above, batch deletion with empty-slot/renumber choice, drag reorder, keyboard-accessible Move, search, pagination and channel-operation undo. The extra 1,000th file record is preserved.
- Passive native CPS DAT import/export, original-read DAT backup, optional settings, upper/lower VFOs, DTMF and inherited validation/help.
- Single Bluetooth session for connect/read/write/verify. Read loads the editor directly and retains the connection. Backup confirmation, model checks, failure lock and no automatic write retries.
- Wireless CPS ON/scanning OFF preparation, explicit restart confirmation after writing with a Wireless CPS toggle fallback, and ten-minute idle warning with a 60-second disconnect countdown.
- Disabled RepeaterBook import preview, pending approval: no live API calls, token field, shared tokens or bundled data.

## Pending / limitations

Physical testing already includes K4RJM’s successful programming, Bluetooth reads and reconnections, factory CPS comparisons and independent radio-memory captures. The identified baseline is Radio 100 / V0.05 / V1.7. See the [Audit status](docs/AUDIT-REMEDIATION.md) for the evidence already collected and the specific gaps. Known limits include accepted VFO combinations, scoped hardware/VFO frequency checks, persistence/reconnection reliability, other hardware variants and reception of dialed DTMF sequences. Cable transport, firmware flashing, banks/zones and blank-template radio writing remain unsupported.

RepeaterBook approval, CORS/identification, individual app-bound tokens, export/attribution permission and approved limits remain pending. See [integration review](docs/REPEATERBOOK.md).

Read [SAFETY.md](docs/SAFETY.md) before programming. Blank workspaces support editing/export; Bluetooth writing requires loaded CPS or radio settings. Every write programs the complete CPS configuration.

Build 20.8 adds Previous / Next to the channel editor. Moving applies valid workspace edits, skips empty slots unless Show empty slots is on, crosses table pages and ignores the table search filter. Invalid edits block navigation; closing discards only the current staged edits. Unchanged navigation creates no Undo entry. Insert-above editing keeps its existing single-insertion behavior. Radio programming is unchanged.

Build 20.9 requests browser Bluetooth disconnection immediately after all 262 blocks are acknowledged. Reconnect waits for explicit confirmation that the radio has finished rebooting; Wireless CPS OFF/ON remains a fallback. K4RJM has performed programming and reconnection tests and reported intermittent recovery problems. Reliable recovery across repeated write/reboot cycles remains unestablished; lifecycle/error logs and build/browser details support that investigation. No new radio opcode, memory map change or automatic write retry.

## Run locally

No packages need installation. With Node.js 20 or newer:

```sh
npm test
npm start
```

Open `http://127.0.0.1:8726`. Serving is required for modules; double-clicking index.html is unsupported. Bluetooth additionally needs Web Bluetooth on the actual browser/OS; DAT editing remains available without it.

## Free GitHub Pages

Commit to `K4RJM/baofeng-mini5-bt-cps-unofficial`. In **Settings → Pages**, choose **GitHub Actions**. The workflow tests pull requests and deploys from main after passing tests and packaging. Only allowlisted public files are uploaded; tests, private DAT files and captures are excluded.

Live site: [Ham-Rx Baofeng Mini-5](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/). A particular release is deployed only after its GitHub Actions run succeeds. No paid server, secret or shared token required. All assets use relative paths for repository-subpath hosting. `npm run package` prepares dist/.

## Verification and provenance

`npm test` covers DAT round trips/rejection, channel preservation, writer/reader simulations, failure/no-retry behavior, decoder compatibility and protected-file hashes. Simulations are not hardware validation. See [verification notes](docs/VERIFICATION.md).

Reviewed core SHA-256 hashes and the retained build 18 provenance are tracked in docs/protected-core.json. Changes require explicit safety review and approval before use on a radio.

Derived from [Mini 5 Studio by replicationbench](https://github.com/replicationbench/Mini5); [CHIRP](https://github.com/kk7ds/chirp) informed the approved BLE layout and native CPS captures informed DAT mapping. Modified source and notices are supplied under GPL v3; see [LICENSE](LICENSE). Not affiliated with Baofeng or RepeaterBook.
