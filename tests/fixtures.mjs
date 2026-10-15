import {readFileSync} from 'node:fs';
import {blankData,emptyChannel} from '../channels.mjs';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
export const schemas=json('schemas.json'),defaults=json('defaults.json'),charset=json('name-charset.json'),options={'KDH.Function':json('function-options.json'),...json('editor-options.json')};
export const channel=(name='TEST',rx='146.52000')=>({...emptyChannel(),rxFreq:rx,txFreq:rx,name});
export function fixture(){const d=blankData(defaults);d.channelList[0][0]=channel('TEST A\u0000');d.channelList[0][2]=channel('测试','446.00000');return d;}
