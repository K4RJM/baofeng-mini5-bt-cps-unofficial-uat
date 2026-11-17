// Read-only UV-32 button guide based on the Baofeng UV-32 user manual.
const manual='https://baofeng.s3.amazonaws.com/Baofeng_UV-32_User_Manual_20250210.pdf';
const instructions={
 power:['Power / Volume','Turn clockwise until the radio clicks on; continue turning to raise volume. Turn counterclockwise to lower volume or switch off.'],
 encoder:['Channel selector','Turn the top channel selector to move through stored channels in channel mode.'],
 ptt:['PTT','Hold to transmit on the selected channel or frequency; release to receive.'],
 sk1:['Side key SK1','A short press runs its assigned shortcut: FM radio, search, scan, or VOX. Hold about three seconds for the emergency alarm; press again to exit. With PTT held, SK1 sends the repeater access tone.'],
 sk2:['Side key SK2','Hold to monitor the current frequency with squelch opened. Release to return to normal reception.'],
 menu:['Menu / OK','Press to open menus, choose an item, or confirm a value. Hold in standby to switch between frequency (VFO) and channel (MR) modes.'],
 home:['Home / Back','Press to leave a menu or function. In standby, press to switch the main display between A and B. Hold to start frequency sweep.'],
 up:['Up','Move up through channels, frequencies, or menu choices. Holding moves rapidly.'],
 down:['Down','Move down through channels, frequencies, or menu choices. Holding moves rapidly.'],
 p1:['P1','Open the position text information screen.'],
 p2:['P2','Open the position coordinate screen.'],
 star:['* / Lock','Press to cycle repeater reverse and talkaround when receive and transmit frequencies differ. Hold about two seconds to lock or unlock the keypad.'],
 zero:['0 / Weather','Enter 0 during numeric entry. Hold to open NOAA weather reception.'],
 hash:['# / Scan','Hold about two seconds to start or stop scanning. In broadcast FM, press briefly to search for an active station.']
};
const numeric=['1','2','3','4','5','6','7','8','9'];
for(const digit of numeric)instructions[digit]=[digit,'Enter a frequency digit in VFO mode, a channel number in channel mode, or a numbered menu choice.'];
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
 const layout=el(d,'div','radio-tutorial-layout'),drawing=el(d,'div','radio-drawing uv32-radio-drawing');
 drawing.setAttribute('role','group');drawing.setAttribute('aria-label','UV-32 radio graphic with button tutorials');
 const photo=el(d,'div','radio-outline'),img=el(d,'img');img.src='assets/uv32-blue.jpg';img.alt='Baofeng UV-32 with blue accents';photo.append(img);drawing.append(photo);
 const panel=el(d,'section','radio-tutorial-panel');panel.id='uv32RadioTutorialPanel';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 const buttons=[];
 const show=key=>{const [title,body]=instructions[key];panel.replaceChildren(el(d,'h3','tutorial-key-title',`Key: ${title}`),el(d,'h4','tutorial-action-title','How to use it'),el(d,'p','',body));for(const b of buttons)b.classList.toggle('tutorial-active',b.dataset.radioKey===key);};
 const add=(key,label,x,y,w,h,side=false)=>{const b=el(d,'button','radio-key'+(side?' radio-side-key':''),label);b.type='button';b.dataset.radioKey=key;b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;`;b.setAttribute('aria-label',`Key: ${instructions[key][0]}`);b.setAttribute('aria-controls',panel.id);b.onmouseenter=()=>show(key);b.onfocus=()=>show(key);b.onclick=()=>show(key);drawing.append(b);buttons.push(b);};
 // The square supplied photo is enlarged and centered inside the tall guide frame.
 for(const [key,x,y,w,h] of hotspots)add(key,key,x*1.5-25,y*450/460,w*1.5,h*450/460);
 add('ptt','PTT',0,34,23,7,true);add('sk1','SK1',0,43,23,7,true);add('sk2','SK2',0,52,23,7,true);
 panel.append(el(d,'span','tag','Interactive guide'),el(d,'h3','','Choose a radio button'),el(d,'p','','Choose a control on the graphic to see its function.'));
 layout.append(drawing,panel);card.append(layout);
 const source=el(d,'p','muted radio-tutorial-source','Button functions: Baofeng UV-32 user manual. The graphic was supplied by K4RJM.');card.append(source);host.append(card);workspace.append(host);
 const reference=el(d,'div','help-reference'),manualCard=el(d,'section','card');manualCard.append(el(d,'h3','','UV-32 manual'));
 const link=el(d,'a','','Open Baofeng UV-32 user manual ↗');link.href=manual;link.target='_blank';link.rel='noopener noreferrer';manualCard.append(link);
 manualCard.append(el(d,'p','muted','Radio firmware can change key behavior. Check the display and your assigned SK1 function on the radio.'));
 reference.append(manualCard);workspace.append(reference);target.append(workspace);
}
