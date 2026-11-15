# PetHub — paleta centralizada por empresa

Este ZIP contém somente os arquivos novos/alterados desta correção. Copie backend/, frontend/ e tests/ para a raiz do projeto, preservando os caminhos. Não substitui o projeto inteiro. Implementação preparada sobre a versão recebida e os pacotes anteriores de correção disponíveis nesta conversa. Se você modificou algum destes arquivos depois, compare antes de substituir.

## Causa encontrada

O editor gravava `systemColors` num localStorage único do navegador e em `usuarios.preferencias`, portanto a preferência era do usuário, não da empresa. O carregamento desistia do servidor após 300 ms e reaplicava o cache local. A sincronização usava apenas o evento `storage`, que não atravessa computadores. O editor também anunciava sucesso sem verificar a resposta da gravação.

## O que mudou

- A fonte oficial passa a ser a empresa autenticada, com `empresas.paleta_cores` (JSON, opcional) e `empresas.paleta_cores_versao` (inteiro, padrão 0).
- GET/PUT `/api/usuarios/preferencias` foram reutilizados; as demais preferências pessoais continuam por usuário e são mescladas, sem apagá-las.
- Escritas de paleta exigem a permissão existente `configuracoes.empresa`. Mantida a regra do sistema para contas legadas sem permissões configuradas. A interface também desabilita os controles de quem não pode editar.
- A empresa vem exclusivamente da sessão validada pelo middleware existente. O PUT rejeita empresaId enviado no corpo.
- Hexadecimais, categorias e IDs são validados. Nomes e variáveis CSS vêm do esquema canônico; não são aceitas variáveis CSS arbitrárias.
- Gravação transacional com bloqueio da linha e versão. Edições de cores diferentes podem ser conciliadas uma vez; conflito na mesma cor exige revisão, sem sobrescrever silenciosamente.
- O editor aplica e confirma somente depois da resposta de sucesso. Em falha, mantém a paleta confirmada. Texto hexadecimal salva ao concluir a edição (sair do campo); seletor salva ao confirmar a cor.
- Restauração é persistida e propagada exclusivamente para a empresa atual.
- SSE autenticado em GET `/api/usuarios/preferencias/eventos`, sem token na URL. Uma conexão por página, reconexão com espera progressiva e consulta atualizada após falha. Sem streaming disponível, há consultas de recuperação com intervalo máximo de 30 segundos.
- Na mesma instância, o evento sai após commit. Entre instâncias, cada empresa com assinantes tem uma consulta compartilhada ao banco a cada 2 segundos. Propagação entre instâncias leva aproximadamente esse intervalo, mais a latência.
- O stream encerra a cada 20 segundos para exigir nova autenticação na reconexão. Heartbeat a cada 10 segundos; ouvintes e timers são removidos quando o cliente sai. Não depende das conexões do WhatsApp.
- Desktop carrega o serviço no head quando servido pela API. Os carregadores existentes de cores/logo também o iniciam em instalações que servem o frontend separadamente, sem duplicar conexões. Primeiro acesso depende da resposta da rede; não se promete ausência absoluta de mudança visual durante a carga.
- Mobile usa a mesma configuração autenticada e mapeia as cores para as variáveis de sua interface. Ao restaurar, recupera os padrões visuais originais do Mobile. Autenticação, push e demais fluxos não foram modificados. O Service Worker não armazena nem reaproveita respostas de paleta/SSE entre logins.

## Deploy no Render e TiDB

1. Incorpore os arquivos ao projeto e faça commit/deploy do frontend e backend juntos.
2. Execute antes de iniciar a nova API:

   ```sh
   node backend/scripts/preparar-paleta.js
   ```

   Se seu **Pre-Deploy Command** já é `node backend/scripts/preparar-clientes-inteligencia.js`, mantenha esse comando: ele agora inclui a preparação da paleta. Não precisa executar ambos.

3. O usuário do banco precisa de permissão ALTER na tabela empresas. A preparação é aditiva e repetível: adiciona apenas as duas colunas ausentes, sem excluir/recriar tabelas ou remover registros. Não requer nova tabela, variável de ambiente, dependência npm ou serviço pago.
4. Se não usar Pre-Deploy, execute o comando de preparação no ambiente correto antes de liberar a nova versão. Não execute contra outro banco por engano. Não é necessário `sync({force:true})` ou `sync({alter:true})`.
5. Após o deploy, feche/reabra abas antigas ou use Ctrl+F5. No PWA, feche e abra novamente para ativar o Service Worker atualizado. Frontend antigo não tem o controle de versão exigido pela nova API.
6. Abra a mesma empresa em dois dispositivos, altere uma cor e aguarde sua confirmação. Em instâncias distintas, aguarde cerca de dois segundos. Confira a restauração e uma segunda empresa.
7. As colunas podem permanecer no banco se precisar voltar o código; não as apague para fazer rollback.

## Preservar a paleta anterior

As preferências antigas NÃO são apagadas. O cache antigo não tinha identificação confiável de empresa e por isso não é aplicado automaticamente a outra conta.

Depois da preparação, execute para diagnóstico, sem escrever:

```sh
node backend/scripts/migrar-paletas-legadas.js
```

Para importar as paletas não ambíguas:

```sh
node backend/scripts/migrar-paletas-legadas.js --aplicar
```

O script só migra preferências de usuários vinculados a uma única empresa, com paleta válida e sem divergência entre usuários dessa empresa. Ignora empresa com configuração central já existente ou restauração já realizada. Usuários multiempresa e paletas conflitantes são relatados para revisão manual. As preferências pessoais não são removidas.

Se a personalização existir somente no navegador antigo, acesse o editor nele: o botão **Recuperar paleta anterior deste navegador** permite publicá-la após confirmar explicitamente a empresa atual. Confira visualmente as cores após importar. Não use esse botão se a paleta antiga pertencer a outra empresa.

## Arquivos entregues

| Arquivo | Finalidade |
|---|---|
| backend/app.js | Carga antecipada do tema nas páginas do ERP |
| backend/models/Empresa.js | Dois campos aditivos da paleta |
| backend/controllers/empresaController.js | Impede contornar a gravação controlada pela edição genérica da empresa |
| backend/routes/usuarioRoutes.js | Reutiliza preferências e acrescenta SSE autenticado |
| backend/controllers/paletaController.js | Leitura, permissão, transação e SSE |
| backend/services/paletaEmpresa.js | Persistência, versão, migração estrutural e propagação |
| backend/services/paletaLegada.js | Planejamento conservador da migração antiga |
| backend/scripts/preparar-paleta.js | Preparação isolada das colunas |
| backend/scripts/preparar-clientes-inteligencia.js | Inclui paleta no predeploy já usado |
| backend/scripts/migrar-paletas-legadas.js | Diagnóstico/importação opcional das preferências anteriores |
| frontend/tema-esquema.js | Esquema e validações compartilhados com o backend |
| frontend/tema-cliente.js | Estado confirmado, gravação, conflitos, SSE e CSS |
| frontend/tema-bootstrap.js | Inicialização única, autenticação e ciclo da página |
| frontend/custom-colors.js | Remove cache global antigo; preserva o interceptor de bloqueio |
| frontend/logo-manager.js | Garante o carregamento em outras páginas existentes |
| frontend/configuracoes/cores.html | Editor com confirmação real, permissões e recuperação explícita |
| frontend/mobile/app.html | Inicialização do tema no PWA |
| frontend/mobile/service-worker.js | Atualiza cache estático e exclui paleta/SSE do cache |
| tests/paleta-empresa.test.js | Testes automatizados da correção |

## Validação e limites

Comando da suíte completa:

```sh
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

Resultado: 191 testes aprovados, zero falhas; destes, 15 são específicos desta correção. Incluem banco SQLite em memória com Sequelize real, migração repetida preservando registros, leitura por nova instância do serviço, versão/conflito/rollback, simulação de duas instâncias compartilhando banco, usuários/empresas/permissões com JWT e HTTP reais, SSE inicial e atualização ao vivo, reconexão/fallback/timeout, limpeza de sessões, validação de CSS, editor real executado em DOM simulado, erro de gravação sem sucesso falso e tratamento de paletas legadas. A suíte também cobriu os testes existentes de clientes/pets, importação, vendas, fiscal, mídias, marketing, push e WhatsApp. Verificações de sintaxe Node também passaram.

Não foram executados deploy, reinicialização real no Render, migração no seu TiDB nem testes em dispositivos físicos. A persistência após reinício foi verificada recriando o serviço e relendo os mesmos registros do banco de teste; não se simula uma perda do banco. O Chromium não iniciou neste ambiente, portanto não houve inspeção visual automatizada em navegador nem medição real de responsividade. Os testes de DOM não substituem essa inspeção. Nenhuma nota foi transmitida, nenhum WhatsApp foi conectado e nenhuma credencial real foi usada nos testes.
