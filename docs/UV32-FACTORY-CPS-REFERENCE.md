# UV-32 factory CPS reference (local inspection, 2026-11-16)

The installed factory CPS was inspected read only. Neither binary was executed or changed.

| File | Version | SHA-256 | Role observed |
| --- | --- | --- | --- |
| `C:\Program Files (x86)\BF-UVs Pro En CPS\BF-UVs CPS.exe` | 1.0.0.0 (`BF-H802 CPS`) | `9BD0A5EAA01D2CDDA2FFE5B65D6CC7B7E71008F8FEF99739794E5F02556ED06A` | .NET application with radio model, data, and communication classes |
| `C:\Program Files (x86)\BF-UVs Pro En CPS\DevComponents.DotNetBar2.dll` | 14.0.0.3 | `D1B0B74AAA103C795F6A0C685BB90E3FB6131F9F137F60CCE7C533D5A3015157` | Third-party DotNetBar user-interface assembly |

The application assembly identifies `BF_H802_CPS.Communication` with `HandShake`, `Read`, `Write`, `SetChannelInfos`, `SetVFOAInfos`, and `SetVFOBInfos` methods. `AppData` owns channels, VFOs, function settings, DTMF, and area names. This corroborates the four factory CPS views supplied by the user. Field names were read from .NET metadata, not from executing the CPS.

## Factory field groups

- Channels: RX/TX frequencies and tones, power, bandwidth, scan add, squelch mode, PTT-ID, signalling group, busy lock, FHSS, and name.
- Radio Function: squelch, save mode, VOX, backlight, dual standby, timeout, beep, voice, sidetone, scan mode, ID delay, display modes, auto lock, alarm, repeater tail controls, Roger beep, FM, work modes, key lock, power-on display, pilot tone, GPS, and key shortcuts.
- VFO A/B: frequency, RX/TX tones, busy lock, offset direction/frequency, signalling group, power, bandwidth, squelch mode, step, FHSS, and scan range.
- DTMF: local ID, 20 code/name pairs, code timing, idle timing, and hang-up time.

These metadata names confirm *which* settings exist; they do not prove their byte offsets or value mappings. The UAT reader uses the [CHIRP UV-17Pro family driver](https://github.com/kk7ds/chirp/blob/master/chirp/drivers/baofeng_uv17Pro.py) as a separate memory-layout reference. A 33,664-byte cable capture from this radio completed on November 17. The resulting 33 populated channels, 10 zone names, DTMF local ID/first entry, and many visible function settings match the supplied factory CPS screenshots. Unmapped codes still require separate verification.

The factory `ChatGPT2.dat` is a serialized CPS document, not a raw CHIRP image. Preserve it and all original captures. No UV-32 memory write is enabled in UAT.
