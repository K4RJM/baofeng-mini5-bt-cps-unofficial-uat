# Programming scope and safety

⚠ Experimental Software — Radio Damage Risk

Programming errors, software defects, or interrupted communication may render your radio inoperable. Always maintain a backup dat for use with official CPS and programming cable.

## Preserved implementation

The radio transport, memory map and encoding logic retain the tested build 18 baseline. Later corrections add DAT parsing limits (v20.10), preserve supported settings codes (v20.11), and correct channel-frequency decoding with preflight format validation (v20.12). v20.14 adds channel-only factory-CPS range/grid checks for edits and write preflight. Unsupported imported/read values stay intact for inspection/export and are blocked from programming; no silent rounding is applied. VFO validation is unchanged. DAT export logic is unchanged. Current corrections and Open Audit Findings are tracked in [AUDIT-REMEDIATION.md](AUDIT-REMEDIATION.md). `protected-core.json` records SHA-256 hashes; automated tests fail if any byte changes without review. No new protocol, wider address range, automatic write retry or speculative session-reset command was added.

K4RJM physically tested programming, reads and reconnections, including a successful build 18 write and normal operation on Radio 100, firmware V0.05, hardware V1.7. Subsequent build-20.10 Bluetooth captures and factory DATs supply independent memory evidence for the F02 correction and other audit investigations. Recorded factory-CPS frequency tests are listed in [F07 evidence](F07-EVIDENCE-2026-10-15.md). The handshake verifies `5RMINI`, not firmware/hardware versions. This evidence does not certify other variants or close the remaining timing, mapping and recovery questions.

The preserved writer sends 262 sequential blocks with 128-byte payloads. The previously approved CHIRP method pads 8040–807F, 9040–907F and A1C0–A1FF with FF (192 bytes total). Wireless CPS at 9022 stays ON. Read-back compares 33,344 known CPS bytes; padding is not read or verified. DAT writes include all CPS channels, VFOs, optional settings and DTMF. They set unmapped bytes according to the retained encoder; a DAT is not a full memory-preserving backup.

## Operator flow

1. Turn Wireless CPS ON, scanning OFF, and disconnect OLA/other programmers. Keep the radio charged and nearby.
2. Connect and Read radio, or open a native CPS DAT. Reading loads the same workspace and retains the connection. Connect does not send programming commands.
3. Save a CPS DAT backup, keep original files and the cable available, and review edits. No forced backup download or preparatory full read is imposed.
4. Every explicit write requires the damage warning and existing-backup confirmation. The preserved checks run before write blocks. Edits freeze during radio operations. A source locks after one attempt; timeout/bad ACK disconnect with no automatic retry.
5. After all 262 acknowledgements, the app requests a browser GATT disconnect before the expected firmware reboot. This does not prove internal commit completion. Physical write/reboot/reconnection observations exist, but reliable persistence and recovery across repeated cycles remain to be established. Before another read, a prompt clears the old browser link and waits for explicit restart confirmation, with no fixed timer. Wireless CPS OFF/ON is available as a fallback; an uncertain write requires this fallback. No new radio reset command or automatic write retry is sent. Read-back checks bytes, not all operating functions.
6. Save the diagnostic report on failure. Do not infer success from a timeout, ACK count alone or reboot. Consider official CPS/cable recovery instead of repeated writes.

## Blank workspaces and files

The app opens with 999 empty editable channels. Calling frequencies are VFO defaults, not reserved memory channels. Starter settings are a file-editing template, not a hardware-tested codeplug. Bluetooth writing requires settings loaded from a radio read or native CPS DAT. Imported files still require review; structural validity does not establish safety. The extra 1,000th file record remains hidden and unchanged by channel operations.

DAT parsing is passive and rejects unexpected schemas, malformed structures and trailing bytes. Original names, padding and unknown untouched values remain preserved on export. Changes must pass inherited validation. Format checks do not certify radio band limits or transmit authorization.

No firmware flashing, cable transport or bank/zone unlocks are implemented. Future changes to protected protocol/encoding files or newly enabled writing behavior require explicit maintainer approval and a separate hardware validation plan.

## Browser and privacy

Feature detection determines Web Bluetooth availability. DAT editing remains available without Bluetooth. Radio operations require HTTPS or localhost and a supported browser/OS stack; universal iOS, Linux or Raspberry Pi support is not claimed. Ten-minute inactivity offers a 60-second disconnect countdown, suspended during active operations. No keepalive traffic is sent.

Channel data, captures and logs stay in tab memory until downloaded. No backend, analytics, shared credentials or third-party scripts. Local storage holds only the theme preference.
