(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else{root.PortalAudio=factory();root.PortalAudioGlobal=root.PortalAudioGlobal||root.PortalAudio.criar();}})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 function criar(opts={}){
  const host=opts.host||globalThis,a=opts.audio||new host.Audio(),every=opts.setInterval||host.setInterval.bind(host),clear=opts.clearInterval||host.clearInterval.bind(host),later=opts.setTimeout||host.setTimeout.bind(host),cancel=opts.clearTimeout||host.clearTimeout.bind(host),onChange=opts.onChange||(()=>{});
  let cfg=null,key='',scope='',active=false,blocked=false,preparing=false,previewing=false,source='',fallback='',objectURL='',timer,limit,loadSeq=0,owner=false,claiming=false,releaseLock,disposed=false;
  const ident=host.crypto?.randomUUID?.()||String(Math.random());
  const status=()=>({blocked,preparing,previewing,active,volume:cfg?.volume??45});const emit=()=>{onChange(status());host.dispatchEvent?.(new host.CustomEvent('pethub:audio-status',{detail:status()}));};
  function pause(){a.pause();try{a.currentTime=0;}catch{}cancel(limit);}
  function release(){owner=false;releaseLock?.();releaseLock=null;try{const k='pethub-audio-lease:'+scope,r=JSON.parse(host.localStorage?.getItem(k)||'null');if(r?.id===ident)host.localStorage.removeItem(k);}catch{}}
  function lider(){if(opts.isLeader)return opts.isLeader(scope);if(host.navigator?.locks){if(!owner&&!claiming&&scope){claiming=true;host.navigator.locks.request('pethub-audio:'+scope,{ifAvailable:true},lock=>{claiming=false;if(!lock)return;owner=true;return new Promise(resolve=>{releaseLock=resolve;if(!active||disposed){release();return;}void play(false);});}).catch(()=>{claiming=false;});}return owner;}
   try{const k='pethub-audio-lease:'+scope,now=Date.now(),r=JSON.parse(host.localStorage.getItem(k)||'null');if(r&&r.id!==ident&&r.ate>now)return false;host.localStorage.setItem(k,JSON.stringify({id:ident,ate:now+6000}));return JSON.parse(host.localStorage.getItem(k)).id===ident;}catch{return host.document?.hasFocus?.()!==false;}}
  async function play(manual=false){if(disposed||preparing||previewing||!active||!source||(!manual&&blocked)||!lider()||!a.paused)return;try{a.src=source;a.volume=(cfg?.volume??45)/100;await a.play();blocked=false;cancel(limit);limit=later(()=>pause(),15000);emit();}catch(e){if(e.name==='NotAllowedError'){blocked=true;emit();return;}if(source!==fallback&&fallback){source=fallback;pause();try{a.src=source;await a.play();blocked=false;}catch(err){blocked=err.name==='NotAllowedError';}emit();}}}
  function interval(){clear(timer);if(active){timer=every(()=>{if(!previewing)void play(false);},(cfg?.intervalo||25)*1000);}}
  async function configure(c,newScope=scope){const id=newScope+':'+c.versao+':'+c.url;if(id===key)return;key=id;scope=newScope;cfg=c;fallback=(opts.assetBase||'')+(c.opcoes?.[0]?.url||'/assets/portal-sons/classico.wav');const n=++loadSeq;preparing=true;pause();emit();let next;
   try{if(c.tipo==='personalizado'){const blob=await (opts.fetchAudio?opts.fetchAudio(c.url):fetchAudio(c.url));if(n!==loadSeq)return;next=host.URL.createObjectURL(blob);}else next=(opts.assetBase||'')+c.url;}catch{next=fallback;}
   if(n!==loadSeq){if(next?.startsWith('blob:'))host.URL.revokeObjectURL(next);return;}if(objectURL)host.URL.revokeObjectURL(objectURL);objectURL=next?.startsWith('blob:')?next:'';source=next;preparing=false;previewing=false;a.src=source;interval();emit();void play(false);
  }
  async function fetchAudio(path){const base=host.API_URL||host.VPS_URL||host.location.origin,headers={},token=host.MobileAuth?.getToken();if(token)headers.Authorization='Bearer '+token;const r=await host.fetch(base+path,{credentials:'include',cache:'no-store',headers,signal:host.AbortSignal.timeout(15000)});if(!r.ok)throw Error('Áudio indisponível');return r.blob();}
  function setPending(value,newScope=scope){if(newScope!==scope){pause();release();scope=newScope;blocked=false;}const changed=active!==value;active=value;if(!value&&!previewing){pause();release();}if(changed){interval();if(value)void play(false);}emit();}
  function stop(){active=false;loadSeq++;key='';pause();clear(timer);release();source='';preparing=false;previewing=false;if(objectURL)host.URL.revokeObjectURL(objectURL);objectURL='';emit();}
  function enable(){blocked=false;return play(true);}
  async function preview(url,{volume=45}={}){pause();previewing=true;emit();try{a.src=url;a.volume=volume/100;await a.play();cancel(limit);limit=later(finishPreview,15000);}catch(e){finishPreview();throw e;}}
  function finishPreview(){pause();previewing=false;if(source)a.src=source;emit();}
  a.addEventListener?.('ended',()=>{cancel(limit);if(previewing)finishPreview();});
  a.addEventListener?.('error',()=>{if(previewing){finishPreview();return;}if(source&&source!==fallback&&fallback){pause();source=fallback;a.src=source;void play(false);}});
  const heartbeat=every(()=>{if(active&&!host.navigator?.locks)lider();},2000);
  function dispose(){disposed=true;stop();clear(heartbeat);}
  host.addEventListener?.('pagehide',stop);
  return {configure,setPending,stop,enable,preview,previewCurrent:()=>{if(preparing||!source)return Promise.reject(Error('Aguarde o carregamento do áudio.'));return preview(source,{volume:cfg?.volume??45});},finishPreview,status,dispose};
 }
 return {criar};
});
