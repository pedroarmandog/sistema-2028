// Script para adicionar colunas de medicamentos na tabela `itens` se estiverem faltando
// Uso: node scripts/add-medicamento-columns.js

const Produto = require('../backend/models/Produto');
const sequelize = Produto.sequelize;

(async function(){
  try{
    await sequelize.authenticate();
    console.log('Conectado ao DB com sucesso. Verificando colunas...');

    const cols = [
      { name: 'controlado', sql: "VARCHAR(16) DEFAULT NULL" },
      { name: 'principioAtivo', sql: "VARCHAR(256) DEFAULT NULL" },
      { name: 'formaFarmaceutica', sql: "VARCHAR(128) DEFAULT NULL" },
      { name: 'apresentacao', sql: "VARCHAR(128) DEFAULT NULL" },
      { name: 'viaAdministracao', sql: "VARCHAR(128) DEFAULT NULL" },
      { name: 'tipoFarmacia', sql: "VARCHAR(64) DEFAULT NULL" }
    ];

    for(const c of cols){
      try{
        const [results] = await sequelize.query("SHOW COLUMNS FROM itens LIKE :col", { replacements: { col: c.name } });
        if(!results || results.length === 0){
          console.log(`Coluna '${c.name}' não encontrada — adicionando...`);
          await sequelize.query(`ALTER TABLE itens ADD COLUMN \`${c.name}\` ${c.sql}`);
          console.log(`Coluna '${c.name}' criada.`);
        } else {
          console.log(`Coluna '${c.name}' já existe, pulando.`);
        }
      }catch(err){
        console.error('Erro verificando/adicionando coluna', c.name, err && err.message ? err.message : err);
      }
    }

    console.log('Verificação concluída. Reinicie o servidor (nodemon) para aplicar alterações.');
    process.exit(0);
  }catch(err){
    console.error('Falha ao conectar/alterar DB:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
