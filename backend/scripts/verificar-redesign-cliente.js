'use strict';
// Read-only preflight: no database connection or credential output.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');let errors=0;
for(const file of ['frontend/cliente-app/visual.js','frontend/cliente-app/premium.css','frontend/cliente-app/assets/boas-vindas.webp','frontend/components/cliente-portal-visuais.js','frontend/components/cliente-portal-visuais.css','backend/services/midias/index.js','backend/services/midias/armazenamento.js','backend/services/midias/validar.js']){
 if(!fs.existsSync(path.join(root,file))){console.error('Ausente: '+file);errors++;}
}
try{require.resolve('sharp',{paths:[root]});console.log('OK: sharp disponível.');}catch{console.error('Instale na raiz: npm install sharp --save. Envie package.json e package-lock.json ao repositório.');errors++;}
console.log(errors?'Há arquivos/dependências pendentes. Preserve ou recupere os módulos de mídias originais antes de publicar.':'Arquivos e dependências encontrados. Confirme que o armazenamento de mídias está usando o R2 persistente.');
process.exitCode=errors?1:0;
