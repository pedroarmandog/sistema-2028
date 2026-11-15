# PetHub — Correção do pre-deploy no MySQL/TiDB

15/11/2026. Correção incremental para aplicar DEPOIS do pacote PetHub-Popups-Persistentes-e-Sons.zip.

## Causa

O build terminou corretamente. A falha ocorreu na preparação do banco, porque o índice composto de silenciamentos foi nomeado automaticamente pelo Sequelize como:

cliente_portal_alertas_silencios_empresa_id_usuario_id_solicitacao_id

Esse identificador tem 69 caracteres e ultrapassa o limite de 64 do MySQL/TiDB. A cobertura anterior em SQLite não detectava esse limite. O erro foi introduzido no pacote dos alertas.

## Correção

backend/services/clientePortal/alertasModelos.js agora define explicitamente o nome curto:

cp_alerta_silencio_emp_usr_sol_uq

As três colunas (empresa_id, usuario_id, solicitacao_id), a unicidade e as preferências existentes permanecem iguais. Não há mudança de filas, solicitações, cadastro, layout ou áudio neste ajuste.

## Aplicação

1. Na raiz do projeto sistema-2028, extraia o ZIP preservando as pastas e substitua backend/services/clientePortal/alertasModelos.js.
2. O teste em tests/portal-alertas-indices.test.js é novo e pode ser incluído no commit; ele não roda durante npm start.
3. Faça commit e push para main. No Render, execute um novo deploy do commit corrigido.
4. Mantenha o Pre-Deploy Command já configurado:

node backend/scripts/preparar-clientes-inteligencia.js

Não remova ou pule esse comando. Não exclua tabelas, índices existentes nem registros para tentar liberar o deploy. A preparação idempotente verifica a tabela que já existir e cria o índice faltante com o nome válido. Não é preciso executar SQL manual, trocar credenciais, alterar plano ou mudar as variáveis de ambiente.

O deploy anterior pode ter criado parte das tabelas antes de falhar. A retomada desse cenário foi testada localmente com uma tabela existente sem o índice, dados de silenciamento e uma solicitação pendente: o índice foi criado, os registros foram preservados e uma segunda preparação não duplicou o índice.

## Validação executada

Comando:
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js

Resultado: 286 testes passaram; 0 falhas; 0 ignorados; aproximadamente 52 segundos.

Inclui dois testes novos:
- Geração real do SQL de índices pelo dialeto MySQL do Sequelize e conferência dos nomes de tabelas/índices do PetHub Cliente e alertas, todos dentro de 64 caracteres. Verifica também colunas e unicidade do índice corrigido. Não conecta a um servidor MySQL.
- Retomada de criação parcial, repetição segura da preparação, preservação de clientes, pets, solicitação e mute, e rejeição de duplicidade pelo índice, usando SQLite isolado.

Não houve acesso ao Render ou TiDB de produção. A correção e o pacote estão prontos; o novo pre-deploy real só poderá ser confirmado ao publicar o commit corrigido.

## Conteúdo

- backend/services/clientePortal/alertasModelos.js — substituição pontual do arquivo de modelos dos alertas.
- tests/portal-alertas-indices.test.js — regressão do limite e da retomada parcial.
- LEIA-ME-CORRECAO-DEPLOY.md — este guia.
