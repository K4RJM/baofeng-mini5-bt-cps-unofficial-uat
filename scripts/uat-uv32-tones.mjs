import {DCS} from './uv32-codec.mjs';

const ctcss='62.5 67.0 69.3 71.9 74.4 77.0 79.7 82.5 85.4 88.5 91.5 94.8 97.4 100.0 103.5 107.2 110.9 114.8 118.8 123.0 127.3 131.8 136.5 141.3 146.2 151.4 156.7 159.8 162.2 165.5 167.9 171.3 173.8 177.3 179.9 183.5 186.2 189.9 192.8 196.6 199.5 203.5 206.5 210.7 218.1 225.7 229.1 233.6 241.8 250.3 254.1'.split(' ');
const dcs=suffix=>DCS.map(code=>`D${String(code).padStart(3,'0')}${suffix}`);

export const UV32_TONE_GROUPS=[
 ['Off',['Off']],
 ['CTCSS',ctcss],
 ['DCS Normal',dcs('N')],
 ['DCS Reverse',dcs('R')],
];
export const UV32_TONES=UV32_TONE_GROUPS.flatMap(([,values])=>values);

export function addUv32ToneOptions(select,value){
 if(!UV32_TONES.includes(String(value))){const item=select.ownerDocument.createElement('option');item.value=String(value);item.textContent=`Saved: ${value}`;select.append(item);}
 for(const [label,values] of UV32_TONE_GROUPS){const group=select.ownerDocument.createElement('optgroup');group.label=label;for(const tone of values){const item=select.ownerDocument.createElement('option');item.value=tone;item.textContent=tone;group.append(item);}select.append(group);}
 select.value=String(value);
}
