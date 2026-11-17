# UAT 20.48 — UV-32 full cable capture candidate

- The UV-32 cable action reads all four discontiguous memory regions (526 validated 64-byte blocks, 33,664 bytes). It sends no memory-write command.
- The read-only preview retains the MINI-5 channel table concept and adds Radio Function, VFO A/B, DTMF, and Zones tabs following the factory CPS screen groups. Raw codes or bytes are shown wherever field values are not yet physically confirmed.
- The original wire bytes remain in the downloadable JSON. Existing MINI-5 import, export, edit, and programming paths are unchanged. UV-32 programming remains disabled.
- The installed factory CPS EXE and DotNetBar DLL were inspected read only; see `UV32-FACTORY-CPS-REFERENCE.md`.
- A first successful 33,664-byte cable capture from this radio is needed to compare the extra sections with factory CPS. The existing successful 32,000-byte capture verifies only channels.
