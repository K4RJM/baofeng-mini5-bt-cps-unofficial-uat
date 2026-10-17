# Baofeng Mini 5 BT CPS – Unofficial

Free, noncommercial browser software by K4RJM, hosted on GitHub Pages.

**Current release: v20.21.** F10 is remediated with bounded Bluetooth calls, cancellation and late-result isolation. Timed-out writes remain uncertain and are never retried; normal commands, payloads and post-write reboot handling are preserved. Fourteen findings are resolved; F13 remains. This does not claim a cure for intermittent PC/radio Bluetooth reset problems. See [F10 evidence](docs/F10-DEADLINES.md) and [progress](docs/CODEX-PROGRESS.md).

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

⚠ **Experimental Software — Radio Damage Risk**

Programming errors, software defects, or interrupted communication may render your radio inoperable. Always maintain a backup dat for use with official CPS and programming cable.

## Implemented

- System-aware dark/light appearance and manual override, responsive left navigation, fixed warning/progress and connection status.
- Blank workspace, 999 editable channels, edit/delete/add-above, batch deletion with empty-slot/renumber choice, drag reorder, keyboard-accessible Move, search, pagination and channel-operation undo. The extra 1,000th file record is preserved.
- Passive native CPS DAT import/export, original-read DAT backup, optional settings, upper/lower VFOs, DTMF and inherited validation/help.
- Single Bluetooth session for connect/read/write/verify. Read loads the editor directly and retains the connection. Backup confirmation, model checks, failure lock and no automatic write retries.
- Wireless CPS ON/scanning OFF preparation, explicit restart confirmation after writing with a Wireless CPS toggle fallback, and ten-minute idle warning with a 60-second disconnect countdown.
- Disabled RepeaterBook import preview, pending approval: no live API calls, token field, shared tokens or bundled data.

## Pending / limitations

Physical testing already includes K4RJM’s successful programming, Bluetooth reads and reconnections, factory CPS comparisons and independent radio-memory captures. The identified baseline is Radio 100 / V0.05 / V1.7. See the [Open Audit Findings](docs/AUDIT-REMEDIATION.md) for the evidence already collected and the specific gaps. Remaining work includes unresolved field mappings, scoped hardware/VFO frequency checks, persistence/reconnection reliability, other hardware variants and reception of dialed DTMF sequences. Cable transport, firmware flashing, banks/zones and blank-template radio writing remain unsupported.

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

Live site: [Baofeng Mini 5 BT CPS – Unofficial](https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/). A particular release is deployed only after its GitHub Actions run succeeds. No paid server, secret or shared token required. All assets use relative paths for repository-subpath hosting. `npm run package` prepares dist/.

## Verification and provenance

`npm test` covers DAT round trips/rejection, channel preservation, writer/reader simulations, failure/no-retry behavior, decoder compatibility and protected-file hashes. Simulations are not hardware validation. See [verification notes](docs/VERIFICATION.md).

Reviewed core SHA-256 hashes and the retained build 18 provenance are tracked in docs/protected-core.json. Changes require explicit safety review and approval before use on a radio.

Derived from [Mini 5 Studio by replicationbench](https://github.com/replicationbench/Mini5); [CHIRP](https://github.com/kk7ds/chirp) informed the approved BLE layout and native CPS captures informed DAT mapping. Modified source and notices are supplied under GPL v3; see [LICENSE](LICENSE). Not affiliated with Baofeng or RepeaterBook.
