# PetHub Cliente — Logo da empresa no cabeçalho

Atualização incremental de 15/11/2026 para a versão atual do PetHub Cliente, incluindo os pacotes anteriores de paleta por empresa, menu e correções de som. Não modifica o cadastro de empresas nem a imagem original.

## Comportamento

O cabeçalho que mostrava PetHub Cliente passa a mostrar a logo cadastrada em Configurações → Empresa da loja atual. Funciona tanto na tela de acesso pelo link da loja quanto dentro do app autenticado.

A exibição reserva 113 × 77 pixels CSS, com object-fit: contain. A proporção e transparência são preservadas, sem recortar a imagem. No servidor, uma cópia PNG é gerada em memória com limite de até 226 × 154 pixels, para melhor definição em telas de maior densidade quando a origem permitir. Não amplia artificialmente o arquivo original, não altera a referência cadastrada e não grava cópias temporárias no Render.

Durante o carregamento, quando a empresa não possui logo ou se a imagem estiver indisponível/corrompida, aparece o nome do pet shop em vez de um ícone quebrado. Após carregar, fica somente a imagem no lugar do antigo texto de marca. O nome continua disponível para acessibilidade. O link da logo mantém o código da loja.

A atualização da logo no cadastro passa a gerar uma URL de versão diferente, usando a referência atual e a data de atualização da empresa. O app autenticado recebe essa atualização nas sincronizações existentes (SSE/polling), ou imediatamente após recarregar. Não se usa uma logo global em cache compartilhado entre empresas. Respostas antigas de imagem não substituem a marca já atualizada no cabeçalho.

Esta alteração é do cabeçalho do app. Não troca ícones instalados, manifesto do PWA, splash screen, mascote ou PDFs, e preserva a paleta de cores de cada empresa.

## Backend e isolamento

- A fonte é Empresa.logo, lida pelo serviço de mídias permanente já existente. Mantém compatibilidade com referências de arquivo e logos legadas em base64.
- O endpoint da loja ativa resolve o logo somente a partir do slug daquela loja; o navegador não recebe a referência bruta, a chave do bucket ou uma URL arbitrária do cadastro.
- O DTO da sessão monta a URL da logo usando o slug da empresa autorizada pela sessão. A imagem do cabeçalho fica vinculada a esse slug mesmo se outra sessão for aberta em uma segunda aba.
- A logo é a identidade visual pública da loja. O acesso pelo slug expõe apenas essa imagem da empresa com portal ativo, não documentos, fotos de pets ou cadastros de clientes.
- GET /api/cliente-app/loja/:slug/logo foi acrescentado para essa identidade pública.
- GET /api/cliente-app/loja/logo continua autenticado e restrito à empresa da sessão, para compatibilidade com a tela de perfil existente.
- Corrigida a ordem das rotas: /loja/logo agora é registrada antes de /loja/:slug. Antes, a palavra logo podia ser interpretada como um código de loja.
- GET /loja/:slug e GET /sessao recebem os campos aditivos logo, logoVersao e logoUrl. O booleano logo da sessão permanece compatível com os consumidores antigos.
- As imagens são validadas e convertidas para PNG com limite de pixels. SVG com conteúdo ativo e HTML não são servidos. Os dados da imagem têm no-store e não entram no cache do service worker.

Nenhuma credencial, token, configuração fiscal, permissão de áudio, vínculo cliente/pet ou decisão de agendamento é alterada.

## Instalar

1. Extraia o ZIP na raiz do sistema-2028, preservando os caminhos e substituindo os arquivos correspondentes.
2. Publique os arquivos backend e frontend juntos. Inclua o NOVO arquivo backend/services/clientePortal/logoEmpresa.js; publicar somente app.js não completa a implementação.
3. Faça commit/push e deploy. Mantenha os comandos atuais do Render:
   Build: npm ci --omit=dev
   Pre-deploy: node backend/scripts/preparar-clientes-inteligencia.js
   Start: npm start
4. Não há migração, coluna, tabela, dependência de produção ou variável nova. A logo continua dependendo da configuração de mídias permanente que o sistema já utiliza.
5. Se o frontend estiver hospedado separadamente, publique todos os arquivos frontend do pacote nesse serviço também.
6. Atualize a página. No app instalado do tutor, aguarde a atualização do service worker e feche/reabra quando houver aviso de nova versão. O cache estático passa para pethub-cliente-static-v5-logo-empresa.
7. Verifique uma loja com logo, outra com logo diferente e uma sem logo. Se uma imagem antiga não existir mais no armazenamento, será necessário reenviá-la em Empresa; o app usa o nome como alternativa nesse caso.

A inclusão do novo cabeçalho não exige importar dados ou configurar novamente os sons. Nenhum deploy em produção foi executado nesta entrega.

## Testes executados

node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js

Resultado: 316 testes aprovados; 0 falhas; 0 ignorados; aproximadamente 66 segundos.

Cinco testes novos usam Express e banco isolado para confirmar: prioridade da rota autenticada, isolamento de empresa, URL pública vinculada à loja ativa, recusa de troca de empresa via query, redimensionamento com proporção e transparência, atualização/remoção e versão, rejeição de referência alheia/HTML/SVG ativo e leitura de PNG legado em base64 sem modificar o cadastro. A conversão é realmente executada com sharp em imagens sintéticas de teste.

Integração DOM adicional com jsdom passou: cabeçalho no login e na sessão, área 113x77 com contain e sem arredondamento da logo, nome como alternativa, atualização de versão, resposta antiga ignorada e paleta preservada. A regressão DOM da paleta/menu também passou. O mock simplificado dos testes antigos de inicialização foi ajustado para não inventar um elemento de marca; as verificações de convite/login/histórico permanecem e o novo cabeçalho é coberto pela integração dedicada.

Não houve inspeção visual em celular ou reprodução de uma logo real de produção nesta entrega; conferir o resultado no aparelho após publicar. Não foram alterados dados ou arquivos de produção.

## Arquivos
- backend/routes/clientePortalRoutes.js
- backend/services/clientePortal/logoEmpresa.js
- frontend/cliente-app/app.html
- frontend/cliente-app/app.js
- frontend/cliente-app/app.css
- frontend/cliente-app/service-worker.js
- tests/portal-logo-empresa.test.js
- tests/browser/portal-logo-empresa.dom.cjs
- tests/cliente-portal-inicializacao.test.js
