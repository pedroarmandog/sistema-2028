# Correção da coluna PetHub IA — atualização da v2 publicada

Esta revisão corrige uma falha real da v2. A coluna era inserida dinamicamente apenas em `empresasTableBody` e o painel dependia da injeção de scripts pelo backend. A tabela `dashTableBody` (Visão Geral das Empresas) não recebia o controle.

## O que mudou

- O HTML já contém a coluna PetHub IA nas duas tabelas, mesmo antes de carregar a API.
- O HTML importa diretamente o estilo e o carregador do módulo; não depende da injeção pelo servidor.
- O JavaScript original identifica cada linha pelo ID correto do painel e cria a célula da IA.
- Ativar IA, Desativar IA e Gerenciar ficam disponíveis nas duas tabelas. A primeira ativação abre o contrato com status Ativo para revisão e grava somente ao salvar.
- Alterações usam a API existente de assinaturas, com revisão e vínculo por empresa. Não são apenas mudanças visuais/localStorage.
- Erros de arquivo/API aparecem no painel, com tentativa de recarga; não são ignorados silenciosamente nem tratados como licença desligada.
- A falha do componente financeiro opcional não impede carregar os controles da licença.

## Publicar sobre a v2

O pacote agora inclui os dois arquivos completos do painel corrigidos, além dos componentes do módulo. No projeto que você já publicou:

1. Atualize `frontend/painel-admin/admin-dashboard.html` e `frontend/painel-admin/admin-dashboard.js`.
2. Atualize `frontend/components/pethub-ia/` com os componentes deste pacote.
3. Atualize `backend/routes/pethubIARoutes.js` e `backend/services/pethubIA/assinaturas.js` (compatibilidade do vínculo e desativação de contratos cujo plano foi arquivado).
4. Publique a atualização pelo procedimento normal do seu projeto e abra novamente o painel. Se necessário, use Ctrl+Shift+R.

Não há nova dependência npm, variável de ambiente, tabela ou migration para esta correção. Preserve o .env, chaves, empresas, planos e configurações existentes. Não é necessário liberar atendimento real ou ligar a OpenAI para ver e administrar a coluna.

Se você personalizou os dois arquivos do painel desde a v2, use a opção de mesclagem abaixo em vez de sobrepô-los.

## Opção de mesclagem com backup

Copie o novo script para o projeto e execute:

```bash
node backend/scripts/corrigir-coluna-pethub-ia-admin.js
```

Ele acrescenta apenas as colunas, a identificação das linhas e as importações ao HTML/JS existentes. Valida os trechos antes de gravar, cria backup dos arquivos alterados e é idempotente. Depois publique os arquivos resultantes e os componentes atualizados. Esse corretor não altera WhatsApp, banco ou backend.

O integrador completo do módulo também passou a aplicar esta correção para novas instalações.

## Conferência após publicar

1. Dashboard → Visão Geral das Empresas: deve existir a coluna PetHub IA.
2. Aba Empresas: a mesma coluna deve aparecer antes de Ações.
3. Empresas com licença ativa mostram Desativar IA; as demais mostram Ativar IA. Gerenciar abre o plano e contrato individuais.
4. Primeiro cadastro/licença vencida abre a configuração para revisar plano e datas antes de salvar.
5. Desativar não altera a situação da empresa no ERP e não desconecta o WhatsApp. Reativar a licença não liga automaticamente a recepcionista que foi pausada.

Se aparecer “API PetHub IA não encontrada”, o frontend corrigido está carregado, mas as rotas do módulo não estão disponíveis na API utilizada por esse painel. Confira a publicação do backend e o integrador descritos em docs/pethub-ia/DEPLOY.md. Se aparecer erro de tabelas, confira a preparação feita na instalação da v2. A interface não inventa um estado desligado quando não consegue consultar a API.

## Validação

96 testes locais aprovados, incluindo renderizadores reais das duas tabelas, cliques, recarga/filtros sem duplicação, erro de publicação, primeira ativação, desativação de plano arquivado e persistência pelo botão usando a API real do módulo com banco em memória. Fornecedores externos continuam injetados nos testes.

Nenhuma nova alteração foi feita em whatsappService.js, sua biblioteca, autenticação, reconexão, filas ou lembretes. Esta revisão não foi publicada automaticamente no seu Render.
