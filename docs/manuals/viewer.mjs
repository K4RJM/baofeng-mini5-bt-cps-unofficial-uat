import {getDocument,GlobalWorkerOptions} from '../../vendor/pdfjs/pdf.min.mjs';
GlobalWorkerOptions.workerSrc=new URL('../../vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
const $=id=>document.getElementById(id),view=$('view'),canvas=$('pageCanvas');
let pdf,current=1,renderTask,revision=0,resizeTimer;
async function render(keepPosition=false){
 if(!pdf||view.clientWidth<30)return;
 const own=++revision,ratio=keepPosition&&view.scrollHeight?view.scrollTop/view.scrollHeight:0;
 renderTask?.cancel();
 try{
  const page=await pdf.getPage(current);if(own!==revision)return;
  const natural=page.getViewport({scale:1}),scale=$('zoom').value==='fit'?Math.max(.2,(view.clientWidth-16)/natural.width):Number($('zoom').value),viewport=page.getViewport({scale}),pixel=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.floor(viewport.width*pixel);canvas.height=Math.floor(viewport.height*pixel);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
  renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,transform:pixel===1?null:[pixel,0,0,pixel,0,0]});await renderTask.promise;if(own!==revision)return;
  const text=await page.getTextContent();if(own!==revision)return;
  $('pageText').textContent=text.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('');$('page').value=String(current);$('previous').disabled=current===1;$('next').disabled=current===pdf.numPages;
  $('status').textContent=`Page ${current} of ${pdf.numPages} · Ham-Rx guide 20.27`;view.scrollTop=keepPosition?ratio*view.scrollHeight:0;
 }catch(error){if(own===revision&&error.name!=='RenderingCancelledException')$('status').textContent='Unable to render this page. Use Download PDF to read it locally.';}
}
$('previous').onclick=()=>{if(current>1){current--;render();}};
$('next').onclick=()=>{if(pdf&&current<pdf.numPages){current++;render();}};
$('page').onchange=()=>{const value=Number($('page').value);if(pdf&&Number.isInteger(value)&&value>=1&&value<=pdf.numPages){current=value;render();}else $('page').value=String(current);};
$('zoom').onchange=()=>render(true);
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(true),120);}).observe(view);
try{pdf=await getDocument({url:new URL('ham-rx-cps-user-guide-v20.27.pdf',import.meta.url).href,isEvalSupported:false,useSystemFonts:true}).promise;$('count').textContent='/ '+pdf.numPages;$('page').max=String(pdf.numPages);await render();}catch{$('status').textContent='Unable to load the guide. Use Download PDF to open the local file.';}
