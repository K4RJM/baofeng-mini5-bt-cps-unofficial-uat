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
const hotspots=[
 ['power',58,3,7,10],['encoder',46,3,8,10],
 ['menu',41,51,5,8],['up',47,50,6,5],['down',47,55,6,5],['p1',46,53,4,5],['p2',53,53,4,5],['home',56,51,5,8],
 ['1',40,62,5,4],['2',47,62,5,4],['3',54,62,5,4],
 ['4',40,66,5,4],['5',47,66,5,4],['6',54,66,5,4],
 ['7',40,70,5,4],['8',47,70,5,4],['9',54,70,5,4],
 ['star',40,75,5,4],['zero',47,75,5,4],['hash',54,75,5,4]
];
const el=(d,tag,cls,text)=>{const node=d.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export function renderUv32Help(d,target){
 const workspace=el(d,'div','help-workspace uv32-help-workspace');
 const host=el(d,'div','help-tutorial-host'),card=el(d,'section','card radio-tutorial-card');
 card.append(el(d,'h3','', 'Radio button tutorials'),el(d,'p','muted','Hover, focus or tap a button for its instructions.'));
 const zoom=el(d,'button','uv32-keypad-zoom','Zoom into keypad');zoom.type='button';zoom.setAttribute('aria-pressed','false');card.append(zoom);
 const layout=el(d,'div','radio-tutorial-layout'),drawing=el(d,'div','radio-drawing uv32-radio-drawing');
 drawing.setAttribute('role','group');drawing.setAttribute('aria-label','UV-32 radio graphic with button tutorials');
 const photo=el(d,'div','radio-outline'),img=el(d,'img');img.src='assets/uv32-blue.jpg';img.alt='Baofeng UV-32 with blue accents';photo.append(img);drawing.append(photo);
 const panel=el(d,'section','radio-tutorial-panel');panel.id='uv32RadioTutorialPanel';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 const buttons=[];
 const show=key=>{const info=instructions[key];panel.replaceChildren(el(d,'h3','tutorial-key-title',`Key: ${info.name}`));panel.scrollTop=0;
  for(const [field,heading] of [['turn','Turn'],['short','Short press'],['hold','Press and hold'],['combo','PTT + SK1']])if(info[field]){
   panel.append(el(d,'h4','tutorial-action-title',heading),el(d,'p','',info[field]));
   if(field==='short'&&info.shortOptions){const list=el(d,'ul','tutorial-options');for(const [label,description] of info.shortOptions){const item=el(d,'li'),name=el(d,'strong','',label+' — ');item.append(name,d.createTextNode?d.createTextNode(description):el(d,'span','',description));list.append(item);}panel.append(list);}
  }
  for(const b of buttons)b.classList.toggle('tutorial-active',b.dataset.radioKey===key);
 };
 const add=(key,label,x,y,w,h,side=false)=>{const b=el(d,'button','radio-key'+(side?' radio-side-key':''),label);b.type='button';b.dataset.radioKey=key;b.dataset.basePosition=JSON.stringify([x,y,w,h]);b.setAttribute('aria-label',`Key: ${instructions[key].name}`);b.setAttribute('aria-controls',panel.id);b.onmouseenter=()=>show(key);b.onfocus=()=>show(key);b.onclick=()=>show(key);drawing.append(b);buttons.push(b);};
 for(const [key,x,y,w,h] of hotspots)add(key,key,x,y,w,h);
 add('ptt','PTT',0,34,23,7,true);add('sk1','SK1',0,43,23,7,true);add('sk2','SK2',0,52,23,7,true);
 const position=close=>{drawing.classList.toggle('keypad-zoom',close);zoom.textContent=close?'Show full radio':'Zoom into keypad';zoom.setAttribute('aria-pressed',String(close));
  for(const b of buttons){const [x,y,w,h]=JSON.parse(b.dataset.basePosition),side=b.classList.contains('radio-side-key');b.hidden=close&&side;
   b.style.cssText=side?`left:${x}%;top:${y}%;width:${w}%;height:${h}%;`:close
    ?`left:${x*3-100}%;top:${y*90/34.5-435/3.45}%;width:${w*3}%;height:${h*90/34.5}%;`
    :`left:${x*1.5-25}%;top:${y*450/460}%;width:${w*1.5}%;height:${h*450/460}%;`;
  }
 };
 zoom.onclick=()=>position(!drawing.classList.contains('keypad-zoom'));position(false);
 panel.append(el(d,'span','tag','Interactive guide'),el(d,'h3','','Choose a radio button'),el(d,'p','','Choose a control on the graphic to see its short press, hold, and combined actions.'));
 layout.append(drawing,panel);card.append(layout);
 const source=el(d,'p','muted radio-tutorial-source','Button functions checked against the supplied Baofeng UV-32 user manual. The graphic was supplied by K4RJM.');card.append(source);host.append(card);workspace.append(host);
 const reference=el(d,'div','help-reference'),manualCard=el(d,'section','card');manualCard.append(el(d,'h3','','UV-32 manual'));
 const link=el(d,'a','','Open Baofeng UV-32 user manual ↗');link.href=manual;link.target='_blank';link.rel='noopener noreferrer';manualCard.append(link);
 manualCard.append(el(d,'p','muted','Only SK1 short press is identified as programmable. SK1 hold and both SK2 actions are fixed; the available SK1 choices are listed in the button guide. Button behavior may differ with radio firmware.'));
 const testCard=el(d,'section','card');testCard.append(el(d,'h3','','Cable programming'));
 const steps=el(d,'ol');for(const instruction of [
  'Close the stock CPS. Turn on the UV-32 and connect its programming cable.',
  'Choose Read UV-32 by cable and wait for a complete read.',
  'Edit channels or settings, then choose Write UV-32 by cable and select the same port.',
  'Leave the cable connected until read-back verification finishes.'
 ])steps.append(el(d,'li','',instruction));testCard.append(steps);
 reference.append(manualCard,testCard);workspace.append(reference);target.append(workspace);
}
