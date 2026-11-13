// Executar no Shell do Render. Não abre socket WhatsApp nem solicita QR.
const empresa=process.argv[2];
if(!empresa||!/^[1-9]\d*$/.test(empresa)){
  console.error('Uso: node backend/scripts/diagnostico-whatsapp.js ID_DA_EMPRESA');process.exitCode=2;
}else{
  require('dotenv').config({quiet:true});
  process.env.NODE_ENV='production'; // Somente leitura; sem monitor de desenvolvimento.
  const {sequelize}=require('../models/Cliente');
  (async()=>{
    try{
      const eventos=await require('../services/whatsappDiagnostico').historico(empresa);
      console.log(JSON.stringify({empresaId:empresa,eventos},null,2));
    }catch{console.error('Não foi possível ler o histórico. Confira a conexão/permissões do banco.');process.exitCode=1;}
    finally{await sequelize.close();}
  })();
}
