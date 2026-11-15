# PetHub — corrigir endereço antigo da API no disparador

## Causa desta falha

O log mostra requisições a `https://api.pethubflow.com.br/api/instancias` e `/api/disparador/config`, enquanto a página está sendo servida pelo Render.

O arquivo anterior ainda possuía esse domínio antigo como fallback e guardava o endereço ao iniciar o script. Quando a configuração global não estava disponível naquele momento, o disparador continuava usando o domínio antigo.

## Correção

O disparador agora resolve o endereço **na hora de cada requisição**:

1. Usa `window.API_URL`, se configurado como string.
2. Na ausência dele, usa `window.VPS_URL`, se configurado como string.
3. Sem ambos, usa a mesma origem da página. Ao abrir pelo endereço do Render, as chamadas ficam no próprio Render.

Uma string vazia continua significando mesma origem. Barras finais são removidas. O domínio antigo não existe mais como fallback neste arquivo. A configuração API_URL prevalece sobre VPS_URL, inclusive se este último estiver desatualizado.

Todas as URLs do módulo usam essa resolução: instâncias, preferências, campanhas, ações do disparador e SSE/QR. Os cookies e as opções de credenciais existentes são preservados.

Listagem, preferências e ações de instâncias passam a ter timeout de 15 segundos. A listagem sai do estado “Carregando” e mostra erro com nova tentativa. O botão Criar é liberado se houver falha ou timeout.

O POST de criação não é repetido automaticamente. Em timeout, o resultado pode ser incerto: a tela avisa para conferir a lista e realiza somente uma atualização por GET, evitando criar outra instância automaticamente.

A correção anterior da contagem das instâncias permanece no backend. Ela não é substituída por este pacote.

## Arquivo para instalar

Substitua somente:

`frontend/marketing-disparador.js`

Depois faça commit e deploy no Render, e atualize o Marketing com **Ctrl + F5**.

Não substitua a pasta inteira do projeto. Não é necessário alterar banco, variáveis do Render, api-config.js, serviço WhatsApp ou comandos de deploy.

O ZIP inclui `ALTERACOES.patch` para revisão das diferenças e arquivos de teste. Se houver personalizações posteriores no seu arquivo, revise o patch antes de sobrescrever.

Se o frontend for hospedado separadamente da API, mantenha a configuração global apontando ao backend correto. A ausência de configuração usa a origem da página; não procura automaticamente outro servidor.

## Verificação após o deploy

1. Abra Marketing → Disparador de Mensagens.
2. No painel de rede do navegador, confira `/api/instancias` e `/api/disparador/config`: sem configuração externa, devem usar a origem atual do Render.
3. A lista deve carregar ou mostrar uma mensagem de erro em até cerca de 15 segundos se não houver resposta.
4. Crie uma instância, confira a lista e continue pelo QR. O QR usa o mesmo endereço de API das requisições.
5. Se uma criação expirar, confira a lista antes de tentar criar outra instância.

## Testes realizados

**20 testes aprovados, zero falhas na execução selecionada.** Registro em `TESTES.txt`.

- 6 novos testes: origem do Render sem configuração; API_URL prevalecendo sobre um VPS_URL antigo; configuração carregada depois do script; mudança de endereço entre requisições; suporte à origem vazia e a barras finais; endereço consistente no POST e no SSE/QR; timeout de listagem mesmo com fetch simulado que ignora abort; timeout de criação liberando o botão e sem repetir o POST.
- 6 testes de interface anteriores: lista vazia, cadastro/QR simulado, erros com nova tentativa, preservação da lista, limite de dez, cliques duplicados, respostas antigas e texto escapado.
- 8 testes anteriores do backend: contagem/listagem consistentes, preservação dos registros internos, isolamento de empresa, limite real de dez, ações permitidas e respostas sem sessionData.
- `node --check frontend/marketing-disparador.js`: aprovado.

Ambiente: Node 24.22.1, jsdom 26, Sequelize 6.37.7 e banco SQLite isolado para os testes do backend. Os testes de timeout aceleram o relógio do DOM; o código entregue usa 15 segundos.

Para repetir com as dependências de teste disponíveis e a correção anterior de instâncias instalada:

```bash
node --test tests/browser/disparador-endpoint.dom.cjs tests/browser/instancias-disparador.dom.cjs tests/instancias-disparador.test.js
```

Não houve conexão real ao WhatsApp, envio de mensagens, acesso ao banco de produção ou verificação visual em navegador real. Os endpoints, o fetch e o SSE foram simulados; a execução não comprova a disponibilidade do Render ou o pareamento físico do telefone em produção. A suíte completa de todo o PetHub não foi executada.

## Imagem 404

A URL `/uploads/marketing/...webp` ausente é um problema independente. Este pacote não recupera o arquivo antigo nem altera o armazenamento. Se essa imagem não existir mais, será necessário reenviá-la pelo cadastro da mensagem usando o armazenamento permanente já configurado.
