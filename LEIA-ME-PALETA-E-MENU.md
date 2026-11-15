# PetHub — Paleta do app por empresa e menu em Configurações

Atualização incremental de 15/11/2026. Aplicar sobre a versão atual com PetHub Cliente integrado, popups/sons, índice TiDB corrigido, intervalo mínimo de 1 segundo, modal centralizado e ativação sonora por navegador. Esses recursos são preservados.

## Mudanças

- O acesso PetHub Cliente passa do item isolado da barra lateral para Configuração → PetHub Cliente. O widget ajusta os submenus existentes sem duplicar links e acompanha substituições tardias do sidebar. O componente de sidebar compartilhado também possui o submenu Configuração completo nas telas que o reutilizam.
- Em Configurações → PetHub Cliente, o gestor encontra Aparência do app do tutor, com cinco cores: principal, secundária, fundo do app, cards/menus e texto.
- Há seletores visuais, códigos hexadecimais, prévia local e opções PetHub padrão, Verde, Azul, Roxo e Rosa. A prévia não modifica as cores do ERP nem chama uma gravação no backend.
- Salvar paleta aplica as cores ao app dos tutores da empresa autenticada. Restaurar padrão muda a prévia; é necessário clicar em Salvar paleta para publicar a restauração.
- Contrastes de texto/botões são ajustados automaticamente quando necessário. Logo, mascote e cores semânticas de situação (confirmado, recusado etc.) são preservados. Não se alteram a paleta do ERP nem o app do gestor.

## Isolamento e persistência

A paleta fica no JSON já existente cliente_portal_config.regras, sob a propriedade reservada aparencia, com versão própria. Não é necessário criar tabela, adicionar coluna nem executar migração. A gravação usa a empresa validada na autenticação, a permissão configuracoes.empresa e a mesma transação/trava por empresa usada pelo módulo.

A aparência possui controle de versão para rejeitar salvamentos concorrentes desatualizados. Salvar a agenda preserva a aparência mais recente; salvar a aparência preserva expediente, capacidade, serviços e bloqueios. A revisão da agenda não é alterada por uma gravação de cores.

Somente cinco valores HEX #RRGGBB são aceitos. URLs, CSS arbitrário, campos extras e seleção de empresa no corpo são rejeitados. O tutor não possui endpoint para modificar a aparência.

O app consulta a paleta pública da loja pelo slug no acesso/login. Depois de autenticado, recebe somente a paleta da empresa vinculada à sua sessão. Aplica as cores na inicialização e nas atualizações existentes por SSE/polling (fallback de 30 segundos enquanto a aba está ativa). Não há cópia oficial de cores em localStorage nem cache de respostas das APIs no service worker. Uma loja sem personalização recebe o padrão; ao iniciar consulta de outra loja, a paleta anterior é removida antes da nova consulta, evitando reaproveitamento visual indevido.

O tema visual é aplicado com variáveis CSS seguras. O editor utiliza essas variáveis apenas no contêiner da prévia. No app do tutor elas são aplicadas na raiz do documento. O meta theme-color também acompanha a cor secundária. Ícones e tela inicial instalados do PWA continuam com a identidade padrão do PetHub; não se cria um manifesto diferente por empresa.

## APIs

- GET /api/cliente-portal/aparencia: retorna versão e cores para o gestor autorizado.
- PUT /api/cliente-portal/aparencia: recebe {versao, cores}, ou {versao, restaurar:true}. Exige autenticação ERP, configuracoes.empresa e X-PetHub-Cliente: 1.
- GET /api/cliente-app/loja/:slug e GET /api/cliente-app/sessao: passam a incluir somente o DTO público aparencia. Nenhuma credencial, token, regra de agenda interna ou configuração de outra empresa é acrescentada às respostas públicas.

## Publicar no Render

1. Extraia o ZIP na raiz do projeto preservando os caminhos. O manifesto lista os arquivos novos/alterados.
2. Faça commit/push e deploy dos arquivos backend e frontend juntos.
3. Mantenha os comandos atuais:
   Build: npm ci --omit=dev
   Pre-deploy: node backend/scripts/preparar-clientes-inteligencia.js
   Start: npm start
4. Não há variável de ambiente, dependência de produção, migração adicional ou configuração nova no TiDB. Nenhuma tabela é apagada ou recriada por este ajuste.
5. Se o frontend estiver hospedado separadamente, publique também todos os arquivos frontend do pacote. É necessário publicar tema.js junto de app.html/app.js e o editor junto da página de configurações.
6. Atualize o ERP com Ctrl+F5. O PWA do tutor atualiza seu cache estático para pethub-cliente-static-v4-paleta; se avisar Nova versão disponível, feche e reabra o app. O tema só passa a aparecer depois que o gestor escolher e salvar uma paleta.
7. Confira com duas empresas e dois tutores: salve Verde em uma e Azul na outra, recarregue os apps e verifique que as cores não se misturam. Teste também nova solicitação, som e proposta de horário. Os dados existentes não precisam ser reimportados.

Não foi feito deploy em produção nesta entrega. Se houver alterações locais nos mesmos arquivos, compare antes de substituir.

## Testes executados

Suíte:
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js

Resultado: 302 aprovados; 0 falhas; 0 ignorados; aproximadamente 52 segundos.

Cinco testes novos exercitam validação de HEX/CSS malicioso, contraste, padrão, persistência em nova instância, empresas independentes, versão concorrente, salvamento da agenda sem apagar cores, restauração sem apagar agenda, preservação de vínculos, rejeição de empresa injetada, autenticação/permissão nas rotas e leitura pública/autenticada da paleta correta. Banco isolado SQLite; nenhuma conexão ao TiDB de produção.

Integração DOM adicional: tests/browser/portal-aparencia.dom.cjs passou com jsdom. Exercita os cinco campos, prévia sem recolorir o ERP, salvar/restaurar, dois apps com temas independentes, atualização por evento SSE simulado, remoção do link antigo, inclusão em Configuração e recuperação após troca do sidebar. A integração DOM simula APIs/eventos; os testes HTTP acima exercitam Express e banco isolado.

Verificadas também as referências dos novos scripts e a integridade das folhas de estilo. Não houve avaliação visual em Chrome/Firefox/Safari nem smartphone real nesta entrega; essa conferência precisa ser feita após publicar. Nenhuma nota fiscal real, mensagem WhatsApp ou dado de produção foi alterado.

## Arquivos incluídos
- backend/routes/clientePortalRoutes.js — alterado
- backend/services/clientePortal/aparencia.js — novo
- backend/services/clientePortal/index.js — alterado
- frontend/cliente-app/app.css — alterado
- frontend/cliente-app/app.html — alterado
- frontend/cliente-app/app.js — alterado
- frontend/cliente-app/service-worker.js — alterado
- frontend/cliente-app/tema.js — novo
- frontend/components/cliente-portal-aparencia.js — novo
- frontend/components/cliente-portal-erp.css — alterado
- frontend/components/cliente-portal-widget.js — alterado
- frontend/configuracoes/portal-cliente.html — alterado
- frontend/sidebar-component/sidebar.html — alterado
- tests/browser/portal-aparencia.dom.cjs — novo
- tests/portal-aparencia.test.js — novo
