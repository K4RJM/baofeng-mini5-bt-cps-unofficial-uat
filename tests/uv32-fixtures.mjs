// Two public UV-17ProGPS records from CHIRP's fixture at
// 19b5359693d37204e21ad11ce4e5613614de3886 (same parent layout as UV-32).
// This is not a physical UV-32 capture. Source/credit: docs/UV32-READ.md.
export const bytes=h=>Uint8Array.from(h.match(/../g)??[],v=>parseInt(v,16));
export const plain=bytes('00500616005060150000000000000000ffffffff5648462031ffffffffffffff00000716000061150000000000000100ffffffff5648462032ffffffffffffff');
export const wire=bytes('001f0621001f60220000000000000000ffffffff1507461772ffffffffffffff00000721000061220000000000000100ffffffff1507461771ffffffffffffff');
export function uv32Fixture(){const raw=new Uint8Array(33344).fill(255);raw.set(wire,0);raw.set(wire.slice(0,32),999*32);return raw;}
