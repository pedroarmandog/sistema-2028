# PetHub — Estado (UF) no cadastro e edição de clientes

Implementação de 14/11/2026. Pacote incremental: somente arquivos novos/alterados nesta tarefa, sobre a última versão do projeto que trabalhamos. Não contém novamente os módulos do pacote anterior de mídias/R2; mantenha esses arquivos e as outras correções já aplicadas. Se tiver alterações locais posteriores nos mesmos arquivos, faça uma cópia e revise antes de sobrepor.

## Diagnóstico

O modelo `Cliente` já declara a coluna **`estado`**, e o controller já tinha suporte a recebê-la. A importação já reconhecia Estado/UF. O formulário usado para adicionar e editar (`frontend/novo-cliente.html`) não tinha um elemento `id="estado"`: o JavaScript tentava preencher e enviar um campo inexistente.

A busca de CEP existente também tinha problemas: acionamento por keyup e blur podia repetir a mesma consulta, não preenchia o código IBGE, podia apagar campos com valores vazios retornados e não protegia contra respostas fora de ordem. O proxy do backend não limitava o tempo de espera.

O módulo fiscal já mapeava `cliente.estado` → endereço normalizado → `uf_destinatario`. A falta do campo no formulário impedia completar esse dado. Foi mantido o contrato, acrescentando normalização da UF e uma orientação específica quando falta uma UF válida na emissão de NF-e.

## Frontend

- Um seletor **Estado (UF)** com as 27 UFs, exibindo nome e sigla, ao lado de Cidade na mesma seção de Código IBGE.
- O mesmo formulário atende cadastro e edição. Carrega a UF salva e permite alteração/remoção manual.
- Envia a sigla de duas letras em `estado`; campo vazio pode ser salvo normalmente.
- A consulta automática ocorre ao digitar **ou colar** os 8 números do CEP, com espera curta de 250 ms e indicador discreto.
- Preenche logradouro, bairro, cidade, UF e código IBGE quando a resposta traz valores válidos e não vazios.
- **Número e complemento não são alterados pela consulta.** Todos os campos continuam editáveis.
- Uma resposta antiga não altera o CEP atual. Consulta repetida em andamento é reaproveitada. Edições manuais feitas enquanto a consulta aguarda são preservadas.
- CEP inválido, inexistente, indisponibilidade, resposta inválida e timeout mantêm os dados digitados. O botão existente permite tentar novamente.
- Carrega o código IBGE e o país existentes ao editar, além da UF.
- A exportação de clientes passa a incluir a coluna UF. As outras colunas e seus valores são mantidos.
- O grid responsivo existente foi preservado; nenhuma reorganização dos outros módulos foi feita.

Valores legados com nome completo, como `Minas Gerais`, são reconhecidos como `MG`. Um valor legado desconhecido não é silenciosamente apagado ao editar outro campo; o usuário pode escolher uma UF válida para corrigi-lo.

## Backend e banco

**Não foi criada outra coluna de UF.** Foi reutilizado `Clientes.estado`; o modelo já a possuía e não precisou mudar. Cadastro/edição normalizam siglas e nomes de estados conhecidos, aceitam ausência e rejeitam uma UF nova inválida com HTTP 400. Listagem e consulta retornam `estado`.

A preparação aditiva verifica a tabela:

- Se `estado` já existe, não modifica tipo, valores ou registros.
- Se falta, acrescenta apenas `estado VARCHAR(2) NULL` pelo QueryInterface do Sequelize, compatível com MySQL/TiDB.
- Não há DROP, recriação, `sync({force:true})`, backfill ou atribuição de uma UF presumida no script de produção.
- Clientes sem UF continuam válidos para cadastros comuns.

A preparação já foi incluída no comando de pre-deploy usado anteriormente:

```text
node backend/scripts/preparar-clientes-inteligencia.js
```

Existe também um comando independente, caso queira verificar/preparar somente a UF:

```text
node backend/scripts/preparar-clientes-uf.js
```

Não precisa executar SQL manual. Confira as variáveis `DB_*` e `DB_SSL` do ambiente antes de executar qualquer script conectado ao seu banco. A migração é aditiva, mas mantenha o backup habitual.

## Focus NFe

O fluxo usa o estado **do cliente**, sem copiar a UF da empresa e sem inventar um padrão. A UF é normalizada antes de chegar a `uf_destinatario`. Se faltar ou for inválida em uma NF-e, a validação indica **Clientes → Editar → Endereço → Estado (UF)** antes da transmissão.

A emissão continua exigindo os demais dados fiscais já necessários. Esta alteração não completa CPF/CNPJ, inscrição estadual, tributação ou outras informações por conta própria. A NFC-e sem destinatário identificado mantém seu comportamento anterior. Não foram alterados tokens, certificados, ambiente, credenciais ou configurações Focus.

Documentação oficial conferida:

- https://doc.focusnfe.com.br/reference/emitir_nfe
- https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html
- https://viacep.com.br/

## Compatibilidade

| Área | Tratamento |
| --- | --- |
| Clientes antigos | Ausência de UF permitida; nenhum cadastro apagado ou recriado. |
| Pets e vínculos | IDs e associações não foram alterados; teste HTTP conferiu o vínculo após editar UF. |
| Vendas/PDV e análise de vendas | Código e contratos de venda preservados; suíte existente executada. |
| Agendamentos e financeiro | Nenhuma alteração em tabelas ou regras desses módulos; testes existentes executados. |
| Marketing e WhatsApp | Não foram alterados sessões, QR, fila, lembretes ou conexão. Testes de regressão incluídos. |
| Planilhas de clientes | Estado/UF/Estado (UF) reconhecidos. Coluna ausente continua opcional. UF inválida na importação gera aviso e preserva o original para conferência, sem rejeitar todo o cliente por esse campo opcional. |
| Exportação | UF acrescentada; arquivos antigos continuam aceitos. |
| Mobile/PWA | API mantém os campos existentes e acrescenta `estado` à listagem. Nenhuma alteração no login, push ou service worker. Validação física final no aparelho continua recomendada. |
| Busca de CEP de empresa/fornecedor/profissional | Mesma rota `/api/cep/:cep`. Campos existentes da resposta, inclusive complemento, foram preservados para essas outras telas. A regra de não alterar complemento é específica do formulário de clientes. |

## Instalação no PowerShell

1. Faça uma cópia dos arquivos atuais.
2. Descompacte o ZIP e copie **as pastas `backend`, `frontend`, `tests` e `docs` sobre a raiz do seu projeto**, mantendo as subpastas. Não apague as pastas existentes.
3. Abra o PowerShell na pasta do projeto:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node .\backend\scripts\preparar-clientes-uf.js
node --test .\tests\cliente-uf.test.js
```

O primeiro comando de preparação usa o banco configurado no `.env`. Os testes usam apenas banco em memória e serviços simulados.

Para executar a suíte completa sem depender de expansão de `*` pelo PowerShell:

```powershell
$testes = @((Get-ChildItem .\tests\*.test.js).FullName) + @(".\backend\scripts\lab-fiscal\teste.js")
node --test --test-concurrency=1 $testes
```

Não foram adicionadas dependências nem alterados `package.json`/lockfile. Se a pasta `node_modules` ainda não estiver instalada, execute `npm ci` antes. O projeto usa frontend estático e não tem script `npm run build`.

Para iniciar localmente:

```powershell
npm start
```

## Render e TiDB

- **Build:** mantenha `npm ci --omit=dev`.
- **Start:** mantenha `npm start`.
- **Pre-deploy:** se já usa `node backend/scripts/preparar-clientes-inteligencia.js`, mantenha: o arquivo atualizado prepara UF também. Se usa outro comando, integre `node backend/scripts/preparar-clientes-uf.js` ao fluxo existente sem remover preparações necessárias.
- **Variáveis novas:** nenhuma.
- **Focus:** não troque tokens ou configurações por causa desta alteração.
- Após o deploy, atualize a página com **Ctrl+F5** para carregar o HTML/JavaScript novos.

Revise os arquivos no VS Code e faça commit/push pela rotina habitual. Não envie `.env`, backups ou relatórios de dados pessoais ao GitHub.

## Testes executados e limites

Resultado final registrado em `docs/VALIDACAO-CLIENTES-UF.txt`.

- **10 testes específicos de UF/CEP aprovados.** Incluem preenchimento automático por input/colar, deduplicação, respostas fora de ordem, proteção de edições manuais, número/complemento intactos, erros de CEP/rede/timeout, edição e serialização da UF, migração repetível, importação opcional, HTTP real com JWT, listagem/consulta/persistência, vínculo de pet e isolamento entre empresas.
- A montagem real do payload Focus foi exercitada sem transmissão: UF `ES` do cliente foi para `uf_destinatario`, mesmo com emitente em `MG`. Ausência de UF bloqueou a preparação da NF-e com orientação; nenhum request fiscal externo ocorreu.
- **Suíte completa: 171 testes aprovados, 0 falhas**, incluindo laboratório fiscal, vendas/PDV, importação, marketing, WhatsApp, push e testes de mídias anteriores.
- Sintaxe verificada nos 17 arquivos JavaScript novos/alterados.
- Não foi usado banco TiDB de produção nos testes automatizados.
- O navegador Chromium deste ambiente não iniciou. O comportamento do frontend foi testado em DOM simulado; não afirmo validação visual real em desktop/celular. O roteiro abaixo cobre essa conferência final.
- Uma execução inicial em paralelo encontrou um timeout de espera no teste antigo de persistência WhatsApp. A suíte final foi executada sequencialmente, com todos os 171 testes aprovados; não alterei o WhatsApp para contornar isso.

## Roteiro curto no sistema

1. Abra **Novo Cliente**. Digite `30130-010`. Confira endereço, cidade, UF e IBGE. Preencha seu número e complemento e confirme que a consulta não os substitui.
2. Salve um cliente de teste. Abra **Editar**, confira UF/IBGE, mude manualmente a UF e salve. Atualize e reabra para confirmar persistência.
3. Cadastre outro cliente de teste sem UF e sem CEP: deve continuar salvando normalmente.
4. Teste CEP inexistente e também uma consulta com conexão indisponível; os campos manuais devem ser conservados.
5. Troque rapidamente entre dois CEPs: apenas o resultado do último deve ser aplicado.
6. Confira um cliente antigo e seus pets. Faça uma venda de teste e consulte a análise do cliente pela rotina habitual.
7. Na homologação fiscal, com os demais dados válidos, confira a preparação da NF-e com UF do destinatário. Não emita em produção apenas para testar esta alteração.
8. Abra o formulário no celular e no desktop. Confira seletor legível, grid sem sobreposição e os dados do cliente disponíveis normalmente no PWA.

## Arquivos

Consulte `docs/ARQUIVOS-CLIENTES-UF.txt`: lista exata de arquivos novos/alterados. Não é necessário reenviar o projeto inteiro.
