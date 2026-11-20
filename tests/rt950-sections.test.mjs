import test from 'node:test';
import assert from 'node:assert/strict';
import {sections, planWrites, blockBefore, EMPTY_REC} from '../scripts/rt950-core.mjs';
import {blankImage, editRecord, fullChannel, record, exportZoneCsv, openBackup, overlayChanges, saveBackup} from '../scripts/rt950-channels.mjs';
import {settings,vfos,dtmfGroups,receiver,stationRows,aprs,getValue,editField,validateSettings} from '../scripts/rt950-sections.mjs';

const factoryImage=()=>{
 const image=blankImage();
 for(const r of sections)image[r.key]=new Uint8Array(r.length);
 return image;
};
const named=(fields,key)=>{const f=fields.find(f=>f.key===key);assert.ok(f,key);return f;};

test('CPS option order, timers and independent A/B/C work modes',()=>{
 const original=factoryImage();original.settings[26]=0xa4;original.settings[25]=0xd0;
 const fm=named(settings,'FMRadio'),mode=named(settings,'WorkModeB');
 assert.deepEqual(fm.options,['On','Off']);
 const edited=editField(editField(original,fm,'1'),mode,'0');
 assert.equal(edited.settings[26],0xa0);assert.equal(edited.settings[25],0xd1);
 assert.equal(original.settings[26],0xa4);assert.equal(original.settings[25],0xd0);
 assert.equal(named(settings,'MenuExitTime').options[10],'60sec');
 assert.equal(named(settings,'Key9L').options[22],'BT Write Freq');
 const future=editField(edited,named(settings,'scanHigh'),'470');
 assert.throws(()=>validateSettings(future,original));
 validateSettings(editField(future,named(settings,'scanLow'),'400'),original);
 assert.throws(()=>editField(original,mode,'7'));
});

test('VFO uses decimal digits, keeps RX/TX tones independent and derives the band',()=>{
 const image=factoryImage(),fields=vfos[2];image.vfo.fill(0x90);
 const set=(i,k,v)=>editField(i,named(fields,k),v);
 let edit=set(image,'rx','146.52000');edit=set(edit,'offset','0.6000');edit=set(edit,'rxTone','D023I');edit=set(edit,'txTone','100.0');
 assert.deepEqual([...edit.vfo.slice(64,72)],[1,4,6,5,2,0,0,0]);
 assert.deepEqual([...edit.vfo.slice(84,91)],[0,0,0,6,0,0,0]);
 assert.equal(edit.vfo[82],0x90);assert.equal(set(edit,'rx','433.10000').vfo[82],0x91);
 assert.equal(getValue(edit.vfo,named(fields,'rxTone')),'D023I');assert.equal(getValue(edit.vfo,named(fields,'txTone')),'100.0');
 assert.throws(()=>set(image,'rx','146.520001'));
});

test('all 15 DTMF groups and the broadcast receiver use their factory encodings',()=>{
 const radio=factoryImage();
 const codes=editField(radio,dtmfGroups[14],'A*#123');
 assert.deepEqual([...codes.dtmf.slice(256,262)],[10,14,15,1,2,3]);assert.equal(codes.dtmf[262],0);
 assert.throws(()=>editField(radio,dtmfGroups[1],'1234567'));
 const [fm]=stationRows.FM[15],[am]=stationRows.AM[1],[ssb,bw,beat,label]=stationRows.SSB[15];
 let edit=editField(codes,fm,'98.75');edit=editField(edit,am,'153');edit=editField(edit,ssb,'14200');
 edit=editField(edit,bw,'0');edit=editField(edit,beat,'-123');edit=editField(edit,label,'电台');
 assert.deepEqual([...edit.receiver.slice(30,32)],[0x93,0x26]);assert.equal(edit.receiver[36],153);
 assert.deepEqual([...edit.receiver.slice(144,149)],[0x78,0x37,0,0x85,0xff]);
 assert.equal(getValue(edit.names,label),'电台');assert.equal(edit.names[512+15*16+12],0);
 assert.equal(getValue(edit.receiver,beat),'-123');assert.throws(()=>editField(edit,am,'400'));
 assert.equal(receiver.find(f=>f.key==='AMRxGain').options[36],'-35dB');
});

test('APRS uses its separate address zero and transfers after regular blocks',()=>{
 const radio=factoryImage();
 let target=editField(radio,named(aprs,'call'),'k4rjm');target=editField(target,named(aprs,'LongitudeDir'),'W');
 target=editField(target,named(aprs,'altitude'),'-1');target=editField(target,named(aprs,'DataTxDelay'),'7');
 target=editField(target,settings[0],'2');
 const ch=target.ch.slice();ch.set(editRecord(EMPTY_REC,{rx:'146.52000',power:'High'}));target={...target,ch};
 const writes=planWrites(radio,target,'990',true);
 assert.deepEqual(writes.map(b=>[b.addr,b.write??0x57]),[[0,0x57],[0x9000,0x57],[0,0x58]]);
 assert.equal(writes[2].read,0x54);assert.deepEqual(blockBefore(radio,writes[2]).data,radio.aprs);
 assert.equal(target.aprs[30],7);assert.equal(target.aprs[11],87);
 assert.equal(getValue(target.aprs,named(aprs,'altitude')),'-1');
 assert.equal(new TextDecoder().decode(target.aprs.slice(17,22)),'K4RJM');
 assert(!planWrites(target,target,'990',true,true).some(b=>b.region));
});

test('six-section workspaces and channel-only backups preserve destination-only bytes',()=>{
 const original=factoryImage(),fresh=factoryImage();fresh.settings[26]=0x24;fresh.settings[127]=0x17;fresh.aprs[127]=44;
 const target=editField(original,named(settings,'WorkModeA'),'1');
 const staged=overlayChanges(fresh,original,target,'990');
 assert.equal(staged.settings[26],0x25);assert.equal(staged.settings[127],0x17);
 assert.deepEqual(openBackup(saveBackup(staged,'990'),'960').image,staged);
 const legacy=openBackup(saveBackup(blankImage(),'990'),'960').image;
 assert.deepEqual(overlayChanges(fresh,fresh,legacy,'990').aprs,fresh.aprs);
 const bad=JSON.parse(saveBackup(target,'990'));bad.segments.APRS='00';
 assert.throws(()=>openBackup(JSON.stringify(bad),'990'));
 const saved=editField(fresh,named(settings,'BeepPrompt'),'1');
 assert.deepEqual(blockBefore(fresh,planWrites(fresh,saved,'990',true)[0]).data,fresh.settings);
});

test('extended channel fields compose without overwriting power, and CHIRP CSV exports the selected scope',()=>{
 const radio=blankImage();
 const row=editRecord(EMPTY_REC,{rx:'146.52000',tx:'146.52000',name:'LOCAL',power:'Low',scramble:'Scramble 7',fhss:'123ABC',rxMode:'AM',bandwidth:'Narrow',lock:'On',signal:'15'});
 assert.equal(row[14],0x72);assert.equal(fullChannel(row).fhss,'123ABC');assert.equal(fullChannel(row).rxMode,'AM');
 assert.equal(editRecord(row,{power:'High'})[14],0x70);
 record(radio,'990',99).set(row);assert.match(exportZoneCsv(radio,'990',2),/"1","LOCAL"/);assert.match(exportZoneCsv(radio,'990',null),/"100","LOCAL"/);
 assert.doesNotMatch(exportZoneCsv(radio,'990',1),/LOCAL/);
});
