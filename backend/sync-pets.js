(async ()=>{
  try{
    const Pet = require('./models/Pet');
    if(!Pet || typeof Pet.sync !== 'function') throw new Error('Modelo Pet não exporta sync');
    await Pet.sync({ alter: true });
    console.log('Tabela pets sincronizada');
    process.exit(0);
  }catch(e){
    console.error('Erro sync pets:', e && (e.stack || e));
    process.exit(1);
  }
})();
