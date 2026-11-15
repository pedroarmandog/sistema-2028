# PetHub — logo oficial da empresa nos PDFs

O pacote contém somente arquivos novos/alterados desta correção. Copie as pastas para a raiz do projeto, mantendo os caminhos. Use a versão atual do seu projeto, com as correções de mídias persistentes anteriores já aplicadas. A lista completa está em ARQUIVOS-ALTERADOS.txt. Se você fez edições posteriores nos mesmos arquivos, compare antes de substituir.

## Causa identificada

O faturamento tentava buscar a imagem como `/uploads/${empresa.logo}`, embora a logo atual também possa ser uma referência de mídia permanente. O backend dava prioridade a `companyLogo` enviado pelo navegador e até tentava interpretar qualquer string como base64. Um buffer inválido, mas não vazio, impedia a consulta da logo oficial e só falhava ao desenhar. Havia alternativas com imagem fixa da marca do sistema em vários geradores. O faturamento também não desenhava o nome da empresa no cabeçalho.

O comprovante de venda já utilizava o carregador de mídias do backend. Essa leitura, que suporta o armazenamento persistente e converte imagens para PNG em memória, foi reutilizada.

## Correção

O serviço `backend/services/identidadeEmpresaPDF.js` consulta a empresa pelo `req.user.empresaId` validado pelo middleware existente e lê a logo atual no armazenamento oficial. Não aceita empresa, arquivo ou logo definidos no payload do relatório. Não mantém cache global de imagens e não cria arquivos temporários de produção.

Os relatórios PDFKit e comprovantes passam a usar essa identidade. As imagens são incorporadas como bytes ao PDF: depois de baixado, o documento não precisa acessar R2, cookies ou URLs para exibir a logo. Logo ausente/indisponível é omitida; a marca de outra empresa ou a logo fixa PetHub não substituem a imagem.

O faturamento apresenta logo proporcional e centralizada, nome oficial, título e período. A imagem fica limitada a 110 x 70 pontos, preservando a proporção, e o restante do cabeçalho é posicionado pela altura efetiva. A tabela, filtros, cálculos e totais existentes foram preservados. Os comprovantes continuam com as dimensões térmicas anteriores.

Para PDFs gerados no navegador, GET autenticado `/api/empresas/identidade-pdf` retorna somente dados de identificação/endereço necessários e a imagem normalizada incorporável. É uma consulta sem cache e sem escrita. O formato padrão é PNG; `?formato=jpeg` oferece uma alternativa compatível com o visualizador legado. Nenhuma credencial do armazenamento é retornada.

Respostas PDF geradas no backend usam `Cache-Control: private, no-store`, evitando que um GET reaproveite um comprovante antigo após troca de logo/conta. PDFs já baixados não são alterados retroativamente.

## Auditoria dos geradores encontrados

| Gerador real | Verificação/correção e limite |
|---|---|
| Faturamento — POST /api/relatorios/faturamento/pdf | Fonte oficial, cabeçalho centralizado, bytes incorporados; geração e renderização verificadas |
| Venda no período — GET /api/relatorios/venda-no-periodo/pdf | Ignora logo/nome/arquivo enviados por query; geração e renderização verificadas |
| Comissão — POST /api/relatorios/comissao/pdf | Reutiliza identidade oficial; imagem limitada ao espaço do cabeçalho; geração/renderização verificadas |
| Atendimentos no período — POST /api/relatorios/atendimento-periodo/pdf | Identidade oficial com imagem proporcional; geração/renderização verificadas |
| Produtos — GET /api/relatorios/produtos/pdf | Remove alternativa de logo fixa; geração/renderização verificadas. Os produtos de exemplo já existentes nessa rota NÃO foram substituídos por dados reais nesta tarefa |
| Produtos — POST /api/relatorios/produtos/pdf | Usa identidade oficial, ignorando logo/razão do payload; geração/renderização verificadas. O fallback anterior de produtos de exemplo continua quando não há produtos enviados |
| Outras entradas — POST /api/relatorios/entradas/pdf | Usa identidade oficial; geração/renderização verificadas. A tela de outras saídas usa o mesmo gerador, conforme código existente |
| Fornecedores — POST /api/relatorios/fornecedores/pdf | Remove logo fixa e consulta a identidade oficial; posição original à esquerda preservada; geração/renderização verificadas |
| Demonstrativo de resultados — POST /api/relatorios/demonstrativo-resultados/pdf | Consulta logo/nome oficiais; geração/renderização verificadas. Os valores demonstrativos hardcoded anteriores continuam: este trabalho NÃO tornou o DRE um relatório financeiro real |
| Comprovante de Nova Venda | Logo oficial atual e consulta da venda limitada à empresa autenticada; PDF gerado/renderizado com largura de 204 pontos, mantendo a configuração térmica de 72 mm |
| Comprovante de orçamento | Logo oficial, autenticação na impressão e validação da empresa pelo cliente vinculado; geração/renderização verificadas; restrição de legado abaixo |
| Comprovante de atendimento/agendamento | Carregador compartilhado, sem trocar o layout térmico; geração/renderização verificadas |
| Prontuário do atendimento | Elimina escolha de empresa por query e alternativa da primeira empresa ativa; usa sessão autenticada; geração/renderização verificadas |
| Recibo de fornecedor — jsPDF no navegador | Passa a obter imagem PNG e identificação pelo endpoint oficial; preserva o desenho do recibo. Código e sintaxe revisados; não foi executado em navegador nesta sessão |
| Recebíveis por produto — jsPDF no navegador | Consulta identidade oficial e remove razão social fixa Pet Cria. Continua sendo implementação demonstrativa, como já era; não passou a consultar recebíveis reais. Sem teste visual em navegador |
| Contratos — HTML com opção Imprimir/PDF | Consulta identidade oficial e insere imagem incorporada. Aguarda carregar a identidade/imagem antes de habilitar o botão PDF. Continua usando o conjunto demonstrativo anterior de contratos. Sem teste da impressão do navegador |
| Faturamento — visualizador/template Stimulsoft legado | Adiciona logo incorporada e identidade atual. Ajusta serialização de textos/fontes/margens e alias da fonte de dados para a versão instalada; mantém valores e fórmula de soma. Corrige URL do viewer e serve somente os 3 recursos necessários, em rota autenticada, sem expor node_modules. Template exportado com o motor real em Node e renderizado; não testado no navegador. Tipos de template produtos/default referenciados pelo viewer não existem no projeto e não foram inventados |
| Etiquetas — POST /api/relatorios/etiquetas/pdf | Etiquetas/códigos de barras, sem cabeçalho institucional. Mantidas sem inserir logo para não alterar posição, medidas ou leitura dos códigos. Não é apresentado como PDF institucional padronizado |
| Entrada de mercadoria — generate-danfe e GET /:id/danfe | Documento interno simplificado recebe identificação oficial; GET limita a entrada à empresa autenticada e não cria documento fictício quando não encontra o registro. Ambos gerados e renderizados. Não equivale a DANFE autorizado pela SEFAZ |
| DANFE da Central Fiscal | O serviço retorna documento já produzido pela Focus. Inspecionado e preservado; não foi reescrito nem recebeu marca por cima. A personalização do documento fiscal fornecido externamente depende do provedor. Não houve emissão nem chamada real à Focus |
| Laboratório fiscal local | Produz PDF fictício para testes. Preservado; não deve receber identidade de uma empresa real |
| Documentos anexados ao pet | São arquivos enviados/abertos pelo usuário, não PDFs gerados pelo PetHub. Não foram alterados |

## Limites importantes encontrados

1. **Orçamentos legados:** o model/tabela existente não possui empresa_id. Para não adivinhar a empresa de um documento, a impressão só é liberada quando o cliente vinculado pertence à empresa autenticada. Sem esse vínculo comprovado, retorna HTTP 409 explicativo. Vincule um cliente da empresa para imprimir. Esta correção não migra os orçamentos nem reestrutura seu CRUD/listagem. Uma revisão geral do isolamento do módulo de orçamentos permanece necessária fora do escopo dos PDFs.
2. **Relatórios demonstrativos:** DRE, recebíveis por produto, contratos e alguns caminhos do catálogo ainda têm exemplos/mocks existentes no projeto. A inclusão da logo não valida seus dados como financeiros reais. Nenhum cálculo foi substituído nesta tarefa.
3. **Stimulsoft:** o motor instalado informa licença Trial e insere marca-d'água. No teste Node, o recurso gráfico da própria marca Trial também apresentou aviso de formato de imagem ao renderizar; a logo oficial JPEG foi incorporada corretamente. A licença/recursos do fornecedor não foram modificados. O PDF moderno do faturamento usa PDFKit e não depende desse visualizador nem dessa licença.
4. **Etiquetas, anexos, documentos da Focus e laboratório** não foram artificialmente alterados para adicionar uma logo. Por isso, este pacote não afirma que absolutamente todo arquivo PDF possível do sistema foi modificado.
5. Logos antigas já perdidas no armazenamento temporário não podem ser recuperadas pelo código. Se o registro aponta para um arquivo inexistente, o PDF sai sem logo; reenvie-a pelo cadastro da empresa com o armazenamento permanente configurado.

## Arquivos entregues

- `backend/services/identidadeEmpresaPDF.js`: serviço compartilhado, desenho proporcional e endpoint de leitura.
- `backend/routes/empresaRoutes.js`: registra identidade-pdf antes de /:id.
- `backend/routes/relatoriosRoutes.js`: integra os relatórios institucionais e recursos do viewer.
- `backend/routes/vendaRoutes.js`: identidade oficial e consulta isolada na impressão.
- `backend/routes/orcamentoRoutes.js`: identidade/autenticação e comprovação de vínculo na impressão legada.
- `backend/routes/agendamentoRoutes.js`: identidade compartilhada e correção do prontuário.
- `backend/entrada-mercadoria/dist/routes/entradaRouter.js`: contexto da empresa, consulta isolada e resposta sem cache.
- `backend/entrada-mercadoria/dist/utils/danfeGenerator.js`: cabeçalho do documento interno.
- `backend/entrada-mercadoria/src/utils/danfeGenerator.ts` e `src/controllers/entradaController.ts`: mantém a chamada do gerador fonte compatível com o contexto autenticado. O router ativo do backend principal é o arquivo dist; o serviço Prisma legado separado não foi reestruturado.
- `frontend/api/api-client.js`: método de consulta oficial da identidade.
- `frontend/painel/rel-faturamento.js`: remove busca pelo caminho antigo /uploads.
- `frontend/painel/rel-recebiveis-produto.js`: identidade oficial para o jsPDF.
- `frontend/compras/fornecedor-perfil.js`: identidade oficial para o recibo.
- `frontend/atendimento/contratos.js`: identidade incorporada e espera antes de imprimir.
- `frontend/components/report-viewer.html`, `report-viewer.js` e `frontend/reports/templates/faturamento.mrt`: integração do visualizador legado.
- `tests/pdf-identidade.test.js`: validações automatizadas da correção.

## Deploy

1. Copie somente os arquivos deste ZIP para os caminhos correspondentes no projeto.
2. Faça commit/deploy do frontend e backend juntos. Não é necessário adicionar variável de ambiente ou instalar nova biblioteca: são reutilizados PDFKit, Sharp e Stimulsoft já presentes nas dependências.
3. **Não há alteração no banco e não há migração nova.** Mantenha o Pre-Deploy Command atual, se já o utiliza.
4. O armazenamento permanente configurado anteriormente continua necessário para a logo sobreviver aos deploys. Nenhum token, certificado, credencial R2 ou configuração fiscal foi alterado.
5. Depois do deploy, recarregue uma vez as telas já abertas para receber o JavaScript novo. Alterações seguintes da logo são consultadas a cada geração de PDF, sem reinício do backend e sem limpeza manual de cache.
6. Gere o faturamento, troque a logo, gere novamente e confira um comprovante térmico. Faça a mesma conferência em uma segunda empresa. Não imprima os PDFs fictícios dos testes como documentos reais.

## Testes efetivamente executados

```sh
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

**202 testes aprovados, zero falhas**, incluindo 11 testes/subtestes desta correção. Requisições HTTP e JWT reais foram usadas com dados de empresa/venda/mídia simulados, sem acessar produção. Foram gerados PDFs reais com PDFKit e exportado o template com o Stimulsoft instalado. As validações cobrem logo atual versus payload falso, duas empresas, atualização sem cache, ausência/arquivo perdido, logo alta, relatório com 110 produtos e três páginas, totais de custo/venda/lucro das amostras, largura térmica, autenticação e documentos de outra empresa, PNG/JPEG e recursos restritos do viewer.

Os PDFs salvos foram reabertos com PyMuPDF. As imagens incorporadas foram extraídas e as cores comparadas nos cenários A, logo atualizada e empresa B, comprovando que a imagem não depende de URL após o download. Foram inspecionadas as páginas renderizadas em PNG e os limites do texto na primeira/última página. O relatório multipágina preservou o produto 110 e o total de R$ 5.500,00 da amostra. Houve conferência visual dos 21 PDFs PDFKit de teste e do template legado.

Não foram executados deploy no seu Render, alteração real no TiDB/R2, reinício do servidor de produção, impressão em impressora física, abertura em outro navegador/dispositivo ou execução dos fluxos jsPDF/HTML em navegador. Não houve chamada real à Focus nem transmissão fiscal. A continuidade após restart depende do banco e armazenamento permanente já existentes; esta correção não guarda a logo apenas em memória.
