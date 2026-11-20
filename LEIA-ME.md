# PetHub — Auditoria do comprovante de venda

## Instalação

Este pacote atualiza os ajustes anteriores de caixa, clientes e logo nos PDFs. Faça backup dos arquivos correspondentes.

1. Aplique TODOS os arquivos de `backend` e `frontend`, mantendo seus caminhos. Inclua o novo `frontend/components/venda-calculos.js`: o caixa e o backend utilizam esse mesmo módulo. Não envie somente os dois arquivos de Nova Venda.
2. Faça deploy/reinicie o serviço e recarregue Nova Venda. O HTML está versionado para evitar scripts antigos em cache. O HTML de agendamento-detalhes também carrega o módulo compartilhado antes do pagamento.
3. Gere novamente o comprovante. PDFs já baixados não mudam.

Não é necessária migração, comando SQL, nova variável de ambiente nem alteração de dependências de produção. O pacote reutiliza PDFKit e o serviço de logo com sharp do ajuste anterior. Não substitua package.json/lock por versões antigas.

Se há mudanças mais recentes próprias nesses arquivos, revise/aplique `ALTERACOES.patch`, preservando suas alterações. Não remova o serviço de identidade `backend/services/identidadeEmpresaPDF.js` entregue anteriormente.

## Resultado

- Horário explícito de Brasília (`America/Sao_Paulo`), usando a data registrada da venda. Não depende do TZ do Render e não altera timestamps no banco.
- Quantidade/unidade/código/descrição/preço e descontos retirados do snapshot salvo nos itens. Não consulta preço atual do produto para reimprimir.
- Desconto individual separado do geral. O preço unitário bruto não é rebaixado e depois descontado de novo.
- Total líquido da venda independente do valor pago. Pagamentos parciais exibem saldo; dinheiro detalha recebido/troco quando registrado.
- Valores monetários com cálculo decimal e arredondamento em centavos compartilhado entre caixa e validação do backend.
- Logo e empresa continuam seguindo o cadastro e o isolamento do ajuste anterior. Comprovante permanece no formato de cupom.

Veja `AUDITORIA.md` para detalhes dos problemas, decisões, arquivos, testes e limitações. `TESTES.txt` contém o resultado real: **35 testes passaram**.

Após publicar, confira uma venda real com desconto no item + desconto geral, compare o total do caixa com o PDF e valide a data/hora registrada. Não foram acessados seu Render, banco TiDB ou armazenamento R2 nesta auditoria.
