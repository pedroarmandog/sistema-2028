# PetHub — Intervalo de notificação a partir de 1 segundo

Correção incremental para a versão atual dos popups e sons, incluindo o ajuste anterior de índice do TiDB.

## O que muda

- Configurações → PetHub Cliente → Sons de Notificação aceita intervalos inteiros de 1 a 120 segundos: 1, 2, 3, 5, 10 etc.
- A validação do backend também aceita esses valores. Não basta alterar somente o campo HTML.
- O som escolhido, volume, MP3 e intervalo já salvo são preservados. O padrão para empresas sem configuração continua 25 segundos.
- Não há alteração do banco de dados, credenciais, permissões, fila de pedidos ou fluxo dos popups.
- A reprodução continua sem sobreposição. Se o áudio durar mais que o intervalo, os ciclos que ocorrerem enquanto ele estiver tocando serão ignorados; ele poderá tocar novamente no próximo ciclo depois que terminar.

## Aplicar

1. Extraia na raiz do projeto, preservando os caminhos.
2. Substitua backend/services/clientePortal/alertas.js e frontend/components/cliente-portal-som-config.js.
3. Faça commit/push e novo deploy. Mantenha os comandos atuais do Render, inclusive o pre-deploy já corrigido.
4. Atualize a página de configurações (Ctrl+F5 se o navegador mostrar a versão anterior). Se o frontend estiver hospedado separado da API, publique também o arquivo frontend.
5. Escolha o intervalo desejado e clique em Salvar som e preferências. O deploy sozinho não altera o intervalo que você já tinha salvo.

O arquivo tests/portal-alertas-intervalo.test.js acrescenta os testes e não é executado por npm start.

## Testes executados

node --test tests/portal-alertas-intervalo.test.js tests/portal-alertas-front.test.js tests/portal-alertas-backend.test.js tests/portal-alertas-http.test.js tests/portal-alertas-indices.test.js

Resultado: 31 testes aprovados, 0 falhas, 0 ignorados.

Inclui persistência de 1, 2, 5, 10, 14, 15 e 120 segundos; rejeição de 0, negativos, fracionados e acima de 120; isolamento por empresa; campo com mínimo 1; temporizador de 1 segundo sem sobreposição; regressões dos popups, mídia, APIs e índices. Não houve acesso ao banco ou deploy de produção. Não foi realizada reprodução física do áudio neste ajuste.
