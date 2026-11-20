/* Adapted from facenot/bj9000-programmer, revision 7dde2499.
MIT License

Copyright (c) 2026 facenot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

MIT License

Copyright (c) 2025 Nathan G. Barguss - 2E0NBS
Copyright (c) 2026 PE1HVH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
/* BJ-9000 / RT-950 Pro BLE programmer core  v1.0.0
 * Protocol + memory layout per the MIT-licensed RT-950 Pro drivers by
 * Nathan G. Barguss (2E0NBS), PE1HVH and the RT-950 Pro BLE bridge
 * (nivingoonesekera). Independent implementation.
 */


  const VERSION = "1.2.0";
  const HANDSHAKE = Array.from("PROGRAMBT9000U", c => c.charCodeAt(0));
  const ACK = 0x06, BLOCK = 0x80, REC = 32;
  const XOR_KEYS = ["BHT ", "CO 7", "A ES", " EIY", "M PQ", "XN Y", "RVB ", " HQP", "W RC", "MS N",
    " SAT", "K DH", "ZO R", "C SL", "6RB ", " JCG", "PN V", "J PK", "EK L", "I LZ"]
    .map(s => Array.from(s, c => c.charCodeAt(0)));
  const CH_ADDR = 0x0000, CH_LEN = 0x8000, ZN_ADDR = 0xC000, ZN_LEN = 0x100;
  const LOW_LIMIT = 0x7800;
  const LAYOUTS = {
    "990": { zones: 10, per: 99, chMax: 0x7C00, zoneNames: true },
    "960": { zones: 15, per: 64, chMax: 0x7800, zoneNames: false },
  };
  const EMPTY_REC = new Uint8Array([...Array(8).fill(0xFF), ...Array(12).fill(0), ...Array(12).fill(0xFF)]);
  const DCS_BASE = ("023 025 026 031 032 036 043 047 051 053 054 065 071 072 073 074 114 115 116 122 125 " +
    "131 132 134 143 145 152 155 156 162 165 172 174 205 212 223 225 226 243 244 245 246 251 252 255 261 " +
    "263 265 266 271 274 306 311 315 325 331 332 343 346 351 356 364 365 371 411 412 413 423 431 432 445 " +
    "446 452 454 455 462 464 465 466 503 506 516 523 526 532 546 565 606 612 624 627 631 632 645 654 662 " +
    "664 703 712 723 731 732 734 743 754").split(" ");
  const DCS_CODES = DCS_BASE.map(c => `D${c}N`).concat(DCS_BASE.map(c => `D${c}I`));
  // BLE (HM-10-style UART): data/notify on ffe1, one-time unlock write on ff31
  const BLE = {
    FFE1: "0000ffe1-0000-1000-8000-00805f9b34fb",
    FF31: "0000ff31-0000-1000-8000-00805f9b34fb",
    UNLOCK: hex("3F3F3F3F022E171D5E57252F57136256044B2342"),
    OPTIONAL_SERVICES: [0xffe0, 0xff30, 0xff00, 0xfff0, 0xffd0, 0xffc0, 0xffb0, 0xffa0, 0xff10,
      0xff20, 0xff40, 0xff50, 0xff60, 0xff70, 0xff80, 0xff90, 0xfee0, 0xfee7],
    CHUNK: 20,
  };

  function hex(s) { const a = new Uint8Array(s.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }
  function toHex(a) { return Array.from(a, b => b.toString(16).padStart(2, "0")).join(""); }
  function eq(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------------------------------------------------------------- encoders
  function encFreq(mhz) {
    const hz = Math.round(parseFloat(mhz) * 1e6);
    if (!isFinite(hz) || hz <= 0) throw new Error(`bad frequency ${mhz}`);
    if (hz % 10) throw new Error(`${mhz} MHz not on a 10 Hz step`);
    let v = hz / 10; const out = new Uint8Array(4);
    for (let i = 0; i < 4; i++) { const d = v % 100; out[i] = (Math.floor(d / 10) << 4) | (d % 10); v = Math.floor(v / 100); }
    if (v) throw new Error(`${mhz} MHz out of range`);
    return out;
  }
  function decFreq(raw) {
    if (Array.from(raw).every(b => b === 0 || b === 0xFF)) return null;
    let v = 0;
    for (let i = 3; i >= 0; i--) { const hi = raw[i] >> 4, lo = raw[i] & 15; if (hi > 9 || lo > 9) return null; v = v * 100 + hi * 10 + lo; }
    return v * 10 / 1e6;
  }
  function encCtcss(hz) {
    const v = Math.round(parseFloat(hz) * 10);
    if (!(v > 0 && v <= 0xFFFF)) throw new Error(`bad CTCSS ${hz}`);
    return new Uint8Array([v & 0xFF, v >> 8]);
  }
  function encDcs(code, pol) {
    pol = (pol || "N").toUpperCase(); if (pol === "R") pol = "I";
    const tok = `D${String(parseInt(code, 10)).padStart(3, "0")}${pol}`;
    const i = DCS_CODES.indexOf(tok);
    if (i < 0) throw new Error(`unsupported DCS ${tok}`);
    return new Uint8Array([i + 1, 0]);
  }
  const OFF = new Uint8Array([0, 0]);
  function encTones(row) {  // -> [rx, tx]
    const mode = (row.Tone || "").trim();
    const rt = row.rToneFreq || "88.5", ct = row.cToneFreq || "88.5";
    const pol = ((row.DtcsPolarity || "NN").trim() + "NN");
    const txd = row.DtcsCode || "023", rxd = row.RxDtcsCode || row.DtcsCode || "023";
    if (mode === "") return [OFF, OFF];
    if (mode === "Tone") return [OFF, encCtcss(rt)];
    if (mode === "TSQL") return [encCtcss(ct), encCtcss(ct)];
    if (mode === "DTCS") return [encDcs(txd, pol[1]), encDcs(txd, pol[0])];
    if (mode === "Cross") {
      const [a, b] = (row.CrossMode || "Tone->Tone").trim().split("->");
      const tx = a === "Tone" ? encCtcss(rt) : a === "DTCS" ? encDcs(txd, pol[0]) : OFF;
      const rx = b === "Tone" ? encCtcss(ct) : b === "DTCS" ? encDcs(rxd, pol[1]) : OFF;
      return [rx, tx];
    }
    throw new Error(`unsupported tone mode ${mode}`);
  }
  function encName(name) {   // ASCII subset of GB2312, 12 bytes, 0xFF padded
    const out = new Uint8Array(12).fill(0xFF); let n = 0;
    for (const ch of (name || "").trim()) { const c = ch.charCodeAt(0); if (c < 32 || c > 126) continue; if (n >= 12) break; out[n++] = c; }
    return out;
  }
  function buildRecord(row) {
    const rx = parseFloat(row.Frequency);
    const duplex = (row.Duplex || "").trim();
    const off = parseFloat(row.Offset || 0);
    const txOn = duplex !== "off";
    const tx = { "": rx, "+": rx + off, "-": rx - off, "split": off, "off": rx }[duplex];
    if (tx === undefined) throw new Error(`bad Duplex ${duplex}`);
    const mode = (row.Mode || "FM").trim().toUpperCase();
    const power = { HIGH: 0, MEDIUM: 1, MID: 1, LOW: 2 }[(row.Power || "High").trim().toUpperCase()] ?? 0;
    const [rxT, txT] = encTones(row);
    let flags = 0;
    if (mode === "NFM") flags |= 0x40;
    if ((row.Skip || "").trim().toUpperCase() !== "S") flags |= 0x04;
    if (txOn) flags |= 0x02;
    if (mode === "AM") flags |= 0x01;
    const r = new Uint8Array(REC).fill(0xFF);
    r.set(encFreq(rx), 0); r.set(encFreq(+tx.toFixed(6)), 4); r.set(rxT, 8); r.set(txT, 10);
    r[12] = 0; r[13] = 0; r[14] = power; r[15] = flags; r.set(encName(row.Name), 20);
    return r;
  }
  function describe(rec) {
    const rx = decFreq(rec.subarray(0, 4)), tx = decFreq(rec.subarray(4, 8));
    if (rx === null) return "(empty)";
    let name = ""; for (const b of rec.subarray(20, 32)) { if (b === 0xFF || b === 0) break; name += String.fromCharCode(b); }
    const f = rec[15];
    return `${name.padEnd(9)} RX ${rx.toFixed(4)} TX ${tx.toFixed(4)} ${f & 2 ? "" : "RX-only "}${f & 1 ? "AM" : f & 0x40 ? "NFM" : "FM"}`;
  }

  // --------------------------------------------------------------- CSV
  function parseCSV(text) {
    const rows = []; let row = [], f = "", q = false;
    text = text.replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += c;
    }
    if (q) throw new Error("Unclosed quoted CSV field");
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    const hdr = rows.shift() || [];
    if (!hdr.map(h=>h.trim()).includes("Frequency")) throw new Error("Choose a CHIRP CSV with a Frequency column.");
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(hdr.map((h, i) => [h.trim(), (r[i] || "").trim()])))
      ;
  }
  function zoneFromFilename(fn) {
    const base = String(fn).split(/[\\/]/).pop();
    if (base.startsWith("._")) return null;                       // macOS resource-fork junk
    const m = /^Zone(\d+)_(.*)\.csv$/i.exec(base);
    return m ? { zone: parseInt(m[1], 10), name: m[2].replace(/_/g, " ").slice(0, 12) } : null;
  }

  // ------------------------------------------------------------- ZIP (read-only, no library)
  // Reads a standard .zip (stored or deflate) via the central directory.
  // Inflate uses the built-in DecompressionStream("deflate-raw"): Chrome 103+, Safari/iOS 16.4+, Node 18+.
  function zoneNames(seg) {
    const out = [];
    for (let i = 0; i < 10; i++) { let s = ""; for (const b of seg.subarray(i * 16, i * 16 + 16)) { if (b === 0 || b === 0xFF) break; s += String.fromCharCode(b); } out.push(s.trim()); }
    return out;
  }
  function changedBlocks(oldB, newB, base, limit) {
    const out = [];
    for (let o = 0; o < Math.min(newB.length, limit); o += BLOCK) {
      const a = oldB.subarray(o, o + BLOCK), b = newB.subarray(o, o + BLOCK);
      if (!eq(a, b)) out.push({ addr: base + o, data: new Uint8Array(b) });
    }
    return out;
  }
  function planWrites(image, target, layout, allowHigh) {
    const L = LAYOUTS[layout];
    let blocks = changedBlocks(image.ch, target.ch, CH_ADDR, L.chMax);
    if (blocks.some(b => b.addr >= LOW_LIMIT) && !allowHigh) throw new Error("plan touches channels 961-990 without permission");
    if (L.zoneNames) blocks = blocks.concat(changedBlocks(image.zn, target.zn, ZN_ADDR, ZN_LEN));
    for (const b of blocks) if (!(b.addr < 0x7C00 || (b.addr >= ZN_ADDR && b.addr < ZN_ADDR + ZN_LEN))) throw new Error("internal: illegal address " + b.addr);
    return blocks;
  }

  /* link: { write(Uint8Array) -> Promise, onData = fn(Uint8Array) set by us,
             reconnect() -> Promise (optional) } */
  class Transport {
    constructor(link, opts = {}) {
      this.link = link; this.buf = []; this.waiter = null; this.key = null; this.model = null;
      this.allowed = opts.allowedModels || ["RT-950"]; this.log = opts.log || (() => { });
      this.rand = opts.rand || Math.random; this.txCount = 0;
      link.onData = d => this._onData(d);
    }
    _onData(d) {
      // swallow the ff31 unlock reply ("!...") before any clone traffic
      if (this.txCount === 0 && d.length && d[0] === 0x21) return;
      for (const b of d) this.buf.push(b);
      if (this.waiter) this.waiter();
    }
    clear() { this.buf.length = 0; }
    async _w(bytes, o) { this.txCount += bytes.length; await this.link.write(bytes, o); }
    async _r(n, timeoutMs = 3000) {
      const t0 = Date.now();
      while (this.buf.length < n) {
        const left = timeoutMs - (Date.now() - t0);
        if (left <= 0) throw new Error(`timeout waiting for ${n} bytes (got ${this.buf.length})`);
        await new Promise(res => { const t = setTimeout(res, Math.min(left, 250)); this.waiter = () => { clearTimeout(t); res(); }; });
        this.waiter = null;
      }
      return new Uint8Array(this.buf.splice(0, n));
    }
    _xor(data) {
      const o = new Uint8Array(data);
      for (let i = 0; i < o.length; i++) {
        const k = this.key[i % 4], v = o[i];
        if (k !== 0x20 && v !== 0 && v !== 0xFF && v !== k && v !== (k ^ 0xFF)) o[i] = v ^ k;
      }
      return o;
    }
    async handshake() {
      let last;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try { return await this._handshakeOnce(); }
        catch (e) { last = e; if (e.modelRefused) throw e; this.log(`handshake attempt ${attempt} failed: ${e.message}`); this.clear(); await sleep(300); }
      }
      throw last;
    }
    async _handshakeOnce() {
      this.clear(); await sleep(200);
      await this._w(new Uint8Array(HANDSHAKE));
      if ((await this._r(1, 2500))[0] !== ACK) throw new Error("no ACK to PROGRAMBT9000U");
      await this._w(new Uint8Array([0x46]));                // 'F'
      let ident = await this._r(16, 2500), strips = 0;
      while (ident[0] === ACK && strips < 4) {               // stray late ACK on cold BLE link
        ident = new Uint8Array([...ident.subarray(1), ...(await this._r(1, 2500))]); strips++;
      }
      await this._w(new Uint8Array([0x4D]));                // 'M'
      const m = await this._r(12, 2500);
      this.model = String.fromCharCode(...m).replace(/[\x00 ]+$/, "").replace(/^[\x00 ]+/, "");
      this.log(`Radio model: "${this.model}"`);
      if (!this.allowed.includes(this.model)) {
        await this._w(new Uint8Array([0x45]));
        const e = new Error(`model "${this.model}" not allowed (allowed: ${this.allowed.join(", ")}). Choose the RT-950 Pro in the Bluetooth device picker.`);
        e.modelRefused = true; throw e;
      }
      const frame = new Uint8Array(25);
      frame.set([0x53, 0x45, 0x4E, 0x44], 0);               // "SEND"
      frame[4] = ((1 + Math.floor(this.rand() * 2)) << 4) | Math.floor(this.rand() * 5);
      for (let i = 0; i < 19; i++) frame[5 + i] = Math.floor(this.rand() * 20);
      const code = frame[4];
      const idx = ((code & 0x20) ? (code - 0x20) * 2 + 1 : (code - 0x10) * 2) + 1;
      await this._w(frame);
      if ((await this._r(1, 2500))[0] !== ACK) throw new Error("no ACK to key frame");
      this.key = XOR_KEYS[frame[4 + idx]];
      return this.model;
    }
    async read(addr, len, onBlock, cmd = 0x52) {
      const out = new Uint8Array(len);
      for (let a = addr; a < addr + len; a += BLOCK) {
        let ok = false, lastErr;
        for (let t = 0; t < 3 && !ok; t++) {
          try {
            if (t) { await sleep(500); this.clear(); }          // drain any partial reply, then resend
            await this._w(new Uint8Array([cmd, a >> 8, a & 0xFF, BLOCK]));
            const blk = await this._r(4 + BLOCK, 4000);
            if (blk[3] !== BLOCK || blk[1] !== (a >> 8) || blk[2] !== (a & 0xFF)) throw new Error(`reply header ${toHex(blk.subarray(0, 4))} does not match address 0x${a.toString(16)}`);
            out.set(this._xor(blk.subarray(4)), a - addr); ok = true;
          } catch (e) { lastErr = e; this.log(`retry read 0x${a.toString(16)}: ${e.message}`); }
        }
        if (!ok) throw lastErr;
        if (onBlock) onBlock();
      }
      return out;
    }
    async writeBlock(a, data) {
      if (data.length !== BLOCK) throw new Error("block size");
      const frame = new Uint8Array(4 + BLOCK);
      frame.set([0x57, a >> 8, a & 0xFF, BLOCK]); frame.set(this._xor(data), 4);
      this.clear();
      await this._w(frame);
      // radio answers a single 0x06; tolerate an echoed header byte or two before it
      const got = [...(await this._r(1, a >= 0x8000 ? 10000 : 8000))];
      for (let i = 0; i < 4 && !got.includes(ACK); i++) {
        try { got.push(...(await this._r(1, 600))); } catch (e) { break; }
      }
      if (!got.includes(ACK)) throw new Error(`no ACK for block 0x${a.toString(16)} (got ${toHex(got)})`);
      if (a >= 0x8000) await sleep(50);
    }
    async end() { try { await this._w(new Uint8Array([0x45])); } catch (e) { /* link may drop */ } this.key = null; }
  }

  // ---------------------------------------------------------- high level ops
  async function session(link, opts, fn) {
    if (link.ensure) await link.ensure();
    const t = new Transport(link, opts);
    await t.handshake();
    try { return await fn(t); } finally { await t.end(); await sleep(300); }
  }
  async function readImage(link, opts, progress) {
    const total = (CH_LEN + ZN_LEN) / BLOCK; let done = 0;
    const tick = () => { done++; if (progress) progress(done, total); };
    return session(link, opts, async t => {
      const ch = await t.read(CH_ADDR, CH_LEN, tick);
      const zn = await t.read(ZN_ADDR, ZN_LEN, tick);
      return { ch, zn, model: t.model };
    });
  }
  async function writeBlocks(link, opts, blocks, progress) {
    return session(link, opts, async t => {
      for (let i = 0; i < blocks.length; i++) { await t.writeBlock(blocks[i].addr, blocks[i].data); if (progress) progress(i + 1, blocks.length); }
    });
  }
  async function verifyBlocks(link, opts, blocks, progress) {
    return session(link, opts, async t => {
      const bad = [];
      for (let i = 0; i < blocks.length; i++) {
        const got = await t.read(blocks[i].addr, BLOCK);
        if (!eq(got, blocks[i].data)) bad.push(blocks[i].addr);
        if (progress) progress(i + 1, blocks.length);
      }
      return bad;
    });
  }
  function backupJSON(image) {   // compatible with bj9000_upload.py backups
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
    return { name: `bj9000_backup_${ts}.json`, text: JSON.stringify({ tool: `bj9000_web ${VERSION}`, model: image.model, saved: ts, segments: { "0000": toHex(image.ch), "C000": toHex(image.zn) } }) };
  }
  function chunkedWriter(sendChunk) {
    return async (bytes, o) => {
      for (let i = 0; i < bytes.length; i += BLE.CHUNK) await sendChunk(bytes.slice(i, i + BLE.CHUNK), o || {});
    };
  }
  function webBluetoothLink(log) {
    const link = { device: null, ffe1: null, ff31: null, noRsp: true, onData: null };
    function onNotify(ev) { const v = ev.target.value; if (link.onData) link.onData(new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength))); }
    async function setup() {
      const server = await link.device.gatt.connect();
      const services = await server.getPrimaryServices();
      link.ffe1 = link.ff31 = null;
      for (const s of services) {
        for (const c of await s.getCharacteristics()) {
          if (c.uuid === BLE.FFE1) link.ffe1 = c;
          if (c.uuid === BLE.FF31) link.ff31 = c;
        }
      }
      if (!link.ffe1) throw new Error("radio's ffe1 data characteristic not found - is this the radio? (Services: " + services.map(s => s.uuid.slice(4, 8)).join(",") + ")");
      link.noRsp = !!link.ffe1.properties.writeWithoutResponse;
      // one listener per characteristic object, even across reconnects (else bytes arrive twice)
      link.ffe1.removeEventListener("characteristicvaluechanged", onNotify);
      link.ffe1.addEventListener("characteristicvaluechanged", onNotify);
      await link.ffe1.startNotifications();
      if (link.ff31) { await link.ff31.writeValueWithResponse(BLE.UNLOCK); await sleep(400); }
      else log("Warning: ff31 unlock characteristic not found; handshake may fail.");
      log(`Connected: ${link.device.name || "(no name)"}  write ${link.noRsp ? "without" : "with"} response`);
    }
    link.choose = async (acceptAll) => {
      const opts = acceptAll ? { acceptAllDevices: true, optionalServices: BLE.OPTIONAL_SERVICES }
        : { filters: [{ services: [0xffe0] }, { namePrefix: "RT" }, { namePrefix: "BJ" }, { namePrefix: "BT" }], optionalServices: BLE.OPTIONAL_SERVICES };
      link.device = await navigator.bluetooth.requestDevice(opts);
      link.device.addEventListener("gattserverdisconnected", () => log("Bluetooth link dropped (will reconnect when needed)."));
      for (let i = 1; i <= 3; i++) {
        try { await setup(); return; } catch (e) { log(`connect attempt ${i} failed: ${e.message}`); if (i === 3) throw e; await sleep(1000); }
      }
    };
    link.ensure = async () => {
      if (!link.device) throw new Error("not connected - tap Connect first");
      if (link.device.gatt.connected && link.ffe1) return;
      for (let i = 1; i <= 12; i++) {
        try { await setup(); return; } catch (e) { log(`reconnect ${i}/12: ${e.message}`); await sleep(2000); }
      }
      throw new Error("could not reconnect to the radio");
    };
    link.write = chunkedWriter(async (part, o) => {
      if (!link.device || !link.device.gatt.connected) throw new Error("Bluetooth link is down");
      if (link.noRsp && !o.withResponse) await link.ffe1.writeValueWithoutResponse(part);
      else await link.ffe1.writeValueWithResponse(part);
    });
    link.disconnect = () => { try { link.device && link.device.gatt.disconnect(); } catch (e) { } };
    return link;
  }


export { LAYOUTS, EMPTY_REC, DCS_CODES, CH_LEN, ZN_LEN, ZN_ADDR, LOW_LIMIT, REC, BLOCK, eq, hex, toHex, encFreq, decFreq, encCtcss, encDcs, encName, zoneNames, buildRecord, parseCSV, zoneFromFilename, planWrites, readImage, writeBlocks, verifyBlocks, webBluetoothLink, backupJSON };
