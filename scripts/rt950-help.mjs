import {getValue, settings} from './rt950-sections.mjs';
import {renderKeyChoices} from './rt950-forms.mjs';

const manual='https://cdn.shopify.com/s/files/1/0564/8855/8800/files/radtel-950PRO_2.pdf?v=1756451146';
const product='https://www.radtels.com/products/radtel-rt-950-pro-27mhz-tx-rx-10w-walkie-talkie-am-fm-usb-lsb-cw-receive-gps-aprs-wireless-bluetooth-phone-programming-noaa-two-way-radio';

function svgNode(d,tag,attrs){
 const node=d.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
 return node;
}

export function rt950Photo(d,clipId){
 const svg=(tag,attrs)=>svgNode(d,tag,attrs);
 const frame=svg('svg',{viewBox:'94 -2 520 1266',width:'100%',height:'100%',overflow:'hidden'});
 // Trace only the housing in the product photograph. Keep the white lettering,
 // display and button artwork intact in both the full and keypad views.
 const defs=svg('defs',{}),outline=svg('clipPath',{id:clipId});
 outline.append(svg('path',{d:[
  'M433 0 H518 V17 L520 19 V24 L518 26 V89 L531 106 V131 L528 134 L531 137 V162 L536 164 L541 182 H561 Q579 187 609 209 V284 L599 295 L593 297',
  'V319 Q593 324 587 331 Q572 345 563 376 H571 Q578 382 578 391 V749 L569 760 L560 762',
  'V1212 Q560 1245 535 1255 Q526 1260 512 1259 H196 Q173 1259 159 1243 Q148 1231 148 1214',
  'V954 L137 947 V925 L135 924 V861 L137 860 V839 L135 837 V775 L137 773 V760 Q137 752 122 744 L126 730 Q130 698 128 630 L132 612 L130 585',
  'V432 Q129 406 125 391 L122 377 L138 359 Q130 340 119 329 Q114 323 114 317',
  'V297 L109 295 L99 285 V209 Q110 198 128 190 L134 144 Q136 140 143 141 L156 143 Q160 144 162 153 Q165 166 176 167',
  'H201 V165 H180 Q169 164 167 156 L170 84 Q170 76 180 64 L210 63 L216 57 H234 L240 63 L269 65 Q278 72 279 83 L283 155 Q281 162 272 166 H280 L284 181',
  'H293 L296 167 H308 L298 158 L301 56 L306 19 Q308 16 315 16 H335 L342 8 H359 L366 16 H391 Q397 18 398 25',
  'L402 58 L403 157 L393 164 L406 167 L419 163 V137 L422 134 L420 130 V106 L433 89 Z'
 ].join(' ')}));
 defs.append(outline);frame.append(defs,svg('image',{href:'assets/rt950pro-controls.jpg',width:1600,height:1600,'clip-path':'url(#'+clipId+')','aria-hidden':true}));
 return frame;
}

export function renderRt950Help(target,image){
 const d=target.ownerDocument;
 function el(tag,text,cls){
  const node=d.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;
 }
 const svg=(tag,attrs)=>svgNode(d,tag,attrs);
 function link(text,url){
  const a=el('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
 }
 function assignment(action,key){
  const field=settings.find(f=>f.key===key),value=getValue(image.settings,field);
  const current=value===''?(image.settings?'Unset':'No settings loaded'):(field.options[value]??'Radio value '+value);
  return [action,'Current assignment — '+current,field];
 }
 const workspace=el('div',null,'help-workspace rt950-help');
 const tutorial=el('section',null,'help-tutorial-host radio-tutorial-card');
 const head=el('div',null,'uv32-tutorial-head');
 const zoom=el('button','Zoom into keypad','uv32-keypad-zoom');zoom.type='button';zoom.setAttribute('aria-pressed','false');
 head.append(el('h3','Radio button tutorials'),el('p','Hover, focus or tap a control for instructions.','muted'),zoom);
 const layout=el('div',null,'radio-tutorial-layout'),drawing=el('div',null,'radio-drawing');
 const fullView=[-105,0,725,1268],keypadView=[195,765,320,405];
 const photo=svg('svg',{role:'group','aria-label':'Radtel RT-950 Pro controls'});
 const frame=rt950Photo(d,'rt950-help-housing');photo.append(frame);
 function setView(bounds){
  const view=bounds.join(' ');photo.setAttribute('viewBox',view);frame.setAttribute('viewBox',view);
  for(const [i,attr] of ['x','y','width','height'].entries())frame.setAttribute(attr,bounds[i]);
 }
 setView(fullView);
 const panel=el('section',null,'radio-tutorial-panel');panel.id='rt950-key-help';panel.setAttribute('aria-live','polite');
 const upper=svg('g',{}),keys=svg('g',{});frame.append(upper,keys);
 const controls=[];
 function bind(group,shape,title,steps){
  shape.setAttribute('tabindex','0');shape.setAttribute('role','button');
  shape.setAttribute('aria-label',title);shape.setAttribute('aria-controls',panel.id);
  function show(){
   panel.replaceChildren(el('h3',title,'tutorial-key-title'));
   for(const [action,description] of steps)panel.append(el('h4',action,'tutorial-action-title'),el('p',description));
   const programmable=steps.flatMap(([, ,field])=>field?[field]:[]);
   if(programmable.length)panel.append(renderKeyChoices(el,programmable));
   panel.scrollTop=0;for(const control of controls)control.classList.toggle('tutorial-active',control===shape);
  }
  shape.onmouseenter=show;shape.onfocus=show;shape.onclick=show;
  shape.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show();}};
  group.append(shape);controls.push(shape);return show;
 }
 function face(group,x,y,w,h,title,steps){
  return bind(group,svg('rect',{x,y,width:w,height:h,rx:7,class:'uv32-key-face','vector-effect':'non-scaling-stroke'}),title,steps);
 }
 const first=face(upper,168,54,113,110,'Power and volume',[['Turn','Turn clockwise past the click to switch on. Continue clockwise to raise the volume. Turn fully counterclockwise to switch off.']]);
 face(upper,298,7,105,157,'Channel knob',[['Turn','In channel mode, turn the knob to select a stored channel.']]);
 const sideKeys=[
  ['PTT A',525,[['Hold','Transmit on line A. Release to listen.']]],
  ['PTT B',650,[['Hold','Transmit on line B. Release to listen.']]],
  ['PF1 / PTT C',794,[assignment('Short press','KeySide1'),assignment('Long press','KeySide1L')]],
  ['PF2',888,[assignment('Short press','KeySide2'),assignment('Long press','KeySide2L')]]
 ];
 for(const [label,y,steps] of sideKeys){
  const g=svg('g',{class:'rt950-side-key'});
  g.append(svg('line',{x1:84,x2:134,y1:y,y2:y}),svg('rect',{x:-100,y:y-23,width:184,height:46,rx:6}));
  const text=svg('text',{x:-8,y:y+1,'text-anchor':'middle','dominant-baseline':'middle'});text.textContent=label;g.append(text);
  bind(upper,g,label,steps);
 }
 face(keys,208,778,59,52,'Menu / OK',[['Press','Open the menu or confirm the highlighted item.']]);
 face(keys,208,833,59,51,'A / B / C',[['Press','Select the active line on the standby display. The radio highlights that line.']]);
 face(keys,441,778,58,52,'Back',[['Press','Leave the current menu.'],['Hold','Open frequency sweep to identify a nearby signal.']]);
 face(keys,441,833,58,51,'V / M',[['Press','Switch the selected line between frequency and stored-channel mode. Channel mode needs a programmed channel.']]);
 for(const [name,points] of [['Up','282,778 425,778 376,814 332,814'],['Down','282,884 425,884 376,848 332,848'],['Left','282,779 332,816 332,846 282,883'],['Right','425,779 376,816 376,846 425,883']]){
  bind(keys,svg('polygon',{points,class:'uv32-key-face','vector-effect':'non-scaling-stroke'}),name,[['Press','Navigate the radio menu using the direction keys.']]);
 }
 for(const [i,key] of [...'123456789*0#'].entries()){
  let steps;
  if(key==='#')steps=[['Hold','Unlock the keypad when the lock icon is displayed.'],['Broadcast receiver','In frequency mode, press # to scan for a broadcast station.']];
  else if(key==='*')steps=[['Text entry','Use the space marking on this key when entering a channel name.']];
  else steps=[['Press','Enter '+key+' when keying in a frequency or number.'],assignment('Long press','Key'+key+'L')];
  face(keys,[207,310,413][i%3],[900,970,1041,1111][Math.floor(i/3)],87,42,'Key '+key,steps);
 }
 zoom.onclick=()=>{
  const zoomed=zoom.getAttribute('aria-pressed')!=='true';zoom.setAttribute('aria-pressed',String(zoomed));
  zoom.textContent=zoomed?'Show full radio':'Zoom into keypad';setView(zoomed?keypadView:fullView);
  upper.style.display=zoomed?'none':'';
  if(zoomed&&upper.querySelector('.tutorial-active'))keys.firstElementChild.onclick();
 };
 first();drawing.append(photo);layout.append(drawing,panel);tutorial.append(head,layout);
 const reference=el('div',null,'help-reference');
 const docs=el('section',null,'card');
 docs.append(el('h3','RT-950 Pro manual'),link('Open the Radtel user manual ↗',manual),el('p','Side-key and numeric long-press assignments shown here come from Optional Features in your workspace.','muted'),link('Radtel product and control photo ↗',product));
 const programming=el('section',null,'card');
 programming.append(el('h3','Bluetooth programming'),
  el('p','Choose the layout under Channels that matches Menu › About on the radio. Firmware 0.24 and later uses 10 zones of 99 channels. Earlier firmware uses 15 zones of 64 channels.'),
  el('p','Use Read Bluetooth to load the radio or Import file to open a JSON workspace. Save read backup keeps the original read. CHIRP CSV files add analog channels to empty slots, starting in the selected zone. A filename such as Zone03_LOCAL.csv targets zone 3.'),
  el('p','Choose Write Bluetooth to send the workspace. After a dropped connection, Write reconnects to the selected radio. Edits to a previously read radio send the changed blocks. Opening a backup for a different radio writes the sections present in that backup.'),
  link('Bluetooth protocol reference ↗','https://github.com/facenot/bj9000-programmer'));
 reference.append(docs,programming);workspace.append(tutorial,reference);target.replaceChildren(workspace);
}
