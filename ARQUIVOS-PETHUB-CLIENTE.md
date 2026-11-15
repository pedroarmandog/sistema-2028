# Arquivos do pacote

42 arquivos de código, testes e recursos novos/alterados. Os documentos de entrega são adicionais.

| Arquivo | Situação |
| --- | --- |
| `backend/app.js` | alterado |
| `backend/middleware/authUser.js` | alterado |
| `backend/routes/agendamentoRoutes.js` | alterado |
| `backend/routes/clientePortalRoutes.js` | novo |
| `backend/scripts/preparar-cliente-portal.js` | novo |
| `backend/scripts/preparar-clientes-inteligencia.js` | alterado |
| `backend/services/clientePortal/agenda.js` | novo |
| `backend/services/clientePortal/auth.js` | novo |
| `backend/services/clientePortal/cadastros.js` | novo |
| `backend/services/clientePortal/eventos.js` | novo |
| `backend/services/clientePortal/index.js` | novo |
| `backend/services/clientePortal/modelos.js` | novo |
| `backend/services/clientePortal/notificacoes.js` | novo |
| `backend/services/clientePortal/pedidos.js` | novo |
| `backend/services/clientePortal/validacao.js` | novo |
| `backend/services/pushNotificationService.js` | alterado |
| `frontend/agendamentos-novo.js` | alterado |
| `frontend/atendimento/solicitacoes-app.html` | novo |
| `frontend/client-details.html` | alterado |
| `frontend/cliente-app/api.js` | novo |
| `frontend/cliente-app/app.css` | novo |
| `frontend/cliente-app/app.html` | novo |
| `frontend/cliente-app/app.js` | novo |
| `frontend/cliente-app/assets/boas-vindas.webp` | novo |
| `frontend/cliente-app/assets/icon-192.png` | novo |
| `frontend/cliente-app/assets/icon-512.png` | novo |
| `frontend/cliente-app/assets/icon.svg` | novo |
| `frontend/cliente-app/manifest.webmanifest` | novo |
| `frontend/cliente-app/service-worker.js` | novo |
| `frontend/components/cliente-portal-erp.css` | novo |
| `frontend/components/cliente-portal-erp.js` | novo |
| `frontend/components/cliente-portal-widget.js` | novo |
| `frontend/configuracoes/portal-cliente.html` | novo |
| `frontend/mobile/app.html` | alterado |
| `frontend/mobile/app.js` | alterado |
| `frontend/mobile/pages/solicitacoes.js` | novo |
| `frontend/mobile/service-worker.js` | alterado |
| `frontend/pets/pet-details.html` | alterado |
| `tests/browser/cliente-portal.ui.cjs` | novo |
| `tests/cliente-portal-http.test.js` | novo |
| `tests/cliente-portal.test.js` | novo |
| `tests/helpers/cliente-portal-fixture.js` | novo |

## Organização

- `backend/services/clientePortal`: autenticação, dados autorizados, agenda, estados dos pedidos, eventos, notificações e modelos complementares.
- `backend/routes/clientePortalRoutes.js`: APIs próprias do tutor e APIs de gestão autenticadas pelo ERP.
- `backend/app.js`: montagem das rotas, isolamento do HTML do novo PWA, indicadores do ERP e rotina de avisos.
- `backend/routes/agendamentoRoutes.js`: criação compartilhada e coordenação transacional com pedidos confirmados.
- `frontend/cliente-app`: PWA completo, sem scripts administrativos ou cache de dados privados.
- `frontend/components/cliente-portal-*`: gerenciamento no ERP e indicador global.
- `frontend/mobile`: entrada de solicitações no gestor, mantendo seu manifest/escopo.
- `tests/cliente-portal*`, `tests/helpers`, `tests/browser/cliente-portal.ui.cjs`: testes automatizados e roteiro de UI local.
