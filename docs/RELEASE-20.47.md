# UAT v20.47 — UV-32 cable read candidate

This UAT candidate adds **Read UV-32 by cable** beside the existing Bluetooth read. It uses the browser's Web Serial port chooser, 115,200 baud, the UV-32 identification and initialization sequence documented by CHIRP, and the same 500 channel-only read addresses and decoder already used by Ham-Rx. It never sends a memory-write frame. The MINI-5 programming path and LIVE site are unchanged.

The cable reader requires an exact `UV32PRO` identity, validates every response header and length, and closes the serial port after success or failure. A failed read cannot produce a channel preview. The existing Bluetooth reader remains available. The cable reader is **not physically verified** yet; do not infer UV-32 write compatibility from a successful channel read. Full settings, VFO data, and a complete native codeplug are outside this initial capture.

Automated checks: 273 Node tests passed, including a simulated full cable read, wrong-radio rejection and malformed-block rejection. A deployed browser check and physical cable read are still required before calling the feature verified. The first physical comparison should use the same radio and cable that the factory CPS read successfully, with the factory CPS closed so the serial port is free. Save the successful capture and compare it with the factory CPS readback. No physical radio write is requested.

Protocol reference: [CHIRP UV-32 driver](https://github.com/kk7ds/chirp/blob/19b5359693d37204e21ad11ce4e5613614de3886/chirp/drivers/baofeng_uv17Pro.py), which inherits `UV17ProGPS` identification and the 64-byte block read loop.
