// A flag belongs to an appointment, never to the pet or customer.
function normalizarTaxidog(valor) {
  if (valor == null) return false;
  if (valor === true || valor === 1 || valor === '1' || valor === 'true') return true;
  if (valor === false || valor === 0 || valor === '0' || valor === 'false') return false;
  const erro = new Error('Táxi Dog deve ser ativado ou desativado.');
  erro.status = 400;
  throw erro;
}
module.exports = { normalizarTaxidog };
