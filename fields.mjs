let functionOptions,editorOptions,onChange;
export function configureFields(f,e,changed){functionOptions=f;editorOptions=e;onChange=changed;}
export const isFrequencyField=k=>['rxFreq','txFreq','vfoAFreq','vfoBFreq'].includes(k);
// Add only missing decimal zeros. Never round, truncate, or invent a frequency.
export function padFrequency(value){
 const trimmed=value.trim();if(!trimmed)return '';
 const match=/^(\d{3})(?:\.(\d{0,5}))?$/.exec(trimmed);
 return match?`${match[1]}.${(match[2]||'').padEnd(5,'0')}`:value;
}
const labels={sql:'Squelch',saveMode:'Battery saving',voxSw:'Voice-activated transmit',vox:'VOX sensitivity',voxDlyTime:'VOX release delay',dualStandby:'Dual watch',tot:'Transmit time limit',beep:'Keypad beep',sideTone:'DTMF sound in speaker',scanMode:'Scan resume behavior',pttDly:'PTT ID delay',chADisType:'Upper display mode',chBDisType:'Lower display mode',autoLock:'Automatic keypad lock',voice:'Spoken prompts',alarmMode:'Alarm mode',alarmTone:'Alarm sound',tailClear:'Squelch tail suppression',rptTailClear:'Repeater tail suppression',rptTailDet:'Repeater tail delay',roger:'End-of-transmission beep',fmEnable:'FM broadcast receiver',chAWorkmode:'Upper channel/frequency mode',chBWorkmode:'Lower channel/frequency mode',keyLock:'Keypad lock',powerOnDisType:'Startup display',tone:'Repeater access tone',backlight:'Screen backlight',menuQuitTime:'Menu exit delay',language:'Prompt language',rstMenu:'Reset menu',totAlarm:'Transmit timeout warning',ctsDcsScanType:'Tone scan mode',key2Short:'Side-key short press',rxFreq:'Receive frequency (MHz)',txFreq:'Transmit frequency (MHz)',name:'Channel name',strRxCtsDcs:'Receive tone',strTxCtsDcs:'Transmit tone',busyLock:'Busy-channel transmit lock',txPower:'Transmit power',bandwide:'Channel bandwidth',scanAdd:'Include in scan',sqMode:'Squelch mode',pttid:'PTT identification',signalGroup:'DTMF group',fhss:'Frequency hopping',localID:'Own DTMF ID',wordTime:'DTMF tone duration',idleTime:'DTMF pause duration',hangUp:'DTMF call hold time',separator:'DTMF separator',groupCall:'DTMF group-call code',onlineCode:'Transmit-start DTMF code',offlineCode:'Transmit-end DTMF code'};
const tips={sql:'Keeps the speaker quiet until a signal is strong enough to open it.',dualStandby:'Checks both selected channels for activity. This is not two independent receivers.',voxSw:'Lets your voice start a transmission without holding PTT.',vox:'Sets how easily your voice starts a VOX transmission.',tot:'Limits how long one continuous transmission may last.',rxFreq:'Frequency this channel listens to, in MHz.',txFreq:'Frequency this channel transmits on, in MHz. Preserve a blank value if transmit is disabled.',strRxCtsDcs:'Only opens the speaker for signals with this tone. OFF means no tone filtering.',strTxCtsDcs:'Tone sent with your transmission, often needed to access a repeater.',scanAdd:'Controls whether scanning includes this channel.',busyLock:'Can prevent transmitting while the channel is already busy.',name:'Label shown for this channel when the radio is in name display mode.',beep:'Sound made when you press a key.',roger:'Short sound sent at the end of a transmission.',localID:'DTMF digits used to identify your radio.'};
function title(k){return labels[k]||k.replace(/^vfo([AB])/,'VFO $1 ').replace(/([a-z])([A-Z])/g,'$1 $2');}
Object.assign(labels,{chADisType:'Upper (A) display mode',chBDisType:'Lower (B) display mode',chAWorkmode:'Upper (A) channel/frequency mode',chBWorkmode:'Lower (B) channel/frequency mode'});
Object.assign(tips,{
 saveMode:'Reduces battery use while the radio is waiting for a signal.',
 voxDlyTime:'How long the radio keeps transmitting after you stop speaking when VOX is on.',
 sideTone:'Chooses which keypad or identification tones you hear through your own speaker.',
 scanMode:'Chooses whether scanning resumes after a pause, waits until the signal ends, or stops on a signal.',
 pttDly:'Delay before sending the PTT identification code. CPS supplies the available times.',
 chADisType:'Chooses whether the upper channel display shows its name, frequency, or channel number.',
 chBDisType:'Chooses whether the lower channel display shows its name, frequency, or channel number.',
 autoLock:'Automatically locks the keypad to help prevent accidental button presses.',
 voice:'Turns the spoken operating prompts on or off.',
 alarmMode:'Chooses a local alarm or an alarm sent over the air. Transmit options can occupy the selected channel.',
 alarmTone:'Turns the local alarm sound on or off.',
 tailClear:'Helps reduce the short burst of noise heard when a transmission ends.',
 rptTailClear:'Sets the repeater tail-noise suppression time. The useful value depends on the repeater.',
 rptTailDet:'Sets the repeater tail-detection delay. Leave the existing value if you do not know the repeater requirements.',
 fmEnable:'Allows or disables the FM broadcast receiver. This does not change the modulation of your two-way channels.',
 chAWorkmode:'Chooses direct frequency operation or saved channels for the upper display.',
 chBWorkmode:'Chooses direct frequency operation or saved channels for the lower display.',
 keyLock:'Sets whether the keypad is locked against accidental changes.',
 powerOnDisType:'Chooses what appears when the radio starts: its logo or battery voltage.',
 tone:'Selects the audio tone burst used to access repeaters that require one. This is separate from CTCSS and DCS.',
 backlight:'How long the screen light remains on after use, or whether it stays on.',
 menuQuitTime:'How long the radio waits before leaving the menu automatically.',
 language:'Chooses the language of the spoken prompts.',
 rstMenu:'Allows or disables access to the reset option in the radio menu.',
 totAlarm:'Sets the warning time before the continuous-transmit timer expires.',
 ctsDcsScanType:'Chooses the CPS tone-scan target: all, receive, or transmit. Exact firmware behavior has not been verified.',
 key2Short:'Chooses what a short press of the configurable side key does. Alarm may transmit, depending on the alarm mode.'
});
// NUL suffixes are radio padding, not part of the visible name. Preserve them in
// the data model unless the user actually changes the visible name.
function visibleName(raw){return raw.replace(/\u0000+$/u,'');}
function visibleTone(raw){return raw==='OFF'?'Off':/^\d+\.\d+$/.test(raw)?`${raw} Hz`:raw||'—';}
Object.assign(tips,{txPower:'Sets transmitter output to High or Low. Use the lower level when it provides a reliable connection.',bandwide:'Chooses wide or narrow FM channel bandwidth. Match the other radios or repeater.',sqMode:'Enables the CPS channel squelch-mode option. Its interaction with DTMF has not yet been verified on this firmware.',pttid:'Chooses when the radio sends its DTMF identification code: at the start, end, both, or neither.',signalGroup:'Selects one of the 20 DTMF groups configured on the DTMF page.',fhss:'Enables the CPS frequency-hopping option. Do not enable it for normal repeater use; matching-radio behavior is not verified.',wordTime:'How long each DTMF tone sounds.',idleTime:'Pause between successive DTMF tones.',hangUp:'How long the DTMF call remains active after signaling.',separator:'DTMF character used to separate parts of a signaling sequence.',groupCall:'DTMF character used for group calling, or Off.',onlineCode:'DTMF digits sent by the transmit-start identification function.',offlineCode:'DTMF digits sent by the transmit-end identification function.'});
for(const side of ['A','B']){
 const prefix=`vfo${side}`,display=side==='A'?'Upper (A)':'Lower (B)';
 for(const [suffix,label,help] of [
 ['Freq','frequency (MHz)','Frequency listened to in frequency mode.'],['Offset','offset (MHz)','Difference between receive and transmit frequencies; direction is set separately.'],['Dir','offset direction','Off transmits on the receive frequency; Plus adds the offset; Minus subtracts it.'],['Step','tuning step','Amount the frequency changes for each tuning step.'],['SignalGroup','DTMF group',tips.signalGroup],['TxPower','transmit power',tips.txPower],['Bandwide','bandwidth',tips.bandwide],['SQMode','squelch signaling','CPS signaling mode: QT/DQT means CTCSS/DCS tones. The exact AND/OR meaning of the DTMF combinations still needs firmware verification.'],['Fhss','frequency hopping',tips.fhss]]){labels[prefix+suffix]=`${display} ${label}`;tips[prefix+suffix]=help;}
 for(const t of ['Rx','Tx']){labels[`strVFO${side}${t}CtsDcs`]=`${display} ${t==='Rx'?'receive':'transmit'} tone`;tips[`strVFO${side}${t}CtsDcs`]=tips[t==='Rx'?'strRxCtsDcs':'strTxCtsDcs'];}
}
labels.vfopttid='VFO PTT identification';tips.vfopttid=tips.pttid;
for(const k of ['vfoABusylock','vfoBBusyLock'])tips[k]='Saved per-VFO busy-lock field. CPS does not expose a verified control for this field here, so this preview preserves it read-only.';
labels.vfoScanRang_L='Scan lower limit (MHz)';labels.vfoScanRang_H='Scan upper limit (MHz)';
tips.vfoScanRang_L='Lowest frequency used by the frequency-scan range.';tips.vfoScanRang_H='Highest frequency used by the frequency-scan range.';
function editedName(original,visible){return visible===visibleName(original)?original:visible;}
function field(o,k){
 const label=document.createElement('label'),text=document.createElement('span');text.textContent=title(k);label.append(text);
 const original=o[k],choices=o.$type==='KDH.Function'?functionOptions[k]:editorOptions[o.$type]?.[k],input=document.createElement(choices?'select':'input');
 if(choices){const list=choices.some(([v])=>v===original)?choices:[[original,`Unrecognized saved value (${original}) — preserved`],...choices];for(const [value,label] of list){const option=document.createElement('option');option.value=String(value);option.textContent=label;input.append(option);}}
 input.value=k==='name'?visibleName(original):String(original);
 input.dataset.originalValue=String(original);
 input.dataset.key=k;if(!choices)input.type=typeof original==='number'?'number':'text';
 if(['vfoABusylock','vfoBBusyLock'].includes(k))input.readOnly=true;
 if(k==='name')input.placeholder='Unnamed';
 if(input.type==='number'){input.step='1';input.min='0';input.max='255';}
 const help=(tips[k]||'')+(!choices&&typeof original==='number'?' Stored CPS option code; friendly option labels are not verified yet.':'');input.title=help;label.title=help;input.setAttribute('aria-description',help);
 const update=()=>{if(!input.checkValidity())return;const v=k==='name'?editedName(original,input.value):typeof original==='number'?Number(input.value):input.value;if(choices&&v!==original&&!choices.some(([n])=>n===v)){input.value=String(o[k]);return;}if(o[k]!==v){o[k]=v;onChange();}};
 input.addEventListener('input',update);input.addEventListener('change',update);
 if(isFrequencyField(k)){
  input.inputMode='decimal';
  const finish=()=>{if(input.value!==String(original)){input.value=padFrequency(input.value);update();}};
  input.addEventListener('blur',finish);input.addEventListener('change',finish);
 }
 label.append(input);return label;
}
function form(o,target){for(const k of Object.keys(o))if(k!=='$type'&&k!=='id'&&!Array.isArray(o[k]))target.append(field(o,k));}
function optionalForm(o,target){
 // Column order matches the user's installed CPS Optional Features window.
 const groups=[
  ['sql','tot','saveMode','totAlarm','dualStandby','tone','sideTone','tailClear','powerOnDisType','beep','roger','voice'],
  ['language','scanMode','alarmMode','alarmTone','keyLock','fmEnable','autoLock','menuQuitTime','backlight','pttDly','ctsDcsScanType','key2Short'],
  ['chADisType','chAWorkmode','chBDisType','chBWorkmode','rptTailClear','rptTailDet','rstMenu','voxSw','vox','voxDlyTime']
 ];
 const columns=document.createElement('div');columns.className='optional-columns';
 for(const keys of groups){const column=document.createElement('div');column.className='optional-column';for(const k of keys)column.append(field(o,k));columns.append(column);}
 target.append(columns);
}
function vfoForm(o,target){
 const columns=document.createElement('div');columns.className='vfo-columns';
 const used=new Set();
 for(const side of ['A','B']){
  const section=document.createElement('section');section.className='vfo-column';section.dataset.side=side;
  const heading=document.createElement('h2');heading.textContent=`VFO ${side} — ${side==='A'?'upper':'lower'} display`;section.append(heading);
  const fields=document.createElement('div');fields.className='vfo-fields';
  for(const key of Object.keys(o))if(key.startsWith(`vfo${side}`)||key.startsWith(`strVFO${side}`)){fields.append(field(o,key));used.add(key);}
  section.append(fields);columns.append(section);
 }
 target.append(columns);
 const shared=document.createElement('section');shared.className='vfo-shared';const heading=document.createElement('h2');heading.textContent='Shared VFO settings';shared.append(heading);
 const fields=document.createElement('div');fields.className='grid';for(const key of Object.keys(o))if(key!=='$type'&&!used.has(key))fields.append(field(o,key));shared.append(fields);target.append(shared);
}

export {form,optionalForm,vfoForm,visibleName,visibleTone,editedName};
