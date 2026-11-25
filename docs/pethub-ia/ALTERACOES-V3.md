# Versão 3 — coluna administrativa

Corrige a ausência do PetHub IA na Visão Geral das Empresas e remove a dependência da injeção de scripts pelo backend. Leia primeiro COMO-PUBLICAR-COLUNA-IA.md na raiz do pacote.

Arquivos completos do painel agora incluídos: frontend/painel-admin/admin-dashboard.html e admin-dashboard.js. Componentes alterados: admin.js, loader.js, ui.js e estilos.css. O novo script corrigir-coluna-pethub-ia-admin.js oferece mesclagem idempotente com backup.

A coluna possui ativação/desativação e gerenciamento por empresa nas duas tabelas. O carregamento funciona mesmo com o worker global da IA desligado e não depende do arquivo financeiro opcional. Falhas de recursos/API são visíveis. A primeira ativação abre o contrato como Ativo e exige salvar; não há gravação presumida nem ativação do atendimento real por esse botão.

No backend do módulo, o DTO administrativo inclui CNPJ para associação inequívoca em linhas antigas sem metadados; a desativação de um contrato já existente continua possível mesmo se o plano tiver sido arquivado. Reativar plano arquivado exige escolher plano disponível. Alterações de licença continuam sob revisão e isolamento por empresa.

96 testes locais passaram. Foram adicionados testes para HTML/importação direta, renderizadores originais, interação nas duas tabelas, preservação de cliques nativos, atualizações sem duplicidade, primeira ativação, falhas de publicação e integração da interface com a API e persistência no banco de laboratório.

Nenhuma nova migration/dependência/variável. Nenhuma nova alteração em WhatsApp ou suas automações. Reaplicação do corretor/integrador na cópia corrigida não alterou arquivos; o hash do whatsappService.js permanece o da revisão mínima autorizada.

O pacote anterior era código de homologação; a confirmação do usuário de que publicou a v2 não foi tratada como erro de aplicação do pacote. Esta revisão corrige a integração que faltava no próprio código. Não foi verificada a nova versão em produção nem realizado deploy no servidor do usuário.
