// Display-only document viewer. It never accesses radio or workspace data.
export const baofengManualURL='https://baofeng.s3.amazonaws.com/Baofeng_MINI-5_User_Manual_EN_V1.0_20260920.pdf';
export const guideURL='docs/manuals/viewer.html';
export function mountManuals(workspace,tutorial,references){
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const controls=make('div',null,'manual-controls');
 const label=make('label','Manuals '),select=make('select');select.id='manualSelector';select.setAttribute('aria-label','Manuals');
 for(const [value,text,disabled]of [['','Choose a manual',false],['hamrx','Ham-Rx CPS User Guide · 20.27',false]]){const option=make('option',text);option.value=value;option.disabled=disabled;select.append(option);}label.append(select);controls.append(label);
 const official=make('a','Baofeng MINI-5 Radio Manual ↗');official.id='baofengManual';official.href=baofengManualURL;official.target='_blank';official.rel='noopener';official.title='Open the official Baofeng radio manual in a new tab';controls.append(official);
 const testing=make('a','Testing & Compatibility ↗');testing.href='docs/testing-compatibility.html';testing.target='_blank';testing.rel='noopener';controls.append(testing);references.prepend?references.prepend(controls):references.append(controls);
 const viewer=make('section',null,'manual-viewer');viewer.hidden=true;viewer.setAttribute('aria-label','Manual viewer');
 const toolbar=make('div',null,'manual-toolbar'),title=make('strong','Ham-Rx CPS User Guide · 20.27');
 const expand=make('button','Expand left'),close=make('button','Close manual'),open=make('a','Open PDF in new tab ↗');
 expand.type=close.type='button';expand.id='manualExpand';expand.setAttribute('aria-expanded','false');close.id='manualClose';open.id='manualOpen';open.href=guideURL;open.target='_blank';open.rel='noopener';
 toolbar.append(title,expand,open,close);viewer.append(toolbar);
 const pdf=make('iframe');pdf.id='manualPDF';pdf.title='Ham-Rx CPS User Guide PDF, version 20.27';viewer.append(pdf);
 viewer.append(make('p','Use page and zoom controls inside the viewer, or open the PDF in a new tab.','manual-fallback'));workspace.append(viewer);
 let expanded=false,loaded=false;
 const layout=()=>{workspace.classList.toggle('manual-expanded',expanded);workspace.classList.toggle('manual-open',!viewer.hidden);tutorial.hidden=expanded&&!viewer.hidden;expand.textContent=expanded?'Return right':'Expand left';expand.setAttribute('aria-expanded',String(expanded));};
 select.onchange=()=>{if(select.value!=='hamrx')return;viewer.hidden=false;if(!loaded){pdf.src=guideURL;loaded=true;}layout();expand.focus();};
 expand.onclick=()=>{expanded=!expanded;layout();};
 close.onclick=()=>{viewer.hidden=true;select.value='';layout();select.focus();};
 // Keep the same iframe and source when resizing/closing, so supporting PDF engines retain their position.
 return {viewer,pdf,select,expand,close};
}
