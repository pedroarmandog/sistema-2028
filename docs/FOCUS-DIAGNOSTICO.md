# PetHub — Testar Conexão Focus

Pacote incremental de 14/11/2026, com somente os arquivos novos/alterados desta funcionalidade. Aplicar sobre a versão atual do projeto que trabalhamos, preservando as correções anteriores. Faça cópia dos arquivos locais antes de sobrepor, principalmente se os editou depois da última versão.

## O que foi implementado

Em **Configurações → Fiscal**, próximo do provedor, há um botão **Testar Conexão Focus** e um painel de resultado exclusivo de administradores da plataforma autorizados. Ele mostra a empresa selecionada, a autenticação, comunicação, operação, ambiente, horário de Brasília e tempo aproximado de resposta.

O botão não usa o campo de token de emissão, não salva o formulário e não altera a seleção de homologação/produção. O resultado sempre informa **Emissão de NF-e: Não testada** e **Certificado A1: Não verificado**.

A chamada externa é somente:

```text
GET https://api.focusnfe.com.br/v2/cnpjs/{cnpj}
```

Autenticação Basic: usuário = Token Master, senha vazia. O endereço é fixo no backend; o CNPJ vem do cadastro da empresa selecionada. Não há URL fornecida pelo usuário, CNPJ fixo no código, consulta livre por CNPJ arbitrário ou redirecionamento HTTP automático. Há validação dos 14 dígitos e verificadores, timeout de 10 segundos e nenhuma repetição automática.

**O ambiente consultado é a API cadastral de produção, somente leitura.** Isso não significa emitir em produção e não altera o ambiente escolhido no formulário fiscal. Não exige o envio de certificado A1. A consulta bem-sucedida não comprova habilitação do emitente, validade do certificado ou funcionamento da emissão.

Documentação oficial conferida:

- https://doc.focusnfe.com.br/reference/consultar_cnpj
- https://doc.focusnfe.com.br/docs/testando-seu-acesso
- https://doc.focusnfe.com.br/docs/como-cadastrar-uma-empresa
- https://doc.focusnfe.com.br/reference/autenticacao

## Segurança e acesso

Existem dois tipos de administrador no contexto do sistema:

- **Administrador do pet shop:** conta do ERP com permissões da empresa. Não pode usar a credencial global.
- **Administrador da plataforma PetHub:** registro ativo na tabela `admins`, autenticado no painel administrativo. Ainda precisa estar explicitamente autorizado para este diagnóstico.

Foi reutilizado `authAdmin`, que verifica assinatura/expiração do JWT e administrador ativo no banco. O diagnóstico ainda exige as claims do painel correspondentes ao administrador validado e uma lista explícita de IDs no servidor. Um JWT do ERP não é aceito, mesmo se suas chaves JWT tiverem sido configuradas iguais por engano. A variável administrativa `JWT_SECRET` precisa estar configurada: o diagnóstico não aceita a chave padrão de fallback.

A autorização é aplicada no **GET e no POST**. Ocultar o botão é apenas apresentação; chamar a rota manualmente com uma conta comum continua bloqueado.

A escolha de outra empresa por um administrador global autorizado é uma operação administrativa explícita, resolvida pelo ID na tabela `empresas`. Um usuário de empresa não obtém esse acesso trocando IDs no body. O diagnóstico usa o **CNPJ da empresa em Configurações → Empresa**, não o CNPJ de um cliente da venda, nem um ID presumido da tabela `empresas_painel`.

O Token Master só é lido do ambiente do backend. Não vai ao HTML, localStorage, respostas, logs ou banco de dados. A interface envia apenas o JWT administrativo normal já usado pelo painel; esse JWT não é o Token Master. Não foram alteradas as rotinas de login ou criado armazenamento novo de credenciais no navegador.

Os logs novos contêm somente adminId, empresaId, código de resultado, HTTP Focus e tempo. Não há retorno do corpo bruto, cabeçalhos de autenticação, token ou stack trace do provedor.

## Configurar no Render

Abra o serviço da API → **Environment** e adicione:

| Key | Value |
| --- | --- |
| `FOCUS_NFE_MASTER_TOKEN` | O **Token Master** da sua conta Focus, sem aspas e sem prefixo `Basic` |
| `FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS` | IDs dos administradores da plataforma autorizados, separados por vírgulas. Exemplo: `1,3` — use seus IDs reais |

A segunda variável foi adicionada porque o projeto não tinha uma permissão específica para uso de credenciais globais. **Lista vazia ou ausente bloqueia o recurso por padrão.** Não coloque o ID da empresa nem o ID de um usuário do pet shop nessa lista.

Mantenha seu `JWT_SECRET` administrativo forte já existente, além das outras variáveis atuais. Não substitua `JWT_USER_SECRET`, `FISCAL_ENCRYPTION_KEY`, tokens de homologação/produção ou credenciais já salvas. O Master não é usado como fallback da emissão.

Para localizar os IDs administrativos pelo Shell do Render, faça uma consulta somente de leitura:

```bash
node -e 'require("dotenv").config({quiet:true}); const {Admin,sequelize}=require("./backend/models"); (async()=>{try{console.table((await Admin.findAll({attributes:["id","nome","email","ativo"]})).map(a=>a.toJSON()));}finally{await sequelize.close();}})();'
```

Escolha apenas o ID da conta administrativa que você controla e quer autorizar. Esse comando não mostra senhas nem o Token Master.

Salve as variáveis e faça o deploy/reinício normal para aplicá-las. O exemplo `docs/focus-diagnostico.env.example` tem somente placeholders: não sobrescreva seu `.env` com ele e nunca envie um `.env` real ao GitHub.

## Como acessar o botão

1. Entre normalmente no **painel administrativo da plataforma**, no mesmo domínio usado para abrir o ERP.
2. Acesse o sistema da empresa pelo painel, conservando a sessão administrativa válida.
3. Abra **Configurações → Fiscal**. A empresa atual vem da configuração carregada pelo backend.
4. Confira o nome e CNPJ exibidos na área **Diagnóstico Focus NFe**.
5. Clique **Testar Conexão Focus**. Não é necessário salvar o formulário ou preencher novamente o token de emissão.

O botão não aparecerá para contas comuns, administrador fora da lista, sessão administrativa inválida/expirada ou se a empresa atual não pôde ser carregada. A permissão fiscal normal do ERP para acessar a página também continua sendo necessária; o diagnóstico não a contorna.

Se não aparecer, confira: login no painel correto, ID em `FOCUS_NFE_DIAGNOSTIC_ADMIN_IDS`, admin ativo, sessão não expirada, mesmo domínio e configuração fiscal carregada sem erro. Atualize com **Ctrl+F5** após o deploy.

## Endpoints

### `GET /api/fiscal/diagnostico-focus/permissao?empresaId=ID`

Exige Bearer administrativo e autorização global. Confirma acesso e retorna somente a identificação cadastrada da empresa selecionada. **Não consulta a Focus**, não verifica o Master e não faz alterações.

### `POST /api/fiscal/testar-conexao-focus`

Exige a mesma autenticação/autorização. Body:

```json
{"empresaId": 1}
```

O ID acima é só exemplo do contrato. O backend busca o CNPJ real no cadastro. Body com token, CNPJ, ambiente, URL ou outros campos é recusado. O endpoint não recebe o Token Master do frontend.

- Conta não autenticada: HTTP 401.
- Conta não autorizada: HTTP 403.
- CNPJ/empresa inválidos: HTTP 400; empresa não encontrada: HTTP 404.
- Token Master ausente: HTTP 503, com mensagem específica; não há erro 500 inesperado.
- HTTP 200 da Focus: diagnóstico bem-sucedido.
- HTTP 401/403 da Focus: falha de autenticação, registrada em `httpFocus`. O endpoint do PetHub responde 502 para não confundir a rejeição da Focus com expiração do login do ERP.
- HTTP 400/404 da Focus: mensagens específicas; consulta malsucedida não altera o cadastro.
- Timeout: HTTP 504; rede/DNS/indisponibilidade: HTTP 502, mensagem genérica sem detalhes internos.

Há uma execução em andamento por administrador: duas abas ou duplo clique retornam HTTP 409 para a duplicada. Após uma consulta, há intervalo de 15 segundos, com HTTP 429 e `Retry-After`, para evitar consumo desnecessário. Não existe polling nem retentativa automática.

## O que permanece inalterado

Não foram modificados adaptadores de emissão, tokens das empresas, criptografia fiscal, certificados, numeração, séries, ambiente escolhido, vendas, pagamentos, clientes, Central Fiscal, filas, WhatsApp, push ou dados cadastrais de empresas. O diagnóstico só consulta o registro interno e a API cadastral externa.

**Não exige migração de banco. Não adiciona dependências.** Não foram alterados `package.json` ou lockfile.

## Aplicar e testar no Windows

Copie as pastas do ZIP sobre a raiz do projeto, mantendo as subpastas e os demais arquivos. Este pacote contém somente 6 arquivos de código/teste novos ou alterados, além da documentação.

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\tests\focus-diagnostico.test.js
```

Se as dependências ainda não estiverem instaladas, execute `npm ci` primeiro. Para executar a suíte completa:

```powershell
$testes = @((Get-ChildItem .\tests\*.test.js).FullName) + @(".\backend\scripts\lab-fiscal\teste.js")
node --test --test-concurrency=1 $testes
```

Os testes usam token fictício e respostas simuladas. Não precisam do seu Token Master nem de certificado e não consultam a Focus real.

No Render, mantenha seu build `npm ci --omit=dev`, start `npm start` e pre-deploy atual. **Não execute migração adicional por causa deste botão.** Configure somente as variáveis descritas e faça commit/deploy pela sua rotina habitual, revisando os arquivos. Não inclua segredos no commit.

## Validação realizada

- Cinco grupos automatizados de testes específicos passaram, incluindo CNPJ e dígitos verificadores, URL fixa/Basic, HTTP 200/400/401/403/404/429/500/302, token ausente, rede/DNS simulados e timeout sem retry.
- HTTP local com JWT e banco SQLite isolado: usuário ERP rejeitado, admin sem autorização rejeitado, claims erradas rejeitadas, admin inativo rejeitado, seleção de empresa no cadastro, Master ausente, parâmetros manipulados, dupla requisição e cooldown. Os registros da empresa permaneceram iguais antes/depois.
- Respostas e logs foram verificados contra o token fictício e sua representação Basic; nenhum deles o expôs. Não houve POST externo para emissão ou escrita cadastral.
- Frontend em DOM simulado: botão oculto para comum, autorizado visível, desabilitado durante a consulta, uma chamada por duplo clique, resultado com emissão/certificado não testados.
- Suíte completa: **176 testes aprovados, zero falhas**, incluindo o laboratório fiscal e as regressões existentes.
- Instalação de produção `npm ci --omit=dev` passou e aplicou o patch libsignal existente. Não há build separado de frontend neste projeto estático.
- Chromium não conseguiu iniciar neste ambiente. Não afirmo validação visual real nem teste em aparelho; a conferência final de desktop/mobile deve ser feita após o deploy.
- Não usei Token Master real, não alterei seu banco TiDB e não fiz deploy no seu Render. A consulta real precisa ser confirmada no botão após configurar as variáveis.

Veja também `docs/VALIDACAO-FOCUS-DIAGNOSTICO.txt` e a lista exata em `docs/ARQUIVOS-FOCUS-DIAGNOSTICO.txt`.

## Roteiro final no sistema

1. Configure as variáveis e faça deploy. Entre como admin autorizado e acesse uma empresa com CNPJ válido.
2. Confira que o botão aparece perto do provedor e que os campos de emissão/ambiente não mudam ao clicar.
3. Clique e aguarde: resultado deve indicar autenticação, comunicação e consulta funcionando; emissão não testada e A1 não verificado.
4. Faça dois cliques rápidos: deve existir apenas uma consulta. Aguarde 15 segundos para repetir.
5. Abra a tela em uma conta comum, sem sessão do painel administrativo: o botão deve permanecer oculto. O backend também bloqueia chamadas manuais dessa conta.
6. Confira desktop e celular: botão legível, mensagens sem sobreposição e dados do diagnóstico correspondentes à empresa mostrada.
7. Sucesso nesse teste não autoriza concluir que notas já podem ser emitidas. Habilitação e configuração fiscal da empresa continuam sendo verificações separadas.
