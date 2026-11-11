// Executar uma vez no ambiente que usa o mesmo banco da API.
require("dotenv").config({path:require("node:path").resolve(__dirname,"../../.env")});
process.env.NODE_ENV ||= "production";
const {sequelize}=require("../models/Cliente");
async function migrar(){
  const [colunas]=await sequelize.query("SHOW COLUMNS FROM clientes LIKE 'sexo'");
  const coluna=colunas[0];
  if(!coluna) throw new Error("Coluna clientes.sexo não encontrada. Confira o schema configurado.");
  const tipo=coluna.Type || coluna.type || "";
  if (!/^enum\(/i.test(tipo)) {
    if (/^(?:var)?char|text/i.test(tipo)) { console.log("clientes.sexo já aceita texto.");return; }
    throw new Error("Tipo de clientes.sexo requer revisão manual.");
  }
  const valores=[...tipo.matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replace(/''/g,"'"));
  for(const v of ["Masculino","Feminino","Outro"])if(!valores.some(atual=>atual.toLowerCase()===v.toLowerCase()))valores.push(v);
  const opcoes=valores.map(v=>sequelize.escape(v)).join(",");
  await sequelize.query("ALTER TABLE clientes MODIFY COLUMN sexo ENUM("+opcoes+") NULL DEFAULT NULL");
  console.log("clientes.sexo atualizado para aceitar Masculino, Feminino e Outro, preservando as opções anteriores.");
}
migrar().catch(e=>{console.error("Migração de sexo:",e.message);process.exitCode=1;}).finally(()=>sequelize.close());
