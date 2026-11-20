'use strict';
// Read only: never infer a company's name from another tenant or from its logo.
function nomeEmpresa(empresa) {
  const campos=['nomeFantasia','nome_fantasia','nomeEmpresa','nome','razaoSocial','razao_social'];
  for(const campo of campos){
    const valor=empresa?.[campo];
    if(typeof valor!=='string'||!valor.trim())continue;
    const nome=valor.trim();
    if(/^pet[\s_-]*cria(?:\s+ltda\.?)?$/i.test(nome))continue;
    return nome;
  }
  return 'Seu pet shop';
}
module.exports={nomeEmpresa};
