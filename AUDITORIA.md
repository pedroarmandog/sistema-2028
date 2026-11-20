# Auditoria dos comprovantes de venda — resultado

## Inconsistências encontradas e corrigidas

| Problema no código anterior | Correção |
|---|---|
| `toLocaleTimeString` sem timeZone usava o fuso do processo | Formatação com `America/Sao_Paulo`, sem subtrair horas manualmente |
| Campo chamado emissão misturava registro da venda com impressão | Rótulo “Data da venda”, baseado em `venda.data` persistida |
| Unidade fixa `KG` para todos os produtos/serviços | Unidade do snapshot, fallback `UN` ou `SERV` sem inferir peso da embalagem |
| `totalPago` substituía o total líquido | Total consolidado da transação permanece independente dos pagamentos |
| `totais.desconto` podia conter desconto dos itens e ser subtraído novamente como geral | Novas vendas discriminam `descontoItens` e `descontoGeral`; compatibilidade com consolidações antigas |
| Testes com `||` descartavam valores zero válidos | Leitura explícita de valores nulos/ausentes e preservação de zero |
| Desconto alterava unitário e depois incidia novamente no cálculo | Unitário bruto permanece e percentual entra uma vez no total do item |
| Funções de desconto e estoque tratavam uma Promise como array | Removido cálculo duplicado e corrigida espera da consulta de estoque |
| Totais de campos podiam interpretar mal separadores brasileiros | Parser decimal compartilhado aceita vírgula e milhar em valores monetários |
| Venda pendente já enviava `totalPago` igual ao total | Novas vendas pendentes iniciam com zero pago |
| Descrições e blocos usavam incrementos verticais fixos | Altura medida por texto, quebra de página e valores alinhados sem sobreposição |
| Troco/recebido e pagamentos separados ausentes no papel | Detalhamento dos valores persistidos, sem transformar troco em receita |

## Data e fuso horário

O campo `Venda.data` é DATE do Sequelize, com padrão `DataTypes.NOW`. A conexão disponível usa o padrão UTC e não define conversão adicional nesta configuração. O problema identificado estava na formatação do comprovante, que herdava o TZ do servidor.

A correção formata a data recuperada com `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`. Datas SQL sem offset são tratadas como UTC nesta base. Não há alteração global do timezone da API nem conversão de registros históricos.

Exemplos testados: `2026-11-20T22:01:00Z` → **20/11/2026 19:01**; `2026-11-21T00:30:00Z` → **20/11/2026 21:30**. O mesmo resultado foi verificado com TZ do processo em UTC, Los Angeles e Tóquio.

Na captura, **21:59 UTC corresponde a 18:59 em Brasília**. Se o PDF foi aberto às 19:01, essa diferença de dois minutos pode corresponder ao intervalo desde o registro da venda. A reimpressão mostra a data gravada da venda, não substitui pela hora atual da abertura do PDF.

## Descontos e totais

O módulo compartilhado usa operações decimais com BigInt e arredondamento para centavos. O preço unitário é monetário com duas casas; multiplicação por quantidades fracionadas e percentuais é arredondada na linha do item. Totais somam centavos das linhas.

Exemplo: item de R$ 100,00 com 10% → bruto R$ 100,00, desconto do item R$ 10,00, subtotal R$ 90,00. Desconto geral de R$ 9,00 → líquido R$ 81,00; total de descontos R$ 19,00. Não há segunda subtração do desconto do item.

Nas novas vendas, o JSON `totais` mantém as propriedades anteriores e acrescenta `versaoCalculo: 2`, `descontoItens` e `descontoGeral`. Não exige coluna nova. A validação de itens no servidor usa o mesmo cálculo do caixa. O PDF prioriza valores consolidados salvos e só usa o cálculo compartilhado para campos ausentes.

Vendas antigas mantêm os dados originais. Quando o histórico usa `desconto` com significado antigo, o leitor distingue desconto consolidado/geral comparando com os totais registrados. Se o registro estiver incompleto ou não fechar matematicamente, imprime um aviso em vez de modificar o banco ou ocultar a inconsistência. Uma venda historicamente gravada com desconto duplicado não é recalculada retroativamente.

## Itens, pagamentos e identidade

Código, nome, quantidade, unidade, preço e totais dos itens vêm exclusivamente do JSON salvo na venda. A alteração posterior do preço do cadastro não muda a reimpressão.

PIX, dinheiro, cartões, crediário, haver, cheque e modalidades históricas são exibidos conforme os registros. Pagamento misto mantém cada valor separado. Valores `recebido`, `troco` e parcelas são mostrados quando existem. Sem informação histórica de troco, o sistema não inventa esse valor; registra eventual excesso separadamente.

O total líquido é `totais.final` quando disponível, inclusive se for zero. Pagamento parcial não muda o valor da venda e exibe saldo a pagar.

Empresa e logo continuam sendo carregadas pelo serviço de identidade já corrigido; logo personalizada tem prioridade, com padrão PetHub quando ausente. Nome/telefone/endereço da empresa são apresentados quando preenchidos e aplicáveis. Cliente usa prioritariamente o nome salvo na venda. A consulta complementar do cliente exige a mesma empresa da venda.

Operador só é exibido quando há identificação gravada na própria transação. O modelo legado disponível não armazena esse nome sistematicamente; não foi atribuído o operador atual da reimpressão a uma venda antiga.

## Arquivos e funções

| Arquivo | Responsabilidade |
|---|---|
| `frontend/components/venda-calculos.js` | `centavos`, `calcularItem` e `calcularTotais`, sem consultar banco |
| `frontend/atendimento/nova-venda.js` | Aplica desconto uma vez, corrige parsing/estoque assíncrono e grava totais discriminados |
| `frontend/atendimento/nova-venda.html` | Carrega cálculo compartilhado e nova versão do script |
| `frontend/agendamento-detalhes.html` | Mantém o pagamento compartilhado com a mesma dependência |
| `backend/services/validarVendaCaixa.js` | Valida itens usando o mesmo arredondamento do caixa |
| `backend/services/comprovanteVendaDados.js` | `resumirVenda`, `dataBrasilia`, leitura de JSON e compatibilidade histórica |
| `backend/services/comprovanteVendaPDF.js` | `gerarComprovanteVenda`, organização do cupom e paginação |
| `backend/routes/vendaRoutes.js` | Mantém a rota de comprovante, consulta por empresa e entrega o PDF gerado |
| `tests/*` incluídos | Casos novos e regressões de caixa/identidade |

A rota continua `/api/vendas/:id/comprovante`, usada por Nova Venda e reimpressões/listagens. Não foi criado outro endpoint de venda, baixa de estoque ou lançamento financeiro. Outros PDFs de atendimento/orçamento possuem geradores próprios e não tiveram seus cálculos reescritos nesta auditoria.

## Testes executados

**35 testes passaram; zero falhas.** Incluem:

- sem desconto; desconto individual; desconto geral percentual e em reais; ambos juntos;
- acréscimos e arredondamento negativo;
- múltiplos produtos, serviços, quantidade maior que um e fracionada;
- vírgula e separador de milhar; arredondamento de centavos;
- PIX, crédito, débito, dinheiro, crediário, haver, cheque e misto;
- recebido, troco, saldo parcial e preservação de total zero em histórico;
- JSON histórico serializado; desconto legado combinado/isolado; reimpressão sem mudar preço;
- Brasília com mudança de TZ do processo e virada de data;
- logo personalizada/padrão, remoção de logo e isolamento entre empresas;
- busca de clientes, teclado, leitura de código, alternância de layout e finalização sem chamada duplicada;
- geração de PDF real com 55 itens e descrições longas. Texto extraído com PyMuPDF confirmou múltiplas páginas e ausência de palavras fora dos limites horizontais/verticais.

A suíte usa os scripts reais de tela em JSDOM com API simulada, banco SQLite em memória para preferências/validação e PDFKit real para os documentos. As rotas reais de comprovante e relatórios também foram exercitadas com cadastros/mídias simulados. Testes de layout utilizam Python 3 + PyMuPDF somente no desenvolvimento; não são dependências de produção.

## Limites e validação após deploy

Não foi possível confrontar os dados diretamente com seu TiDB/Render/R2. Não houve migração, UPDATE financeiro, alteração global de timezone nem modificação de registros antigos. Registros incompletos não podem recuperar preço, unidade, operador ou troco que nunca foram salvos. A primeira emissão e reimpressão usam a mesma leitura do registro.

A finalização de vendas de valor zero continua sujeita à regra de pagamento existente; o teste de zero valida a leitura/reimpressão de transações já registradas, sem liberar uma modalidade de venda gratuita nova.

Após publicar, faça uma venda de teste em cada caixa, compare os valores salvos e o PDF, teste desconto de item + geral e reimprima uma venda antiga. Se sua base possuir datas SQL históricas deliberadamente armazenadas em horário local sem offset, avalie essa origem antes de qualquer migração: este ajuste não tenta reescrever esses registros.
