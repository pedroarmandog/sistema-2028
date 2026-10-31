(async ()=>{
  try{
    const models = require('./models');
    const sequelize = models && models.sequelize ? models.sequelize : null;
    if(!sequelize) throw new Error('sequelize não disponível via models.index');
    const [rows] = await sequelize.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='petshop'");
    console.log(rows.map(r=>r.TABLE_NAME));
    process.exit(0);
  }catch(e){
    console.error('Erro list-tables:', e && e.stack || e);
    process.exit(1);
  }
})();
