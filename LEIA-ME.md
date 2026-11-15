# PetHub — correção das instâncias do disparador WhatsApp

## Problema encontrado

O cadastro contava **todos** os registros da tabela `whatsapp_sessions` para aplicar o limite de dez. A mesma tabela também guarda a sessão principal do Marketing e registros de configuração, como `config_disparador`.

A listagem usava outro critério e ocultava esses registros internos. Assim, era possível receber “limite de dez instâncias” e não enxergar nenhuma instância do disparador. Além disso, falhas HTTP na listagem eram ignoradas pelo frontend, e uma falha ao obter o status de uma sessão podia interromper a lista inteira.

A inconsistência foi confirmada no código e reproduzida em testes isolados. Não foi consultado o banco real para afirmar quais registros específicos existem na sua empresa.

## Correção

- Cadastro, contagem, numeração e listagem passam a usar o mesmo filtro por empresa e por instância real do disparador.
- Sessões principais de nome nulo/vazio, espaços e configurações `config_disparador` não consomem vagas. A comparação do nome reservado considera espaços e maiúsculas/minúsculas.
- O limite continua sendo dez **instâncias reais cadastradas**, inclusive desconectadas. Se houver dez, elas aparecem na lista e podem ser usadas ou excluídas individualmente pelo usuário.
- A listagem não fica indisponível só porque o status em memória de uma sessão falhou. Uma conexão que não puder ser confirmada não é apresentada como conectada.
- `sessionData` não é enviado nas respostas de cadastro e listagem.
- As ações de instância não podem excluir, resetar ou desconectar os registros internos da sessão principal ou da configuração.
- O botão Criar fica desabilitado durante a requisição para evitar cliques duplicados.
- A lista mostra carregamento, quantidade, estado vazio real e erro com Tentar novamente. Uma falha de atualização preserva a lista anterior.
- Uma resposta antiga da listagem não sobrescreve uma resposta mais recente.
- Quando o backend informa o limite, a lista é atualizada para mostrar as instâncias existentes.
- O espaço de listagem aumenta para até 240 px com rolagem, mantendo os botões Conectar/Ver QR/Excluir.

Nenhum registro existente é apagado automaticamente. Não há limpeza em massa, alteração do limite ou reconexão automática de sessões antigas ao abrir a lista. A exclusão continua dependendo de uma ação explícita com confirmação.

O serviço WhatsApp existente e o fluxo de campanhas não foram substituídos. O prefixo `disp_` e as rotas existentes são preservados.

## Arquivos para instalar

Copie estes dois arquivos sobre os arquivos correspondentes do projeto, mantendo as pastas:

1. `backend/controllers/instanciaController.js`
2. `frontend/marketing-disparador.js`

O ZIP também inclui os testes, este guia, o registro de execução e `ALTERACOES.patch`, com as diferenças em relação aos arquivos analisados. Se você personalizou esses dois arquivos depois desta versão, prefira revisar/aplicar o patch em vez de sobrescrever suas alterações.

**Sem migração de banco, sem apagar tabelas, sem novas dependências de produção e sem novas variáveis de ambiente.** O model, as rotas e o serviço WhatsApp permanecem os existentes.

## Testes executados

Resultado: **14 testes aprovados, zero falhas na suíte desta correção.** Registro completo em `TESTES.txt`.

Backend — 8 testes:

- Dez registros internos não consomem vagas; criar instância não apaga nenhum deles.
- Dez instâncias reais continuam bloqueando a décima primeira, e todas aparecem na listagem.
- Contagem e listagem usam o mesmo predicado SQL.
- Outra empresa não consome vagas nem aparece na lista.
- Exclusão explícita de uma instância libera uma vaga sem apagar a configuração.
- Ações não alteram sessões internas nem de outra empresa.
- Falha de status não oculta a lista; respostas não expõem sessionData.
- Nomes inválidos/reservados e ausência de empresa são rejeitados; rejeição assíncrona da conexão mantém o registro visível sem erro de Promise não tratado.

Frontend — 6 testes:

- Lista vazia real é explicada; nova instância aparece e inicia o fluxo de QR simulado.
- Erro HTTP aparece com botão de nova tentativa.
- Atualização com erro mantém as instâncias anteriores.
- Limite atingido atualiza a lista com as dez instâncias existentes.
- Clique duplicado faz somente um POST durante a criação pendente.
- Resposta antiga é descartada; nome e número retornados são renderizados como texto.

Também foi executado `node --check` nos dois arquivos alterados: aprovado.

Ambiente: Node.js 24.22.1, Sequelize 6.37.7 e jsdom 26. O backend foi testado com o gerador real de condições SQL do dialect MySQL do Sequelize e banco SQLite isolado em memória; o serviço WhatsApp foi simulado. O frontend foi exercitado em DOM simulado com respostas de API e SSE simuladas.

Não houve conexão real ao WhatsApp, transmissão de mensagens, consulta ao TiDB/Render em produção ou inspeção visual em navegador real nesta execução. Os testes não comprovam pareamento físico do telefone nem disponibilidade da mídia em produção. A suíte completa de todo o PetHub não foi executada nesta correção.

Para repetir com as dependências de teste disponíveis:

```bash
node --test tests/instancias-disparador.test.js tests/browser/instancias-disparador.dom.cjs
```

O teste do backend usa `node:sqlite`, disponível no Node 24 utilizado nesta execução. jsdom é necessário apenas para o teste de frontend; nenhuma alteração no package.json foi feita.

## Deploy no Render

1. Faça backup/commit da versão atual.
2. Copie os dois arquivos mantendo suas pastas. Não substitua o projeto inteiro pelo ZIP.
3. Faça commit e deploy normalmente. Não mude Build Command, Start Command ou Pre-deploy por causa deste pacote.
4. Depois do deploy, atualize o Marketing com Ctrl + F5.
5. Abra Disparador de Mensagens. A lista deve informar as instâncias existentes ou o estado vazio real.
6. Se houver vagas, crie a instância e use Conectar/Ver QR. Se houver dez reais, utilize uma delas ou exclua somente uma que não usa.
7. Se houver falha de carregamento, a tela mostrará o erro HTTP e Tentar novamente; isso permite distinguir um problema de API de uma lista vazia.

## Sobre a imagem com HTTP 404

O erro `uploads/marketing/...webp` é independente do limite das instâncias. Este pacote não recupera uma imagem antiga ausente nem muda o armazenamento permanente. Se o arquivo original não existir mais, será necessário reenviá-lo pelo cadastro da mensagem usando o armazenamento já configurado. A correção de instâncias não altera os arquivos de mídia.
