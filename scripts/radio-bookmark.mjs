const modelNames=new Map([['mini5','MINI-5'],['uv32','UV-32'],['rt950pro','RT-950 Pro'],['bj9000','BJ-9000']]);

export function installRadioBookmark(select){
 const byId=id=>document.getElementById(id);
 const button=byId('bookmarkRadio'),dialog=byId('radioBookmarkDialog');
 const link=byId('radioBookmarkLink'),status=byId('radioBookmarkStatus'),urlField=byId('radioBookmarkUrl');
 const requested=new URL(location.href).searchParams.get('radio')?.toLowerCase().replace(/[\s-]+/g,'');
 select.value=modelNames.has(requested)?requested:'';
 const updateButton=()=>{
  button.disabled=!select.value;
  button.title=select.value?'Bookmark '+modelNames.get(select.value)+' Channels':'Choose a radio to bookmark its Channels screen';
 };
 button.hidden=false;
 updateButton();
 select.addEventListener('change',()=>{
  const url=new URL(location.href);
  url.searchParams.set('radio',select.value);
  history.replaceState(history.state,'',url);
  updateButton();
 });
 button.addEventListener('click',()=>{
  const name=modelNames.get(select.value);
  if(!name)return;
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set('radio',select.value);
  link.href=url.href;
  link.textContent=name+' Channels';
  byId('radioBookmarkTitle').textContent='Bookmark '+name;
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const shortcut=/Mac/i.test(navigator.platform)?'⌘D':'Ctrl+D';
  byId('radioBookmarkTip').textContent=mobile
   ?'Open your browser’s menu or Share menu and choose Add Bookmark or Add to favorites.'
   :'Drag this link to your bookmarks bar, or press '+shortcut+' to bookmark this page.';
  status.textContent='';
  urlField.hidden=true;
  dialog.showModal();
 });
 byId('copyRadioBookmark').addEventListener('click',async()=>{
  try{
   await navigator.clipboard.writeText(link.href);
   status.textContent='Link copied.';
  }catch{
   urlField.value=link.href;
   urlField.hidden=false;
   urlField.focus();
   urlField.select();
   status.textContent='Copy the selected link.';
  }
 });
}
