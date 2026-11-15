'use strict';
const {falha}=require('./armazenamento');
const MAX_BYTES=2*1024*1024,MAX_SEGUNDOS=15;
// Valida uma cadeia completa de frames MPEG Layer III. Tags são descartadas.
// Não executa binários, decodificadores externos ou conteúdo fornecido pelo usuário.
function validarMP3(bytes){
 if(!Buffer.isBuffer(bytes)||!bytes.length)throw falha('Selecione um MP3 válido.',400);
 if(bytes.length>MAX_BYTES)throw falha('O MP3 deve ter até 2 MB.',413);
 let start=0,end=bytes.length;
 if(bytes.subarray(0,3).toString()==='ID3'){
  if(bytes.length<10||![2,3,4].includes(bytes[3])||[6,7,8,9].some(i=>bytes[i]&128))throw falha('Cabeçalho MP3 inválido.',400);
  const size=(bytes[6]<<21)|(bytes[7]<<14)|(bytes[8]<<7)|bytes[9];start=10+size+(bytes[3]===4&&(bytes[5]&16)?10:0);
  if(start>bytes.length||size>256*1024)throw falha('Metadados do MP3 inválidos ou excessivos.',400);
 }
 if(end-start>=128&&bytes.subarray(end-128,end-125).toString()==='TAG')end-=128;
 const rates=[44100,48000,32000],mpeg1=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320],mpeg2=[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
 let pos=start,frames=0,duracao=0;
 while(pos<end){
  if(pos+4>end)throw falha('MP3 incompleto ou corrompido.',400);
  const h=bytes.readUInt32BE(pos),version=(h>>>19)&3,layer=(h>>>17)&3,bitrateIndex=(h>>>12)&15,sampleIndex=(h>>>10)&3,padding=(h>>>9)&1;
  if((h>>>21)!==2047||version===1||layer!==1||bitrateIndex===0||bitrateIndex===15||sampleIndex===3)throw falha('Envie um arquivo MP3 Layer III válido, sem dados extras.',400);
  const sr=rates[sampleIndex]/(version===3?1:version===2?2:4),bitrate=(version===3?mpeg1:mpeg2)[bitrateIndex]*1000;
  const tamanho=Math.floor((version===3?144:72)*bitrate/sr)+padding;
  if(tamanho<24||pos+tamanho>end)throw falha('MP3 truncado ou inválido.',400);
  duracao+=(version===3?1152:576)/sr;frames++;pos+=tamanho;
  if(duracao>MAX_SEGUNDOS)throw falha('Use um alerta MP3 de até 15 segundos.',400);
 }
 if(frames<3)throw falha('O arquivo não contém áudio MP3 suficiente.',400);
 return {bytes:Buffer.from(bytes.subarray(start,end)),tipo:'audio/mpeg',ext:'mp3',duracao};
}
module.exports={validarMP3,MAX_BYTES,MAX_SEGUNDOS};
