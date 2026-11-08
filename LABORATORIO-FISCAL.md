# Central Fiscal e Configuração Fiscal do PetHub

## Aplicar no VS Code

Abra sua pasta sistema-2028. Salve um commit das alterações locais que deseja manter. Extraia este ZIP na raiz onde ficam package.json, backend e frontend. As subpastas seguem a estrutura do projeto. Se você editou algum desses arquivos depois de enviar sua cópia, compare suas mudanças antes de substituir. O pacote não altera o esquema do banco nem adiciona dependências.

## Testar sem empresa, certificado ou TiDB

No PowerShell, na pasta do PetHub, use Node 22.13 ou posterior para o laboratório. Se as dependências ainda não estiverem instaladas, execute npm ci. Depois rode:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
node --test .\backend\scripts\lab-fiscal\teste.js
node .\backend\scripts\lab-fiscal\app.js
```

1. Abra o endereço de loopback que o terminal imprimir. A porta é sorteada a cada execução. O processo inicializa duas empresas de teste e usa SQLite em memória.
2. Clique em **Configuração Fiscal**, habilite a configuração, escolha **Focus NFe**, **homologação**, **manual** e **NFC-e**. Use o token fictício **LAB** e salve. Reabra a tela para conferir os parâmetros e a indicação de token salvo.
3. Clique em **Início** na faixa do laboratório. Selecione **Produto 1** e clique em **Gerar rascunho**. A venda de R$ 72,00 contém duas unidades de R$ 40,00 com 10% de desconto. Abra **Central Fiscal** e localize o rascunho.
4. Emita o documento e consulte novamente pela ação da linha. Observe a passagem de rascunho para aguardando e depois autorizada. Abra o PDF e baixe o XML. Ambos são fictícios. Atualize a página e confirme que há um único documento para a venda.
5. Para simular uma rejeição, volte ao início, selecione **Produto 2** e a resposta **erro_autorizacao**. Gere e emita o rascunho, depois consulte. O documento deve exibir o erro. Para simular NF-e, habilite NF-e, desabilite NFC-e e use **Produto 4**. Para testar o limite de serviços, habilite rascunho de NFS-e e use **Serviço de banho**. A transmissão desse serviço deve ser bloqueada.
6. Use Ctrl+C para encerrar. Ao reabrir, o banco começa vazio com as vendas fictícias iniciais. A rotina não carrega o .env da aplicação, não acessa o TiDB e intercepta a comunicação fiscal com a Focus no próprio processo.

## Resultado da verificação

Os testes exercitam as rotas Express com JWT e os modelos Sequelize. Cobrem acesso às páginas, gravação e proteção do token por empresa, permissões, filtros, rascunho único, requisições simultâneas, desconto, Pix e débito, autorização, rejeição, denegação, resposta desconhecida, consulta por referência após perda da resposta, envio em lote, PDF/XML, bloqueio de transações não suportadas e separação entre homologação e produção. A suíte automatizada usa SQLite em memória e respostas de provedor simuladas. A tela do PDV completo, concorrência real de vários processos em TiDB, autorização pela SEFAZ e impressão física não foram exercitadas.

## Usar as correções no Render

O laboratório é iniciado somente no seu computador. No Render, o serviço continua com seu comando normal. Para gravar o token fiscal de uma empresa, gere uma chave uma única vez no PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Cadastre o resultado de 64 caracteres hexadecimais como **FISCAL_ENCRYPTION_KEY** em **Environment** do serviço. Guarde uma cópia segura. A mesma chave deve estar presente em todos os processos que usam esse banco. Perder ou substituir a chave impede a leitura dos tokens já criptografados. O laboratório gera a própria chave. Use apenas LAB dentro dele.

Se já havia um token antigo em texto puro, abra e salve a configuração com a chave definida para regravá-lo protegido. Registros antigos de certificado/senha não são apagados automaticamente. Revise esses dados legados antes de decidir sobre remoção. O novo fluxo deixa o certificado sob gestão do provedor. A aplicação deixa de aceitar upload de certificado nesta tela.

## Alcance fiscal

- **NF-e e NFC-e de mercadorias** têm fluxo de emissão e consulta pela Focus. Além dos perfis sem destaque já cobertos, o adaptador calcula por item o ICMS CST 00 e PIS/COFINS CST 01 ou 02 para revenda interna com CFOP 5102, sem adicionais, com alíquotas informadas. O cálculo usa o valor líquido do item e deduz o ICMS destacado da base das contribuições nesse cenário. Códigos e alíquotas presentes no laboratório são dados de teste. Para operações reais, valide perfil fiscal, cadastros, numeração no provedor, códigos e totais com o responsável fiscal. ICMS-ST, créditos, reduções, adicionais como FCP, IPI e outros perfis não foram implementados. Frete e descontos globais que façam os itens divergirem dos totais exigem tratamento específico. IBS/CBS não foram homologados.
- **NFS-e** permite preparar rascunho. A transmissão de banho, tosa ou outro serviço depende da implementação do contrato de NFS-e adequado ao emitente e à prefeitura. Vendas mistas são bloqueadas para revisão.
- **Cancelamento e inutilização** não têm fluxo completo validado na Central. Os provedores alternativos PlugNotas, eNotas e TecnoSpeed não têm implementação operacional neste pacote.
- **Homologação externa** é uma etapa separada. Para o fluxo Focus documentado, cadastre um emitente real com certificado A1 válido e use o token do ambiente de homologação. As autorizações simuladas do laboratório não são enviadas a autoridades fiscais. [Cadastro de empresa na Focus](https://doc.focusnfe.com.br/docs/como-cadastrar-uma-empresa) · [Ambientes da Focus](https://doc.focusnfe.com.br/reference/ambiente)

## Arquivos

As duas páginas HTML são a Central Fiscal e a Configuração Fiscal. No backend, os controladores configuracaoFiscalController, notaFiscalController e vendaController, os middlewares authUser e exigePermissao e as rotas notaFiscalRoutes tratam entradas e acesso. O serviço notaFiscalService coordena o documento. FiscalPayloadBuilder, FiscalServiceFactory, FocusNFeAdapter e credencial cuidam do payload, da escolha do provedor, do envio e da proteção do token. Os três arquivos em backend/scripts/lab-fiscal compõem o ambiente de testes.
