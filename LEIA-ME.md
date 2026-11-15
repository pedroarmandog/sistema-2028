# PetHub — conectar instâncias do disparador com Baileys

## Falhas identificadas nesta etapa

O endereço da API e a listagem já estavam funcionando. O erro atual ocorria ao conectar a instância.

Foram encontradas quatro incompatibilidades no caminho entre a interface e o WhatsApp:

1. O botão Conectar chamava `/reset` automaticamente. O controller de reset ainda chamava `limparSessaoDoDisco`, função do serviço antigo que não existe no serviço Baileys.
2. O serviço Baileys aceitava somente chaves numéricas de empresa. As instâncias do disparador usam chaves como `disp_120002`, que eram rejeitadas antes de gerar QR.
3. O frontend não mostrava o QR recebido no evento inicial do SSE. Assim, um QR gerado antes da assinatura do stream podia não aparecer.
4. O worker verificava e usava a sessão principal da empresa, mesmo quando uma instância do disparador era selecionada.

As correções anteriores focaram contagem e endereço da API. Os testes anteriores usavam um mock do serviço WhatsApp e não cobriam essas incompatibilidades. Nesta entrega, os testes também carregam o serviço real de aplicação com o transporte WhatsApp simulado.

## O que mudou

### Conexão e reset

- Conectar usa `POST /api/instancias/:id/connect`, preservando as credenciais existentes.
- O reset explícito continua disponível em `POST /api/instancias/:id/reset`, mas usa a API do serviço Baileys, sem a função antiga de disco.
- Criação e conexão aguardam a inicialização do serviço e tratam a falha. Se o registro foi criado e a conexão falhar, a resposta informa que a instância já existe e orienta usar Conectar, em vez de criar outra.
- O frontend mostra a mensagem de erro retornada pela API, em vez de apenas “Erro ao connect”.

### Sessões e empresa

- O serviço aceita a chave principal numérica e a chave `disp_<id>` da instância.
- A autenticação do disparador é persistida separadamente, usando o repositório cifrado e o lease existentes. Não são criadas tabelas novas.
- A empresa da instância é resolvida pelo registro do banco. Verificações de comunicação e carregamento de mídia recebem o ID real dessa empresa, não a chave `disp_...`.
- As atualizações de status da sessão principal deixam de atingir instâncias nomeadas e registros de configuração. O status de cada instância atualiza seu próprio registro.
- A lista de empresas conectadas usada pelas automações principais não inclui chaves de instâncias do disparador.

### QR e SSE

- A interface usa `GET /api/instancias/:id/eventos`.
- O endpoint valida que a instância pertence à empresa autenticada antes de abrir o stream.
- O estado inicial inclui o QR já disponível; o frontend também reconhece esse evento inicial.
- A rota antiga de eventos do Marketing, quando recebe uma chave de instância, delega à mesma validação de propriedade. O stream principal continua funcionando para a empresa autenticada.

### Envio da campanha

- Iniciar e Continuar verificam a instância selecionada.
- O worker envia pela chave `disp_<id-da-instância>` validada.
- As consultas da fila continuam usando o ID da empresa da campanha. Esse ID não é substituído pela chave do WhatsApp.
- A sessão principal conectada não serve de substituta para uma instância selecionada que esteja desconectada.

Foram preservados os controles anteriores de limite, isolamento de empresa, preferências de comunicação, carregamento de mídia R2, persistência, reconexão e resposta de confirmação de envio. Nenhuma sessão existente é apagada automaticamente durante a instalação. O reset explícito limpa somente a autenticação da instância indicada; Conectar normalmente não faz reset.

## Instalação — publicar todos os seis arquivos de produção juntos

Copie mantendo exatamente as pastas:

| Arquivo | Alteração |
|---|---|
| `backend/services/whatsappService.js` | Suporte a instâncias Baileys separadas, contexto real da empresa e atualização isolada de status |
| `backend/controllers/instanciaController.js` | Conectar/reset compatíveis, falha de inicialização visível e SSE autenticado |
| `backend/controllers/disparadorController.js` | Iniciar/Continuar e worker usando a instância selecionada |
| `backend/routes/instanciaRoutes.js` | Rota de eventos da instância |
| `backend/routes/marketingRoutes.js` | Validação de propriedade no SSE legado do disparador |
| `frontend/marketing-disparador.js` | Conexão sem reset automático, QR inicial, stream validado e erros explicativos |

Este pacote se baseia no serviço de recuperação contínua e no armazenamento R2 já entregues nesta conversa. Os arquivos do serviço e do worker foram recuperados dessas versões para preservar as integrações existentes. Não foi usado o serviço antigo Puppeteer como substituto.

O repositório `whatsappAuthStore.js`, os módulos de mídia e de preferências de comunicação já existentes continuam sendo usados. Não é necessário substituir esses módulos por versões novas deste pacote.

O ZIP inclui `ALTERACOES.patch` e os testes para revisão. Caso você tenha feito alterações próprias posteriores nesses seis arquivos, revise o patch antes de sobrescrevê-las.

1. Faça backup/commit da versão atual.
2. Copie os seis arquivos. Não apague nem substitua pastas inteiras do projeto.
3. Faça commit e deploy normalmente no Render.
4. Atualize o Marketing com Ctrl + F5.
5. Use **a instância já cadastrada**. Clique Conectar ou Ver QR; não é necessário criar outra.
6. Leia o QR em WhatsApp → Dispositivos conectados e aguarde a confirmação.
7. Confira a instância como conectada e faça um envio controlado para um contato de teste seu.

**Sem migração nova, sem apagar tabelas e sem novas dependências de produção.** Não altere a chave de autenticação, tokens ou configurações existentes do armazenamento para aplicar esta correção. Não é necessário mudar comandos de build/start/pre-deploy.

## Testes executados

**32 testes aprovados; zero falhas na suíte selecionada.** Registro em `TESTES.txt`.

Foram exercitados:

- Serviço real da aplicação aceitando `disp_120002` e mantendo QR e socket separados da sessão principal.
- Controller de reset executando com esse serviço, que não possui `limparSessaoDoDisco`.
- Inicialização idempotente e desconexão isolada.
- Repositório de autenticação real com banco SQLite em memória: chaves cifradas separadas, reabertura e remoção só da instância escolhida.
- Resumo de status da sessão principal excluindo registros nomeados/configuração.
- Mídia e preferências de comunicação recebendo a empresa correta.
- SSE com QR em cache; empresa diferente rejeitada antes dos cabeçalhos do stream; validação também na rota legada.
- Iniciar e Continuar executando o worker com transporte simulado: envio pela instância escolhida, mantendo a fila na empresa correta.
- Sessão principal conectada não substituindo instância desconectada.
- Frontend chamando `/connect`, exibindo QR do evento inicial e usando o endpoint autenticado.
- Regressões anteriores de contagem, limite, preservação dos registros, endereço da API, timeout, clique duplicado, erros e lista.

Os testes do serviço carregam o código de aplicação; a biblioteca/transporte WhatsApp, QR de imagem e sockets são simulados. O teste de persistência usa Sequelize com SQLite integrado ao Node 24, sem TiDB real. Nenhuma mensagem real foi enviada.

Também foi executado `node --check` nos seis arquivos de produção: aprovado.

Para repetir com as dependências de teste disponíveis:

```bash
node --test tests/instancias-baileys.test.js tests/instancias-disparador.test.js tests/browser/disparador-endpoint.dom.cjs tests/browser/instancias-disparador.dom.cjs
```

Os testes usam Node.js 24.22.1, Sequelize 6.37.7 e jsdom 26. As dependências de teste foram instaladas fora do projeto; o package.json não foi alterado.

### Limites da validação

Não houve acesso ao Render/TiDB/R2 de produção, pareamento com telefone, transmissão real WhatsApp ou inspeção visual em Chrome nesta execução. Os testes comprovam o fluxo do código com transporte simulado, não o funcionamento de uma sessão física no seu aparelho. A suíte completa histórica de todo o ERP não foi executada.

Se ainda ocorrer uma falha após publicar os seis arquivos, a tela agora mostra o erro de conexão retornado pelo backend. Confira também os logs do Render no mesmo horário. Não compartilhe QR, credenciais ou chaves de autenticação.

## Imagem ausente

O HTTP 404 de `/uploads/marketing/...webp` continua independente. O código mantém o carregamento pelo armazenamento permanente, mas não recupera um arquivo antigo já ausente. Se essa imagem não existir mais, reenvie-a pelo cadastro da mensagem. Para o primeiro teste do disparador, use texto sem esse anexo ausente.
