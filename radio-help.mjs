// Display-only tutorials. No Bluetooth, DAT or programming functions are called here.
const manual='https://baofeng.s3.amazonaws.com/Baofeng_MINI-5_User_Manual_EN_V1.0_20260920.pdf';
const product='https://www.baofengradio.com/products/mini-5-ham';
const sk1Descriptions={
 7:'FM listening on/off. Allow the FM receiver; use arrows to tune.',
 28:'Start/stop channel scan; same as holding #. Scan inclusion/resume settings apply.',
 29:'Detect nearby frequency and CTCSS/DCS; same as holding Flashlight / Search.',
 45:'Voice-triggered transmission on/off. Sensitivity and release delay are separate settings.',
 8:'Lamp control; same as the flashlight key. Solid/strobe behavior depends on firmware.',
 3:'Start/stop alarm. Alarm Mode may sound locally or transmit sound/an alarm code.'
};
const keypad={shortpressTitle:'Short Press – Numeric Entry',kind:'Keypad entry',steps:['In VFO frequency mode, enter the desired frequency with the number keys. In stored memory mode, enter a three-digit channel number, such as 064.','Inside menus or text entry, follow the field shown on the radio.']};
const tutorials={
 volume:{keyName:'Power / Volume Knob',kind:'Physical control',shortpressTitle:'Turn – Power / Volume',steps:['Turn clockwise to switch the radio on and increase volume. Turn back to lower volume or switch off.']},
 ptta:{keyName:'PTT-A',kind:'Transmit control',shortpressTitle:'Press and Hold — Transmit on A',steps:['Press and hold PTT-A to transmit on the upper (A) channel. Release the button to receive.']},
 pttb:{keyName:'PTT-B',kind:'Transmit control',shortpressTitle:'Press and Hold — Transmit on B',steps:['Press and hold PTT-B to transmit on the lower (B) channel. Release the button to receive.']},
 sk1:{keyName:'SK1',kind:'Assignable short press',shortpressTitle:'Short Press – Programmable Function',steps:['Choose Optional settings → Side-key short press. Save your DAT to keep edits; write separately to program the radio.'],combinationTitle:'PTT + SK1 – Repeater Activation Tone',combinationSteps:['Hold PTT and press SK1 to transmit the manufacturer-documented activation tone. This has not been physically verified on your firmware.','Optional settings → Repeater access tone: 1000, 1450, 1750 and 2100 Hz; separate from CTCSS/DCS.']},
 menu:{keyName:'MENU',kind:'Menu control',shortpressTitle:'Short Press – Menu / Confirm',steps:['Press MENU to open the radio menu. Use ▲ / ▼ to find a setting, then press MENU to select it.','Use the arrows to choose a value. Press MENU to confirm and save the change.','Within ordinary menus, use EXIT to back out without confirming a pending choice. The DTMF dialing screen has a different exit behavior; see the # guide.'],longpressTitle:'Long Press – Stopwatch',longpress:['Hold MENU for about 3 seconds in standby to activate the stopwatch.','Press MENU to start timing; press MENU again to stop. Press EXIT to leave the stopwatch.']},
 vm:{keyName:'V/M',kind:'Mode selection',shortpressTitle:'Short Press – VFO / Memory Mode',steps:['Press V/M to switch between direct VFO frequency operation and stored memory channels.','VFO mode uses the frequencies and settings for A or B. Memory mode uses a saved channel and its receive/transmit frequencies, tones and other settings.'],note:'VFO changes do not create stored memory channels.'},
 lamp:{keyName:'Flashlight / Search',kind:'Built-in functions',shortpressTitle:'Short Press – Flashlight',steps:['Short-press the flashlight/search button to turn the flashlight on or off.'],longpressTitle:'Long Press – Frequency Search (Nearby Signal Detection)',longpress:['Hold the flashlight/search button for about 3 seconds to start Frequency Search. The screen displays SEARCH...','Search detects nearby transmitting signals.','In the SEARCH screen, # switches the search band between VHF and UHF, as supported by the radio. The radio attempts to identify a transmitting frequency and CTCSS/DCS signaling.','MENU saves the detected results as a memory channel. The channel-selection and overwrite procedure has not been confirmed here.']},
 ab:{keyName:'A/B',kind:'Display selection',shortpressTitle:'Short Press – Active Display',steps:['Press A/B to select the upper A or lower B display. The highlighted line is active.','Selection determines which line ordinary tuning and channel-selection keys affect.']},
 up:{keyName:'▲ / Up',kind:'Navigation',shortpressTitle:'Short Press – Tune / Navigate Up',steps:['In VFO mode, move up by the saved tuning step. In memory mode, move to another stored channel.','Within menus, move up through settings or available values.']},
 down:{keyName:'▼ / Down',kind:'Navigation',shortpressTitle:'Short Press – Tune / Navigate Down',steps:['In VFO mode, move down by the saved tuning step. In memory mode, move to another stored channel.','Within menus, move down through settings or available values.']},
 exit:{keyName:'EXIT',kind:'Navigation',shortpressTitle:'Short Press – Back / Exit',steps:['Within ordinary menus, back out without confirming a pending choice. EXIT also leaves the stopwatch.','EXIT does not cancel the DTMF dialing screen on the radio. No method of exiting that screen without transmitting has been confirmed; see the # guide.']},
 '0':{...keypad,keyName:'0',longpressTitle:'Long Press – Weather',longpress:['Hold 0 for about 3 seconds to enter weather mode. Use ▲ / ▼ to choose a weather channel.','In weather mode, hold # for about 3 seconds to start or stop weather-channel scanning.'],longpressNote:'Weather channels are built into the radio.'},
 '8':{...keypad,keyName:'8',longpressTitle:'Long Press – Transmit Power',longpress:['In standby, hold 8 for about 3 seconds to switch between Low (L) and High (H) transmit power. L or H appears in the radio’s top status bar.','Each change requires another long press. Keeping 8 held does not continuously cycle power levels.']},
 star:{keyName:'*',kind:'Fixed shortcuts',shortpressTitle:'Short Press – Reverse / Talkaround',steps:['On a programmed repeater channel, each short press cycles Normal → Reverse (R) → Talkaround (T) → Normal. R and T appear in the radio’s top status bar.','Normal uses the programmed repeater transmit and receive frequencies.','Reverse swaps transmit and receive frequencies so you can monitor the repeater input.','Talkaround uses the repeater output frequency for direct communication without accessing the repeater.'],longpressTitle:'Long Press – Keypad Lock',longpress:['Hold * for about 3 seconds to lock or unlock the keypad. The lock indicator shows when the keypad is locked.','The manufacturer says power, volume, reception, PTT transmission, call tones and emergency alerts remain operational while locked; other functions are locked.']},
 hash:{keyName:'#',kind:'DTMF dialing',shortpressTitle:'Short Press – DTMF Dial',steps:['From the ordinary operating screen, short-press # to open the DTMF dialing screen. Enter the desired digits.','Press PTT to initiate transmission and exit the DTMF screen. PTT exits the screen even if no digits were entered.','EXIT does not cancel the screen. No method of exiting without transmitting has been confirmed.'],longpressTitle:'Long Press – Channel Scan',longpress:['Hold # for about 3 seconds to start or stop channel scanning. A channel’s programmed Include in scan setting determines whether it participates.','Optional settings → Scan resume behavior chooses time-based resume, resume when the signal ends, or stop when a signal is found.','In weather mode, holding # for about 3 seconds starts or stops weather-channel scanning instead.']}
};

const keys=[
 ['volume','⏻ / VOL',207,23,47,55],['ptta','PTT A',20,145,45,36],['pttb','PTT B',20,216,45,36],['sk1','SK1',20,282,45,30],
 ['menu','MENU',112,259,39,20],['vm','V/M',156,259,39,20],['lamp','☀',201,259,39,20],
 ['ab','A/B',107,288,33,42],['up','▲',148,286,55,22],['down','▼',148,310,55,22],['exit','EXIT',211,288,33,42],
 ['1','1',111,340,29,22],['2','2 ABC',145,340,29,22],['3','3 DEF',179,340,29,22],['star','* 🔒',213,340,29,22],
 ['4','4 GHI',111,372,29,22],['5','5 JKL',145,372,29,22],['6','6 MNO',179,372,29,22],['0','0 WX',213,372,29,22],
 ['7','7 PQRS',111,405,29,22],['8','8 TUV',145,405,29,22],['9','9 WXYZ',179,405,29,22],['hash','# ↑',213,405,29,22]
];
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
export function renderRadioTutorial(target,settings={},options=[]){
 const card=element('section',null,'card radio-tutorial-card');card.append(element('h3','Radio button tutorials'),element('p','Hover, focus or tap a button for its instructions.','muted'));
 const layout=element('div',null,'radio-tutorial-layout'),drawing=element('div',null,'radio-drawing');drawing.setAttribute('role','group');drawing.setAttribute('aria-label','Blue MINI-5 radio photo with button tutorials and labeled side controls');
 const outline=element('div',null,'radio-outline');outline.innerHTML='<img src="assets/mini5-blue.png" width="1254" height="1254" alt="Blue Baofeng MINI-5, photograph supplied by K4RJM">';drawing.append(outline);
 const panel=element('section',null,'radio-tutorial-panel');panel.id='radioTutorialPanel';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
 const buttons=[];let selected=null;
 const show=key=>{
  if(key===selected)return;selected=key;
  const t=tutorials[key]||keypad,keyName=t.keyName||key;
  panel.replaceChildren(element('h3','Key: '+keyName,'tutorial-key-title'));
  panel.scrollTop=0;
  const addInstructions=(heading,instructions)=>{panel.append(element('h4',heading,'tutorial-action-title'));const list=element('ol');for(const step of instructions)list.append(element('li',step));panel.append(list);};
  addInstructions(t.shortpressTitle,t.steps);
  if(t.warning){const warning=element('p',t.warning,'tutorial-warning');warning.setAttribute('role','note');panel.append(warning);}
  if(key==='sk1'){
   const functions=element('ul',null,'sk1-functions');for(const [value,label]of options){const item=element('li');item.append(element('strong',label+' — '),sk1Descriptions[value]||'Saved CPS assignment; detailed behavior is not verified.');functions.append(item);}panel.append(functions);
  }
  if(t.note)panel.append(element('p',t.note,'muted'));
  if(t.longpress){addInstructions(t.longpressTitle,t.longpress);if(t.longpressNote)panel.append(element('p',t.longpressNote,'muted'));}
  if(t.combinationTitle){addInstructions(t.combinationTitle,t.combinationSteps);if(t.combinationNote)panel.append(element('p',t.combinationNote,'muted'));}
  for(const b of buttons)b.classList.toggle('tutorial-active',b.dataset.radioKey===key);
 };

 for(const [key,label,x,y,w,h]of keys){const b=element('button',label,'radio-key'+(['ptta','pttb','sk1'].includes(key)?' radio-side-key':''));b.type='button';b.dataset.radioKey=key;b.style.cssText=`left:${x/3}%;top:${y/4.6}%;width:${w/3}%;height:${h/4.6}%;`;b.setAttribute('aria-label','Key: '+(tutorials[key]?.keyName||key));b.setAttribute('aria-controls','radioTutorialPanel');b.onmouseenter=()=>show(key);b.onfocus=()=>show(key);b.onclick=()=>show(key);buttons.push(b);drawing.append(b);}
 panel.append(element('span','Interactive guide','tag'),element('h3','Choose a radio button'),element('p','Choose a button to see its operating instructions.'),element('p','Button behavior may differ between firmware versions.','muted'));
 layout.append(drawing,panel);card.append(layout);
 const sources=element('p',null,'muted radio-tutorial-source');sources.append('MINI-5 photo and DTMF observations supplied by K4RJM. Side controls are labeled beside the photo. Other references: ');for(const [label,url]of [['product controls',product]]){const a=element('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}sources.append(' · Baofeng manual: local copy pending redistribution permission.');card.append(sources);target.append(card);
}
