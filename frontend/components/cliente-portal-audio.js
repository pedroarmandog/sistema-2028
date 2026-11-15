(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else{root.PortalAudio=factory();if(root.PortalAudioGlobal?.version!==root.PortalAudio.VERSION){root.PortalAudioGlobal?.dispose?.();root.PortalAudioGlobal=root.PortalAudio.criar();}}})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const VERSION='20261115-continuidade3';
 function criar(opts={}){
  const host=opts.host||globalThis,a=opts.audio||new host.Audio(),every=opts.setInterval||host.setInterval.bind(host),clear=opts.clearInterval||host.clearInterval.bind(host),later=opts.setTimeout||host.setTimeout.bind(host),cancel=opts.clearTimeout||host.clearTimeout.bind(host),onChange=opts.onChange||(()=>{});
  let cfg=null,key='',scope='',active=false,blocked=false,preparing=false,previewing=false,source='',fallback='',objectURL='',timer,limit,loadSeq=0,owner=false,claiming=false,releaseLock,disposed=false;
  const DEVICE_KEY='pethub-audio-device-enabled-v1';
  let optedIn=false,remembered=false,confirmed=false,checking=false,checked=false,checkPromise=null,activationPromise=null,channel=null,channelScope='',lastOtherActive=false;const peers=new Map();
  try{optedIn=host.localStorage?.getItem(DEVICE_KEY)==='1';remembered=optedIn;}catch{}
  const ident=host.crypto?.randomUUID?.()||String(Math.random());
  function otherTabActive(){return [...peers.values()].some(p=>p.active&&Date.now()-p.at<7000);}
  function announce(){try{channel?.postMessage({id:ident,scope:channelScope,active:!!(owner&&active&&optedIn&&!blocked&&confirmed)});}catch{}}
  function joinChannel(value){if(channelScope===value&&channel)return;try{channel?.postMessage({id:ident,scope:channelScope,active:false});channel?.close();}catch{}channel=null;channelScope=value;peers.clear();lastOtherActive=false;if(!value||!host.BroadcastChannel)return;try{channel=new host.BroadcastChannel('pethub-audio-coord:'+value);channel.onmessage=e=>{const m=e.data;if(!m||m.id===ident||typeof m.id!=='string'||m.id.length>100||m.scope!==channelScope||typeof m.active!=='boolean')return;peers.set(m.id,{active:m.active,at:Date.now()});const other=otherTabActive();if(lastOtherActive!==other){lastOtherActive=other;emit();}};}catch{channel=null;}}

  const status=()=>({blocked,preparing,previewing,active,optedIn,remembered,confirmed,checking,checked,ready:!!source&&!preparing,otherTabActive:otherTabActive(),volume:cfg?.volume??45});const emit=()=>{onChange(status());host.dispatchEvent?.(new host.CustomEvent('pethub:audio-status',{detail:status()}));};
  function pause(){a.pause();try{a.currentTime=0;}catch{}cancel(limit);}
  function release(){owner=false;announce();releaseLock?.();releaseLock=null;try{const k='pethub-audio-lease:'+scope,r=JSON.parse(host.localStorage?.getItem(k)||'null');if(r?.id===ident)host.localStorage.removeItem(k);}catch{}}
  function lider(){if(opts.isLeader)return owner=opts.isLeader(scope);if(host.navigator?.locks){if(!owner&&!claiming&&scope){claiming=true;host.navigator.locks.request('pethub-audio:'+scope,{ifAvailable:true},lock=>{claiming=false;if(!lock)return;owner=true;return new Promise(resolve=>{releaseLock=resolve;if(!active||disposed){release();return;}void play(false);});}).catch(()=>{claiming=false;});}return owner;}
   try{const k='pethub-audio-lease:'+scope,now=Date.now(),r=JSON.parse(host.localStorage.getItem(k)||'null');if(r&&r.id!==ident&&r.ate>now)return owner=false;host.localStorage.setItem(k,JSON.stringify({id:ident,ate:now+6000}));return owner=JSON.parse(host.localStorage.getItem(k)).id===ident;}catch{return owner=host.document?.hasFocus?.()!==false;}}
  async function play(manual=false){if(disposed||preparing||previewing||!active||!source||(!manual&&(!optedIn||blocked))||!lider()||!a.paused)return;try{a.src=source;a.volume=(cfg?.volume??45)/100;await a.play();blocked=false;confirmed=true;announce();cancel(limit);limit=later(()=>pause(),15000);emit();}catch(e){if(e.name==='NotAllowedError'){blocked=true;release();emit();return;}if(source!==fallback&&fallback){source=fallback;pause();try{a.src=source;await a.play();blocked=false;confirmed=true;}catch(err){blocked=err.name==='NotAllowedError';if(blocked)release();}announce();emit();}}}
  function interval(){clear(timer);if(active&&optedIn){timer=every(()=>{if(!previewing)void play(false);},(cfg?.intervalo||25)*1000);}}
  async function configure(c,newScope=scope){const id=newScope+':'+c.versao+':'+c.url;if(id===key)return;key=id;scope=newScope;joinChannel(scope);cfg=c;fallback=(opts.assetBase||'')+(c.opcoes?.[0]?.url||'/assets/portal-sons/classico.wav');const n=++loadSeq;preparing=true;pause();emit();let next;
   try{if(c.tipo==='personalizado'){const blob=await (opts.fetchAudio?opts.fetchAudio(c.url):fetchAudio(c.url));if(n!==loadSeq)return;next=host.URL.createObjectURL(blob);}else next=(opts.assetBase||'')+c.url;}catch{next=fallback;}
   if(n!==loadSeq){if(next?.startsWith('blob:'))host.URL.revokeObjectURL(next);return;}if(objectURL)host.URL.revokeObjectURL(objectURL);objectURL=next?.startsWith('blob:')?next:'';source=next;preparing=false;previewing=false;a.src=source;interval();emit();void play(false);
  }
  async function fetchAudio(path){const base=host.API_URL||host.VPS_URL||host.location.origin,headers={},token=host.MobileAuth?.getToken();if(token)headers.Authorization='Bearer '+token;const r=await host.fetch(base+path,{credentials:'include',cache:'no-store',headers,signal:host.AbortSignal.timeout(15000)});if(!r.ok)throw Error('Áudio indisponível');return r.blob();}
  function setPending(value,newScope=scope){if(newScope!==scope){pause();release();scope=newScope;joinChannel(scope);blocked=false;}const changed=active!==value;active=value;if(!value&&!previewing){pause();release();}if(changed){interval();if(value)void play(false);}emit();}
  function stop(){active=false;loadSeq++;key='';pause();clear(timer);release();source='';preparing=false;previewing=false;if(objectURL)host.URL.revokeObjectURL(objectURL);objectURL='';joinChannel('');emit();}
  function rememberDevice(){optedIn=true;blocked=false;confirmed=true;remembered=false;try{host.localStorage.setItem(DEVICE_KEY,'1');remembered=true;}catch{}}
  function friendlyError(e){const map={NotAllowedError:['AUDIO_BLOCKED','O navegador bloqueou o som. Confira a configuração de som deste site e clique em ativar novamente.'],AbortError:['AUDIO_INTERRUPTED','A reprodução foi interrompida. Clique em ativar novamente.'],NotSupportedError:['AUDIO_FILE','O arquivo de som não pôde ser reproduzido. O som padrão será usado na próxima tentativa.'],TimeoutError:['AUDIO_TIMEOUT','O áudio demorou para carregar. Tente novamente.']};const [code,message]=map[e.name]||['AUDIO_FAILED','Não foi possível reproduzir o som. Tente novamente.'];return Object.assign(Error(message),{name:e.name||'Error',code});}
  function enableDevice(){
   if(activationPromise)return activationPromise;
   if(optedIn&&confirmed&&!blocked)return Promise.resolve({remembered,alreadyEnabled:true});
   if(preparing||checking||!source)return Promise.reject(Object.assign(Error('Aguarde o carregamento do som antes de ativar.'),{code:'AUDIO_NOT_READY'}));
   // preview chama play() sincronicamente, dentro do gesto real do usuário.
   activationPromise=(async()=>{try{
    await preview(source,{volume:cfg?.volume??45});rememberDevice();
    cancel(limit);limit=later(finishPreview,2000);interval();emit();return {remembered};
   }catch(e){if(e.name==='NotAllowedError')blocked=true;else if(fallback&&source!==fallback){source=fallback;a.src=source;}emit();throw friendlyError(e);
   }finally{activationPromise=null;}})();return activationPromise;
  }
  function checkDevice(){
   if(optedIn)return Promise.resolve(true);
   if(checkPromise)return checkPromise;
   if(checked||preparing||!source)return Promise.resolve(false);
   checking=true;checked=true;previewing=true;pause();emit();
   checkPromise=(async()=>{let watchdog;try{
    a.src=source;a.volume=(cfg?.volume??45)/100;
    await Promise.race([a.play(),new Promise((_,reject)=>{watchdog=later(()=>reject(Object.assign(Error('Timeout'),{name:'TimeoutError'})),10000);})]);
    rememberDevice();return true;
   }catch(e){if(e.name==='NotAllowedError')blocked=true;else if(fallback&&source!==fallback)source=fallback;return false;
   }finally{cancel(watchdog);pause();previewing=false;checking=false;if(source)a.src=source;checkPromise=null;interval();emit();}})();return checkPromise;
  }
  function enable(){return enableDevice();}
  function resumeFromGesture(){if(optedIn&&blocked&&active&&!preparing&&!previewing){blocked=false;return play(true);}return Promise.resolve();}
  async function preview(url,{volume=45}={}){pause();previewing=true;emit();try{a.src=url;a.volume=volume/100;await a.play();cancel(limit);limit=later(finishPreview,15000);}catch(e){finishPreview();throw e;}}
  function finishPreview(){pause();previewing=false;if(!active)release();if(source)a.src=source;emit();}
  a.addEventListener?.('ended',()=>{cancel(limit);if(previewing)finishPreview();});
  a.addEventListener?.('error',()=>{if(previewing||checking)return;if(source&&source!==fallback&&fallback){pause();source=fallback;a.src=source;void play(false);}});
  const heartbeat=every(()=>{for(const [id,p]of peers)if(Date.now()-p.at>=7000)peers.delete(id);if(active&&optedIn&&!blocked){if(!host.navigator?.locks){const wasOwner=owner;if(lider()&&!wasOwner)void play(false);}else if(!owner&&!claiming&&!otherTabActive())void play(false);}announce();const other=otherTabActive();if(lastOtherActive!==other){lastOtherActive=other;emit();}},2000);
  function dispose(){disposed=true;stop();clear(heartbeat);}
  host.addEventListener?.('pagehide',stop);
  host.addEventListener?.('storage',e=>{if(e.key!==DEVICE_KEY)return;optedIn=e.newValue==='1';remembered=optedIn;if(!optedIn){pause();release();}interval();emit();if(optedIn)void play(false);});
  return {version:VERSION,configure,setPending,stop,enable,enableDevice,checkDevice,resumeFromGesture,preview,previewCurrent:()=>{if(preparing||!source)return Promise.reject(Error('Aguarde o carregamento do áudio.'));return preview(source,{volume:cfg?.volume??45});},finishPreview,status,dispose};
 }
 return {criar,VERSION};
});
