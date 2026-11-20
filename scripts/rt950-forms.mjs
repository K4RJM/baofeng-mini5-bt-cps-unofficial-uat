import {settings,vfos,dtmf,dtmfGroups,receiver,stationRows,aprs,getValue,editField} from './rt950-sections.mjs';

const optionalGroups=[
 ['Radio','SQL SaveMode TDR TOT Scan RTone TailNoiseClear PassRepetNoiseClear PassRepetNoiseDetect SoundTxEnd RadioRxInterruption FMRadio ABUVTransfer SoundTransfer'],
 ['Display and controls','AutoBacklight RadioBacklight BreathingLight DisplayModeA DisplayModeB DisplayModeC Language VoicePrompt BeepPrompt PowerMsg PowerOnDelayTime MenuExitTime AutoKeyLock LockKeyBoard BTWriteSwitch'],
 ['Work modes and scanning','CurWorkMode WorkModeA WorkModeB WorkModeC CurWorkZoneA CurWorkZoneB CurWorkZoneC DivideCH scanLow scanHigh WeatherCH NoaaAlarm SubaudioScanSave'],
 ['Voice and signalling','VOXSwitch VOX VoxDelay AlarmMode AlarmSound DTMF PTTID SendIDDelay'],
 ['Programmable keys','KeySide1 KeySide1L KeySide2 KeySide2L Key0L Key1L Key2L Key3L Key4L Key5L Key6L Key7L Key8L Key9L']
];
const aprsGroups=[
 ['Station and beacon','AprsSwitch GpsSwitch call SSID AprsWorkingCH AprsPriority RadioSymbol UserDefinedIcon BeaconTxType TimedBeaconTime DataTxDelay MicEType SendCustomMessages message'],
 ['Position and units','SiteType LatitudeDegrees LatitudeMinutes LatitudeSeconds LatitudeDir LongitudeDegrees LongitudeMinutes LongitudeSeconds LongitudeDir altitude LatitudeLongitudeUnit SpeedUnit DistanceUnit AltitudeUnit TimeZone'],
 ['Routing and reporting','RoutingSelect path1 CustomRoutingOneSSID path2 CustomRoutingTwoSSID AprsForwardChannel AprsForwardRouting AprsWaitForward TncDataType AprsCHMute AprsDecodePromptTone AprsRxAutoPopUp AprsTxDataReporting BeaconPopUpTime']
];
export function renderSection(card,screen,{el,field,button,image,update,undo,canUndo,note,layout}){
 const panel=el('div',undefined,'rt950-panels');card.append(panel);
 const controls=new Map();
 function input(f,context=''){
  const bytes=image()[f.region],raw=getValue(bytes,f);
  const control=el(f.options?'select':'input');
  control.dataset.field=f.key;
  if(f.options){
   const list=(/^CurWorkZone/.test(f.key)&&layout==='990')?f.options.slice(0,10):f.options;
   list.forEach((label,i)=>control.add(new Option(label,f.type==='letter'?label:String(i))));
   if(!bytes||raw===''||![...control.options].some(o=>o.value===raw)){
    const opt=new Option(!bytes?'Read radio':raw===''?'Unset':'Radio value '+raw,raw);
    opt.disabled=true;control.add(opt,0);
   }
  }else if(f.type==='number'||f.type==='digits'){
   control.type='number';control.min=f.min;control.max=f.max;control.step=f.decimals?10**(-f.decimals):1/(f.scale||1);
  }else {
   control.type='text';if(f.type!=='tone')control.maxLength=f.length;
   if(f.type==='tone')control.title='Off, CTCSS in Hz, or DCS such as D023N';
  }
  if(f.key==='OffsetDir')control.title='Plus puts transmit above receive by the offset. Minus puts transmit below receive.';
  control.value=bytes?raw:'';control.disabled=!bytes||!!f.readonly;
  control.setAttribute('aria-label',[context,f.label].filter(Boolean).join(' '));controls.set(f,control);
  control.onchange=()=>{
   try{
    const next=editField(image(),f,control.value);
    update(next,f.label+' updated in the workspace.');
    control.value=getValue(next[f.region],f);
    if(f.region==='vfo'&&f.key==='rx'){
     const band=vfos[f.offset/32].find(item=>item.key==='FreqBand');
     controls.get(band).value=getValue(next.vfo,band);
    }
    undoButton.disabled=!canUndo();
   }catch(error){control.value=getValue(image()[f.region],f);note(error.message);}
  };
  return control;
 }
 function group(title,fields,context=title){
  const section=el('section',undefined,'rt950-group'),heading=el('h3',title),grid=el('div',undefined,'rt950-form-grid');
  for(const f of fields){
   const control=input(f,context),label=field(f.label,control);control.setAttribute('aria-label',context+' '+f.label);grid.append(label);
  }
  section.append(heading,grid);panel.append(section);
 }
 function grouped(fields,groups){
  for(const [title,keys] of groups)group(title,keys.split(' ').map(k=>fields.find(f=>f.key===k)));
 }
 const required={'Optional Features':'settings','VFO A / B / C':'vfo','DTMF':'dtmf','FM / AM / SSB':'receiver','APRS':'aprs'}[screen];
 if(!image()[required])card.prepend(el('p','Read Bluetooth or open a workspace saved with these settings to edit the values.'));
 if(screen==='Optional Features')grouped(settings,optionalGroups);
 if(screen==='VFO A / B / C')vfos.forEach((rows,i)=>group('VFO '+['A','B','C'][i],rows));
 if(screen==='DTMF'){group('DTMF signalling',dtmf);group('Group codes',dtmfGroups);}
 if(screen==='APRS')grouped(aprs,aprsGroups);
 if(screen==='FM / AM / SSB'){
  for(const [band,rows] of Object.entries(stationRows)){
   const box=el('section',undefined,'rt950-group'),table=el('table',undefined,'rt950-stations');
   const head=table.createTHead().insertRow();
   for(const h of ['CH',...rows[1].map(f=>f.label)])head.append(el('th',h));
   const body=table.createTBody();
   rows.forEach((fields,i)=>{
    const tr=body.insertRow();tr.append(el('th',i?String(i):'Current'));
    for(const f of fields)tr.insertCell().append(input(f,band+' '+(i?'channel '+i:'current')));
    while(tr.cells.length<head.cells.length)tr.insertCell();
   });
   box.append(el('h3',band),table);panel.append(box);
  }
  group('Receiver settings',receiver);
 }
 const undoButton=button('Undo',undo);undoButton.disabled=!canUndo();
 card.append(undoButton);
}
