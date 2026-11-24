function normalizarSexo(valor) {
  if (valor == null || String(valor).trim() === "") return null;
  const opcoes = {masculino:"Masculino", feminino:"Feminino", outro:"Outro", m:"Masculino", f:"Feminino"};
  const normalizado = opcoes[String(valor).trim().toLowerCase()];
  if (!normalizado) {
    const erro = new Error("Sexo inválido. Selecione Masculino, Feminino ou Outro.");
    erro.status = 400;
    throw erro;
  }
  return normalizado;
}
module.exports = {normalizarSexo};
