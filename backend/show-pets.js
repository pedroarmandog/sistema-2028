(async ()=>{
  try{
    const models = require('./models');
    const sequelize = models && models.sequelize ? models.sequelize : null;
    if(!sequelize) throw new Error('sequelize não disponível via models.index');
    const [rows] = await sequelize.query("SHOW CREATE TABLE pets");
    console.log(rows);
    process.exit(0);
  }catch(e){
    console.error('Erro show-pets:', e && e.stack || e);
    process.exit(1);
  }
})();
