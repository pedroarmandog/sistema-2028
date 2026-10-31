(async ()=>{
  try{
    const mod = require('./models/Agendamento');
    const Agendamento = mod && mod.Agendamento ? mod.Agendamento : null;
    if(!Agendamento) throw new Error('Modelo Agendamento não encontrado');
    await Agendamento.sync({ alter: true });
    console.log('Tabela Agendamento sincronizada');
    process.exit(0);
  }catch(e){
    try{
      console.error('Erro sync Agendamento:', e && (e.stack || e));
      console.error('Erro detalhado (JSON):', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
    }catch(_){
      console.error('Erro sync Agendamento (fallback):', e);
    }
    process.exit(1);
  }
})();
