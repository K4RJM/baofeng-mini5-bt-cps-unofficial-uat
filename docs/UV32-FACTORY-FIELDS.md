# UV-32 factory CPS field reference

Received from K4RJM on November 1, 2026: four screenshots of **BF-UVPROs CPS**, with model **UV32PRO** selected. This is the interface reference for a future UV-32-specific Ham-Rx adapter. It records visible controls, not implemented support or verified binary mappings. Existing MINI-5 fields and its 999-channel safeguards are unchanged.

## Channels and zones

Preserve the factory column order when a UV-32 channel editor is implemented:

1. Channel number
2. Receive frequency
3. Receive QT/DQT
4. Transmit frequency
5. Transmit QT/DQT
6. Power
7. Wide/narrow bandwidth
8. Scan inclusion
9. Squelch mode
10. PTT-ID
11. Signaling group
12. Busy-channel lock
13. FHSS
14. Channel name

The screenshots show a named bank/zone, ten-bank navigation, Clear All, Clear Bank and Default controls. The visible model banner lists 136–174, 400–520 and 220–260 MHz. These are the CPS's displayed model ranges, not an independently verified transmit entitlement or validation of every frequency on the physical radio. Dropdown option sets and numeric limits not shown remain to be confirmed.

## VFO A and VFO B

Each VFO has frequency, receive QT/DQT, transmit QT/DQT, squelch mode, power, bandwidth, frequency step, signaling group, offset direction, offset frequency and FHSS. The dialog also has shared VFO scan-range limits, busy-channel lock and PTT-ID controls. Preserve that distinction rather than assuming every setting is independent per VFO.

## Radio functions

| Factory column | Visible controls |
| --- | --- |
| Left | SQL; TOT; Save Mode; TOT Alarm; Dual Standby; Pilot Tone; Sidetone; Tail Clear; Power On Display Type; Beep; Roger |
| Middle | Language; Scan Mode; Alarm Mode; Sound Alarm; Key Lock; FM; Key Auto Lock; Menu Quit Timer; Backlight Timer; Send ID Delay; QT Save Mode; Skey1 Short |
| Right | Channel A Display Type; Work Mode A; Channel B Display Type; Work Mode B; Repeater Tail Clear; Repeater Tail Delay; Enable Menu Reset; VOX Switch; VOX Level; VOX Delay Time; GPS Switch; GPS Mode |

GPS Switch and GPS Mode are explicit UV-32 controls in this reference. A GPS+Beidou selection is visible; the screenshot does not enumerate all supported modes or establish their byte representation.

## DTMF

The DTMF dialog shows 20 numbered entries with Code and Name fields, a Local ID, DTMF Code Time, DTMF Idle Time and Hang-Up Time. The displayed values are examples from this codeplug, not defaults to apply to another radio.

## Implementation evidence still required

- Match each field to the supplied UV-32 factory DATs and independent radio-memory evidence, including preservation of unedited values.
- Establish full dropdown ranges, units, text encoding and length limits.
- Verify zone mapping, full channel capacity and boundary behavior through the UV-32 adapter rather than reusing MINI-5 limits.
- Complete the Bluetooth identification investigation before enabling a UV-32 memory driver. See [the capture analysis](BLUETOOTH-CAPTURE-2026-11-01.md).

The original screenshots include private channel/codeplug contents and are not republished in this repository.
