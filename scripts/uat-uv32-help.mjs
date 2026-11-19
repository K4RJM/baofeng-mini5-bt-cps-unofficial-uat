// UV-32 button guide checked against the supplied Baofeng UV-32 user manual.
const manual='https://baofeng.s3.amazonaws.com/Baofeng_UV-32_User_Manual_20250210.pdf';
const instructions={
 power:{name:'Power / Volume',turn:'Turn clockwise until the knob clicks to switch on; continue turning to raise volume. Turn counterclockwise to lower volume or switch off.'},
 encoder:{name:'Channel selector',turn:'Turn the top encoder to select another stored channel in channel mode.'},
 ptt:{name:'PTT',hold:'Hold while speaking to transmit on the selected channel or frequency. Release to receive.'},
 sk1:{name:'Side key SK1',short:'Choose Optional settings → Skey1 Short. This is the only UV-32 side-key action identified as customizable in the manufacturer manual.',shortOptions:[
  ['FM broadcast radio','Turn broadcast FM reception on or off.'],
  ['Channel scan','Start or stop scanning saved channels or VFO frequencies. Scan resume settings apply.'],
  ['Frequency search','Detect a nearby transmitting frequency and attempt to identify its CTCSS or DCS tone.'],
  ['VOX','Turn voice-triggered transmission on or off. VOX sensitivity and release delay are separate settings.']
 ],hold:'Hold about three seconds to sound the emergency alarm and flash the light. Press SK1 again to exit.',combo:'Hold PTT and press SK1 to send the repeater access tone set by Pilot Tone.'},
 sk2:{name:'Side key SK2',short:'Start the UV-32 sweep function. This action is fixed; the manufacturer manual does not identify SK2 as programmable.',hold:'Hold to monitor the frequency by opening the squelch. This lets you hear weak signals or signals with a mismatched receive tone. Noise is normal when no signal is present; release SK2 to resume normal reception.'},
 menu:{name:'MENU / OK',short:'Open the menu, select the highlighted item, or confirm a value. In broadcast FM, switch between the 65–75 MHz and 76–108 MHz bands.',hold:'In standby, switch between direct frequency entry (VFO) and stored channels (MR).'},
 home:{name:'EXIT / Back',short:'Leave the current menu or function.',hold:'Start frequency sweep to search a range for a nearby transmitter.'},
 up:{name:'Up',short:'Move to the next stored channel, raise a VFO frequency by one tuning step, or move up one menu choice. During scanning, set the direction upward.',hold:'Hold more than two seconds to move rapidly upward through channels or frequencies.'},
 down:{name:'Down',short:'Move to the previous stored channel, lower a VFO frequency by one tuning step, or move down one menu choice. During scanning, set the direction downward.',hold:'Hold more than two seconds to move rapidly downward through channels or frequencies.'},
 p1:{name:'P1',short:'Open the GPS position text screen (“My Place”) to view, share, or request location information.',hold:'No separate P1 long-press function or programmable choices are documented in the UV-32 manual or exposed by the UV32PRO stock CPS.'},
 p2:{name:'P2',short:'Open the GPS position coordinates screen. Position information requires GPS to be enabled and a location fix.',hold:'No separate P2 long-press function or programmable choices are documented in the UV-32 manual or exposed by the UV32PRO stock CPS.'},
 star:{name:'* / Lock',short:'With different receive and transmit frequencies, press once for Reverse, which swaps them so you can hear the repeater input. Press again for Talkaround, which transmits on the receive frequency. Press again for normal operation.',hold:'Hold about two seconds to lock or unlock the keypad. Side keys remain available.'},
 zero:{name:'0 / Weather',short:'Enter 0 during frequency, channel, or menu entry.',hold:'Open NOAA weather reception on supported North American weather channels.'},
 hash:{name:'# / Scan',short:'In broadcast FM, search for the next active station. During one-touch frequency Search, switch between VHF and UHF search bands.',hold:'Hold about two seconds to start or stop scanning. VFO scanning follows the tuning step; MR scanning uses stored channels.'}
};
const numeric=['1','2','3','4','5','6','7','8','9'];
for(const digit of numeric)instructions[digit]={name:digit,short:'Enter '+digit+' as part of a VFO frequency, stored channel number, or numbered menu choice.'};
// Coordinates use the supplied 633 × 1254 blue radio image. Both
// views share this geometry. The four middle actions share one physical rocker.
function keyFace(x,y,w,h,leftRadius,rightRadius){
 const l=leftRadius,r=rightRadius;
 return `M ${x+l} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+l} Q ${x} ${y+h} ${x} ${y+h-l} V ${y+l} Q ${x} ${y} ${x+l} ${y} Z`;
}
const faces={
 encoder:'M268 45 Q269 29 305 28 Q343 29 348 44 L352 160 H265 Z',
 power:'M407 127 Q412 109 463 118 Q513 126 516 143 L507 195 L398 172 Z',
 menu:keyFace(183,639,49,108,20,3),home:keyFace(392,639,48,108,3,20),
 up:'M249 639 H374 L332 675 H290 Z',down:'M290 712 H332 L374 747 H249 Z',
 p1:'M248 643 L288 677 H311 V710 H288 L248 743 Z',
 p2:'M375 643 V743 L334 710 H313 V677 H334 Z'
};
for(const [row,keys] of [['1','2','3'],['4','5','6'],['7','8','9'],['star','zero','hash']].entries()){
 for(const [column,key] of keys.entries()){
  faces[key]=keyFace([181,273,366][column],[778,833,887,942][row],76,39,column===0?19:3,column===2?19:3);
 }
}
const svgNode=(d,tag,attributes)=>{
 const node=d.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [name,value] of Object.entries(attributes))node.setAttribute(name,value);
 return node;
};
const el=(d,tag,cls,text)=>{const node=d.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export function renderUv32Help(d,target){
 const workspace=el(d,'div','help-workspace uv32-help-workspace');
 const host=el(d,'div','help-tutorial-host'),card=el(d,'section','card radio-tutorial-card');
 const heading=el(d,'div','uv32-tutorial-head');card.append(heading);
 heading.append(el(d,'h3','', 'Radio button tutorials'),el(d,'p','muted','Hover, focus or tap a button for its instructions.'));
 const zoom=el(d,'button','uv32-keypad-zoom','Zoom into keypad');zoom.type='button';zoom.setAttribute('aria-pressed','false');heading.append(zoom);
 const layout=el(d,'div','radio-tutorial-layout'),drawing=el(d,'div','radio-drawing uv32-radio-drawing');
 drawing.setAttribute('role','group');drawing.setAttribute('aria-label','UV-32 radio graphic with button tutorials');
 const sideKeys=svgNode(d,'g',{class:'uv32-side-keys'}),photo=svgNode(d,'svg',{'aria-label':'Front of the Baofeng UV-32',viewBox:'-48 0 588 1230'});
 photo.append(svgNode(d,'image',{href:'assets/uv32-front.webp',width:633,height:1254,'aria-hidden':'true'}));photo.append(sideKeys);drawing.append(photo);
 const panel=el(d,'section','radio-tutorial-panel');panel.id='uv32RadioTutorialPanel';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 const buttons=[];
 const show=key=>{const info=instructions[key];panel.replaceChildren(el(d,'h3','tutorial-key-title',`Key: ${info.name}`));panel.scrollTop=0;
  for(const [field,heading] of [['turn','Turn'],['short','Short press'],['hold','Press and hold'],['combo','PTT + SK1']])if(info[field]){
   panel.append(el(d,'h4','tutorial-action-title',heading),el(d,'p','',info[field]));
   if(field==='short'&&info.shortOptions){const list=el(d,'ul','tutorial-options');for(const [label,description] of info.shortOptions){const item=el(d,'li'),name=el(d,'strong','',label+' — ');item.append(name,d.createTextNode?d.createTextNode(description):el(d,'span','',description));list.append(item);}panel.append(list);}
  }
  for(const b of buttons)b.classList.toggle('tutorial-active',b.dataset.radioKey===key);
 };
 const bind=(node,key)=>{
  node.dataset.radioKey=key;node.setAttribute('aria-label','Key: '+instructions[key].name);node.setAttribute('aria-controls',panel.id);
  node.onmouseenter=()=>show(key);node.onfocus=()=>show(key);node.onclick=()=>show(key);buttons.push(node);
 };
 for(const [key,shape] of Object.entries(faces)){
  const path=svgNode(d,'path',{d:shape,class:'uv32-key-face',role:'button',tabindex:0,'vector-effect':'non-scaling-stroke'});
  bind(path,key);path.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();show(key);}};photo.append(path);
 }
 for(const [key,y] of [['ptt',515],['sk1',696],['sk2',772]]){
  const label=svgNode(d,'foreignObject',{x:-44,y:y-29,width:121,height:58});
  const button=el(d,'button','',key.toUpperCase());button.type='button';bind(button,key);label.append(button);
  sideKeys.append(svgNode(d,'line',{x1:77,y1:y,x2:116,y2:y,'aria-hidden':'true'}),label);
 }
 zoom.onclick=()=>{
  const close=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(close));zoom.textContent=close?'Show full radio':'Zoom into keypad';
  drawing.classList.toggle('keypad-zoom',close);photo.setAttribute('viewBox',close?'166 626 290 373':'-48 0 588 1230');
  sideKeys.style.display=close?'none':'';
  for(const key of ['power','encoder'])photo.querySelector('[data-radio-key="'+key+'"]').style.display=close?'none':'';
 };
 panel.append(el(d,'span','tag','Interactive guide'),el(d,'h3','','Choose a radio button'),el(d,'p','','Choose a control on the graphic to see its short press, hold, and combined actions.'));
 layout.append(drawing,panel);card.append(layout);
 const source=el(d,'p','muted radio-tutorial-source','Button functions follow the Baofeng UV-32 user manual.');card.append(source);host.append(card);workspace.append(host);
 const reference=el(d,'div','help-reference'),manualCard=el(d,'section','card');manualCard.append(el(d,'h3','','UV-32 manual'));
 const link=el(d,'a','','Open Baofeng UV-32 user manual ↗');link.href=manual;link.target='_blank';link.rel='noopener noreferrer';manualCard.append(link);
 manualCard.append(el(d,'p','muted','Only SK1 short press is identified as programmable. SK1 hold and both SK2 actions are fixed; the available SK1 choices are listed in the button guide. Button behavior may differ with radio firmware.'));
 const testCard=el(d,'section','card');testCard.append(el(d,'h3','','Cable programming'));
 const steps=el(d,'ol');for(const instruction of [
  'Close the stock CPS. Turn on the UV-32 and connect its programming cable.',
  'Open a complete UV-32 CHIRP image or cable capture, or choose Read Cable.',
  'Choose Write Cable and select the programming cable.',
  'Keep the cable connected until all blocks are acknowledged.'
 ])steps.append(el(d,'li','',instruction));testCard.append(steps);
 reference.append(manualCard,testCard);workspace.append(reference);target.append(workspace);
}
