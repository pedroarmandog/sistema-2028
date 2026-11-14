const https=require('node:https'),dns=require('node:dns/promises'),net=require('node:net');
const {falha}=require('./armazenamento');
const proibidos=new net.BlockList();
for(const [ip,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])proibidos.addSubnet(ip,prefix);
const global6=new net.BlockList();global6.addSubnet('2000::',3,'ipv6');proibidos.addSubnet('2001:db8::',32,'ipv6');
function publico(ip){const family=net.isIP(ip);return family===4?!proibidos.check(ip,'ipv4'):family===6&&global6.check(ip,'ipv6')&&!proibidos.check(ip,'ipv6');}
async function lerRemoto(ref,{hosts=[],lookup=dns.lookup}={}){
 const url=new URL(ref);if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password||url.hash||!hosts.includes(url.hostname))throw falha('URL não autorizada. Informe o host conhecido em MEDIA_MIGRATION_HOSTS ou utilize um backup local.',400);
 const ips=await lookup(url.hostname,{all:true,verbatim:true});if(!ips.length||ips.some(i=>!publico(i.address)))throw falha('Endereço de rede não permitido para recuperação.',400);
 return new Promise((resolve,reject)=>{const a=ips[0];
  const req=https.get(url,{lookup:(h,o,cb)=>o.all?cb(null,[a]):cb(null,a.address,a.family),timeout:15000},res=>{
   if(res.statusCode!==200){res.resume();return reject(falha('URL antiga não retornou o arquivo (HTTP '+res.statusCode+').',404));}
   const chunks=[];let n=0;res.on('data',b=>{n+=b.length;if(n>20*1024*1024)req.destroy(falha('Arquivo remoto excede 20 MB.',413));else chunks.push(b);});res.on('end',()=>resolve({bytes:Buffer.concat(chunks),origem:'url-antiga'}));res.on('error',reject);
  });req.on('timeout',()=>req.destroy(falha('Tempo esgotado ao recuperar URL antiga.')));req.on('error',reject);
 });
}
module.exports={lerRemoto,publico};
