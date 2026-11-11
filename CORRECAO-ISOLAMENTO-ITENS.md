# Aplicar a correção de itens

Extraia este pacote na raiz do projeto, preservando backend, frontend e tests. Faça o commit e o push. No Render, mantenha o build npm ci --omit=dev e o start npm start. Depois do deploy, faça login novamente e atualize Meus itens com Ctrl+F5.

O log recebido mostra build concluído e falha na inicialização. A validação de req.user estava fora de um middleware. Agora ela executa dentro de router.use, depois da autenticação.

A consulta incluía itens de empresa_id NULL. Esses registros eram compartilhados por todas as lojas. A importação usava upsert por ID sem impor empresa_id, permitindo gravar itens sem dono ou atualizar dados pertencentes a outra empresa. As rotas de estoque e exclusão também buscavam por ID sem conferir a empresa. A atualização de permiteEstoqueNegativo atingia todas as empresas.

A correção aplica a empresa da sessão em leituras, cadastro, importação e alterações de itens. Itens sem dono ficam ocultos. Imports com ID de outra empresa são recusados por item e registrados em details da resposta. Cadastros novos recebem ID gerado pelo servidor. Histórico de estoque só é consultado após validar o dono do produto. A busca de fornecedores usada nos itens também confere a empresa. As exclusões locais são separadas por empresa.

Em Meus itens, foi retirada a migração automática das chaves globais meusItens e produtos do navegador. Essas chaves não identificam a empresa que criou os dados. O cadastro passa a depender dos dados retornados pela API.

## Verificar no PowerShell

Na pasta do projeto, com dependências instaladas e Node 22.13 ou posterior:

```powershell
node --test .\tests\itens-isolamento.test.js
```

O teste usa SQLite em memória e autenticação controlada para duas empresas fictícias. Não lê o .env nem conecta ao TiDB. Exercita o carregamento das rotas, listagem, pesquisa, acesso por ID, edição, remoção, estoque, histórico, importação com tentativa de trocar empresa e cadastro com ID de outro usuário.

A suíte npm test do ZIP original apresentou duas falhas nos testes WhatsApp, e as mesmas duas falhas ocorreram após a correção dos itens. Não foi alterado o conector WhatsApp neste pacote.

## Dados anteriores

A correção impede novas consultas compartilhadas. Ela não atribui automaticamente itens antigos à Caroline ou a outra loja. Itens que já tenham sido gravados com a empresa errada precisam de revisão individual, pois o banco não informa com segurança quem era o dono original.

Para levantar o volume sem modificar dados, execute no Workbench:

```sql
SELECT empresa_id, COUNT(*) AS quantidade
FROM itens
GROUP BY empresa_id;
```

Revise os registros sem empresa antes de decidir sua associação. Preserve backup antes de alterar vínculos existentes.

## Arquivos

- backend/routes/itemRoutes.js
- backend/middleware/authUser.js
- frontend/item/meus-itens.js
- tests/itens-isolamento.test.js
- CORRECAO-ISOLAMENTO-ITENS.md

O teste automatizado cobre as rotas de itens. A validação final da aplicação completa no Render e do banco TiDB deverá ser realizada após o deploy. Os testes não constituem uma auditoria de todos os módulos do ERP.
