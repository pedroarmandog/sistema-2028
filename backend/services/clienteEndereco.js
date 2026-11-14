const {DataTypes}=require('sequelize');
// Só acrescenta a coluna se faltar. Nunca altera tipo, valores ou índices existentes.
async function prepararEstrutura(db){
 const q=db.getQueryInterface(),tabela=db.models.Cliente?.getTableName()||'Clientes';
 const colunas=await q.describeTable(tabela);if(colunas.estado)return {criada:false};
 try{await q.addColumn(tabela,'estado',{type:DataTypes.STRING(2),allowNull:true});}
 catch(e){const atuais=await q.describeTable(tabela);if(!atuais.estado)throw e;}
 return {criada:true};
}
module.exports={prepararEstrutura};
