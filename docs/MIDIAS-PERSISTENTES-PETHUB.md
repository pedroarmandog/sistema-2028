# PetHub — imagens persistentes e recuperação dos arquivos antigos

Implementação de 14/11/2026. Leia a seção de preservação **antes de fazer deploy**.

## O que foi encontrado

Produtos, imagens de Marketing, campanhas, fotos de clientes, assinaturas, logos e anexos usavam `uploads/` no disco da API. Multer e gravações de base64 criavam arquivos locais; o banco conservava apenas o caminho. A edição de produto ainda capturava falhas de gravação e continuava salvando, podendo indicar sucesso sem persistir a foto.

O disco padrão do Render é efêmero: um plano de computação pago mantém o serviço ativo, mas não torna esse diretório persistente. Reinícios e deploys podem descartá-lo. Não foi encontrada, nos fluxos ativos auditados, uma rotina que apagasse todas essas imagens no build; havia também exclusão física de logos durante substituições/exclusões.

Sem acesso à instância atual e ao banco de produção, não foi possível determinar quais imagens do print desapareceram e quais ainda existem, mas estão inacessíveis. Os caminhos locais no código comprovam a vulnerabilidade estrutural; o diagnóstico de migração identifica a situação de cada referência real.

**Fonte:** https://render.com/docs/disks

## Solução implementada

- Objetos privados em armazenamento compatível com S3; configuração recomendada: Cloudflare R2, classe **Standard**.
- Chave imutável: `empresas/<empresaId>/<modulo>/<privado-ou-publico>/<sha256>.<ext>`.
- Tabela `midias_arquivos` com UUID, empresa, módulo, chave, caminho estável, MIME, tamanho, hash, datas, escopo público e aliases legados. Foi necessária uma tabela central: os campos antigos não guardavam proprietário, tipo ou chave de objeto suficientes para autorizar a leitura compartilhada por vários módulos.
- Os campos existentes continuam guardando caminhos curtos compatíveis com as telas. `/uploads/produtos/<uuid>.webp`, por exemplo, passa a ser uma rota de leitura do objeto, **não uma pasta estática**. Não há URL assinada expirada gravada nos cadastros.
- Upload → validação real → otimização → PUT → HEAD conferindo tamanho e hash → metadados → vínculo no cadastro. Falhas preservam a referência anterior.
- Reenvios iguais deduplicam por empresa, módulo e escopo. Mesmo conteúdo em empresas diferentes recebe objetos separados. Reenvio também repõe um objeto que tenha sido removido externamente.
- Imagens são limitadas a 8 MB, dimensões até 25 milhões de pixels e saída de até 1.600 × 1.600, sem ampliar fotos menores. JPG/PNG/WebP viram WebP com qualidade 88; GIF validado conserva o arquivo. SVG restrito é rasterizado em PNG. Documentos: até 20 MB, PDF, imagens, DOCX, XLS/XLSX reconhecidos pelo conteúdo. Não basta trocar a extensão.
- Até dois uploads multipart processados simultaneamente, com fila curta. Documentos/planilhas de contatos do disparador usados apenas para leitura ficam transitoriamente na memória; não precisam virar arquivos definitivos.
- Arquivos privados exigem a sessão existente do ERP e pertencimento à empresa. Cookies HttpOnly funcionam em imagens; o PWA usa Bearer apenas para a API conhecida, sem token na URL. O cache offline não armazena mídias privadas.
- Somente logotipos corporativos recebem escopo público explícito, com caminho UUID imprevisível. O bucket permanece privado; o acesso público da logo passa pela API. Se considerar sua logo confidencial, não a publique como marca da empresa.
- Substituir/excluir uma imagem remove o vínculo do cadastro, **sem apagar o objeto** que outro registro, relatório ou envio agendado possa usar. Não foi criado cron de exclusão nem comandos DeleteObject. Essa retenção também preserva objetos órfãos; uma futura coleta exigirá auditoria dos vínculos.
- Os PDFs leem a logo no armazenamento e a convertem em PNG em memória, porque PDFKit não lê WebP diretamente. O WhatsApp recupera os bytes da mesma referência; WebP é convertido em JPEG para a mensagem. Mídia indisponível retorna erro temporário antes do envio, preservando a política existente de pendência da fila.
- Não foram modificados pareamento, QR, credenciais, monitoramento ou reconexão do WhatsApp.

### Módulos auditados

| Módulo | Alteração |
| --- | --- |
| Produtos e serviços | Cadastro, edição, foto na página de produto, miniaturas e importações passam pelo serviço persistente. Preço, estoque, custo e demais campos são preservados. |
| Importações de produtos | Coluna Imagem/Foto/URL da imagem. Referências próprias são aceitas; importação de imagem externa exige `MEDIA_IMPORT_HOSTS`, com host exato autorizado. O destino final é sempre uma referência própria. |
| Marketing e lembretes | Upload de imagem do modelo persistente; filas conservam as referências, inclusive snapshots antigos migráveis. |
| Disparador | Imagem da campanha no bucket; planilha/CSV de contatos somente em memória; serviço de envio lê a referência persistente. |
| Empresa e painel admin | Logos persistentes com ID da empresa criado no servidor. Trocas não apagam imagens antigas. |
| Clientes | Foto de perfil por multipart e atualização de referência com isolamento de empresa. |
| Pets | Foto e documentos persistentes; prontuário de documento inclui a empresa autenticada. |
| Profissionais | Assinatura persistente; upload e alteração validam o proprietário. |
| Agendamentos | Upload de anexos valida primeiro o agendamento da empresa. |
| Relatórios, vendas e orçamentos | Logos carregadas em memória pela empresa autorizada, sem dependência de caminho local. |
| Usuários/admin | Não foi encontrada uma rota ativa de upload de foto do usuário ERP. O campo de foto global de admin já armazenado no banco não depende do disco; referências sem empresa não são atribuídas automaticamente a um cliente na migração. |
| PetHub Mobile | Leitura com Bearer, recuperação de imagem autenticada e bypass do cache privado; service worker atualizado. |

## 1. Antes do deploy: preserve o que ainda existe

**Não reinicie, não limpe o cache do build e não faça deploy antes de copiar os arquivos atuais recuperáveis.** O novo deploy pode eliminar justamente os arquivos que você deseja migrar.

1. Faça backup do banco TiDB pelo procedimento que já utiliza.
2. Preserve uma cópia da pasta `uploads/` da **instância atual** do Render e as cópias locais/backups que possui. Não use uma instância shell efêmera: ela não tem os arquivos gravados pela API ativa.
3. Seu serviço pago permite SSH. Em Render → serviço → **Connect → SSH**, copie o destino exato. Cadastre sua chave pública SSH na conta Render se ainda não fez isso. Nunca compartilhe a chave privada.
4. No PowerShell, usando o destino copiado do painel (sem o `ssh` inicial), adapte:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
New-Item -ItemType Directory -Force ".\backup-midias-render" | Out-Null
$destinoRender = "DESTINO_USUARIO@HOST_COPIADO_DO_PAINEL"
scp -r "${destinoRender}:/opt/render/project/src/uploads" ".\backup-midias-render\"
```

Se sua instalação de SCP exigir o protocolo antigo, teste `scp -O -r` com o mesmo destino. Confirme que a pasta baixada contém arquivos antes de continuar. Caso não consiga copiá-la, preserve-os por outra ferramenta de backup/SSH antes de fazer deploy. Documentação de acesso: https://render.com/docs/ssh

Na cópia antiga do projeto enviada nesta conversa, foram localizados **91 arquivos** dentro de `uploads/`, totalizando **43.533.795 bytes**: 68 PNG, 5 JPG, 9 PDF, 3 XLSX, 2 XLS e 4 arquivos sem extensão. São fontes potenciais, não 91 imagens já recuperadas no banco. A correspondência depende dos caminhos reais cadastrados. Os arquivos pessoais não estão duplicados neste pacote de código.

## 2. Criar o bucket Cloudflare R2

1. Entre no painel Cloudflare com sua conta.
2. Abra **Storage & databases → R2 → Overview** e ative R2 conforme as condições exibidas na sua conta.
3. **Create bucket**: por exemplo `pethub-midias`. Escolha **Standard**, não Infrequent Access.
4. Mantenha **Public Development URL/r2.dev desabilitada**. Não precisa de domínio público, Worker ou regra CORS no bucket: só o backend acessa a API S3.
5. Em **Manage R2 API Tokens**, crie credenciais **Object Read & Write**, restritas a esse bucket. Anote **Access Key ID**, **Secret Access Key** e o **S3 API endpoint**. Eles são diferentes do token Focus NFe, JWT e das chaves de criptografia do WhatsApp/fiscal.
6. No bucket → Settings → Lifecycle Rules, confirme que **nenhuma regra expira objetos no prefixo `empresas/`**. Regra de abortar multipart incompleto é diferente de expirar objetos completos. Não adicione limpeza automática de imagens.
7. Configure alertas de consumo na conta. Mantenha também cópia independente dos objetos importantes; persistência não substitui backup contra exclusão administrativa.

Documentação: https://developers.cloudflare.com/r2/get-started/s3/
SDK usado: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/

## 3. Variáveis do backend

Render → serviço PetHub → **Environment**:

| Key | Value |
| --- | --- |
| `MEDIA_S3_BUCKET` | Nome exato do bucket, por exemplo `pethub-midias` |
| `MEDIA_S3_ENDPOINT` | Endpoint S3 copiado do R2, normalmente `https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com` |
| `MEDIA_S3_REGION` | `auto` |
| `MEDIA_S3_ACCESS_KEY_ID` | Access Key ID criado no R2 |
| `MEDIA_S3_SECRET_ACCESS_KEY` | Secret Access Key criado no R2 |

Não coloque aspas nos valores do painel. Não use `r2.dev` no endpoint S3. Copie o endpoint exato se sua conta usar endpoint de jurisdição específica.

Para testar no Windows, acrescente as mesmas variáveis ao seu `.env` local. **Não substitua seu `.env` inteiro** e não o envie ao GitHub. O exemplo `docs/midias.env.example` não contém credenciais reais.

Opcionais, somente quando necessários:

- `MEDIA_LEGACY_ROOT`: caminho absoluto da pasta `uploads` de um backup disponível na máquina que executa a migração. `--raiz` permite escolher esse caminho por execução.
- `MEDIA_MIGRATION_HOSTS`: hosts HTTPS antigos explicitamente autorizados para recuperação, separados por vírgulas; sem `https://`, sem caminho. Exemplo: `pethub-api-wdna.onrender.com`.
- `MEDIA_LEGACY_BASE_URL`: URL HTTPS da API antiga ainda ativa, utilizada para tentar recuperar `/uploads/<caminho>` quando o arquivo só tem nome relativo. Alternativa: `--base-antiga`. Não é preciso configurar se usa backup local.
- `MEDIA_IMPORT_HOSTS`: hosts HTTPS exatos permitidos nas imagens de planilhas de produtos. Vazio bloqueia download externo arbitrário. Endereços privados, metadados de nuvem, redirecionamentos e respostas maiores que o limite são bloqueados. Não libere hosts desconhecidos.

Não remova variáveis de banco, fiscal, JWT, push ou WhatsApp. Não precisa adicionar disco pago ou instalação de navegador para imagens.

## 4. Aplicar somente os arquivos deste pacote

Descompacte o ZIP e copie as pastas `backend`, `frontend`, `tests`, `docs`, `package.json` e `package-lock.json` sobre a **raiz do seu projeto atual**, preservando as subpastas. São somente arquivos novos/alterados; não apague o restante do projeto. Faça uma cópia dos arquivos locais antes de sobrepor, especialmente se editou algum depois da versão enviada.

No PowerShell:

```powershell
cd "C:\Users\pedro\OneDrive\Área de Trabalho\sistema-2028"
npm ci
node --test .\tests\midias.test.js
node --test .\tests\*.test.js .\backend\scripts\lab-fiscal\teste.js
```

Se sua versão do PowerShell não expandir `*.test.js` para o Node, use:

```powershell
$testes = @((Get-ChildItem .\tests\*.test.js).FullName) + @(".\backend\scripts\lab-fiscal\teste.js")
node --test $testes
```

O projeto não possui etapa de build do frontend; os arquivos estáticos são servidos diretamente. `npm ci` precisa ser executado **antes** dos testes/inicialização. Bibliotecas de produção adicionadas/fixadas: AWS SDK S3 `3.1169.0`, file-type `21.3.4`, sharp `0.35.5`. O projeto segue CommonJS e o detector ESM usa importação dinâmica. Foram mantidos Baileys e o patch de libsignal. Use Node compatível com o projeto (o laboratório exige Node 22.13+; valide também a exigência de versão das dependências atuais).

## 5. Preparar a tabela (sem apagar dados)

```powershell
node .\backend\scripts\preparar-midias.js
```

É aditivo e idempotente: cria `midias_arquivos` e índices se não existirem, sem `force`, sem `alter`, sem apagar produtos/campanhas. Não precisa executar SQL manual no TiDB. Usa as variáveis `DB_*` e TLS já configuradas. Confira o banco apontado pelo seu `.env` antes de rodar comandos de migração.

O pre-deploy que você já utiliza também foi atualizado para preparar a tabela:

```text
node backend/scripts/preparar-clientes-inteligencia.js
```

Mantenha esse comando se já está configurado. Se usa outro pre-deploy, acrescente `node backend/scripts/preparar-midias.js` ao fluxo, preservando os comandos existentes. Não substitua preparações anteriores necessárias.

## 6. Migrar arquivos antigos

Use preferencialmente o backup local, pois um novo deploy pode apagar o disco antigo. A migração lê os cadastros, mensagens, campanhas, filas, campos de mídia e estruturas JSON de documentos; não escolhe proprietários por semelhança de nome. Registros sem empresa ficam para conferência manual.

Primeiro, **diagnóstico sem alterar os dados** (ajuste a raiz para a pasta que contém os arquivos antigos):

```powershell
node .\backend\scripts\migrar-midias.js --raiz "C:\caminho\backup-midias-render\uploads" --relatorio ".\midias-diagnostico-01.jsonl"
```

Depois de conferir o relatório e configurar/testar R2, aplicar:

```powershell
node .\backend\scripts\migrar-midias.js --aplicar --raiz "C:\caminho\backup-midias-render\uploads" --relatorio ".\midias-aplicacao-01.jsonl"
```

Para uma empresa específica, acrescente `--empresa 1`, usando o ID interno real. Execute mais de uma vez se houver outras cópias de backup, mudando `--raiz` e o nome do relatório. Arquivos já migrados não são duplicados; ausentes podem ser recuperados numa execução posterior.

Se preferir tentar a URL antiga ainda ativa, configure `MEDIA_MIGRATION_HOSTS` e use `--base-antiga https://pethub-api-wdna.onrender.com`. Só funciona enquanto o arquivo continuar acessível nesse servidor. Se a rota antiga exige sessão, prefira a cópia por SSH; o script não coleta cookies nem contorna autenticação.

A migração confirma upload **e leitura** antes de trocar o vínculo. Usa bloqueio e comparação da referência atual para não sobrescrever uma foto editada durante o processo. Não apaga arquivos locais, objetos ou cadastros. Relatórios são JSON Lines, com modelo/ID/campo/empresa e identificador hash da origem, sem base64, URL com segredo ou credenciais. O arquivo de relatório deve ser novo a cada execução; o script não sobrescreve um relatório existente.

Estados importantes: `recuperavel`, `migrada`, `ja_migrada`, `nao_localizada`, `sem_empresa`, `alterado_durante_migracao`, `erro`, `tabela_indisponivel`. Quantidades contam **referências**, não necessariamente objetos distintos. `nao_localizada` não significa perda definitiva até verificar todas as fontes de backup. Arquivos realmente ausentes em todas as fontes precisarão de novo upload.

Não agende a migração completa em todo deploy. Faça-a em janela de menor uso, confira os resultados e mantenha os backups. Como as referências do banco passam a apontar para objetos, implante o código novo logo após aplicar a migração; a versão antiga não lê as novas referências remotas.

## 7. Render: deploy

Depois de preservar os arquivos antigos e configurar as variáveis:

| Configuração | Valor |
| --- | --- |
| Build Command | `npm ci --omit=dev` |
| Pre-Deploy Command | Mantenha `node backend/scripts/preparar-clientes-inteligencia.js`, que já inclui mídias; ou integre `preparar-midias.js` ao seu comando existente |
| Start Command | `npm start` |

Não precisa instalar Chrome, Puppeteer ou montar `uploads/` em disco persistente. Não altere as configurações de sessão do WhatsApp por causa deste pacote.

Para enviar o código, revise primeiro `git status`. Adicione **somente os caminhos do manifesto** ou selecione os arquivos no VS Code. Não use `git add .` se sua pasta contém `.env`, backups ou relatórios com dados pessoais. Faça commit e push pela sua rotina habitual.

Após o deploy, no Shell do Render, valide acesso ao bucket com o ID interno real de uma empresa:

```bash
node backend/scripts/verificar-midias.js 1
```

Verifica PUT, HEAD, GET e banco com uma imagem minúscula de diagnóstico, preservada no bucket. Também tenta consultar as regras de expiração: saída `0` confirma os checks; `1` indica falha; `2` indica que PUT/HEAD/GET passaram, mas a política precisa de conferência manual no painel (credenciais restritas podem não autorizar essa consulta). Não dê permissão administrativa mais ampla só para eliminar esse aviso.

## 8. Validação com seu sistema e celular

1. Cadastre ou edite a foto de um produto. Confira que a foto carregou e que preço, custo e estoque não mudaram.
2. Configure uma imagem em um lembrete de Marketing. Atualize a página e confira a mesma imagem.
3. Envie uma mensagem de teste para um número seu usando a função normal de envio. Confirme no aparelho a **imagem recebida**, não apenas o status da tela.
4. Programe um lembrete para mais tarde; confirme que a fila conserva a imagem e só marca enviado com confirmação do conector. Confira também um agendamento de alguns dias depois.
5. Reinicie a API no Render. Confira produto, Marketing, logo, foto de pet, assinatura e um documento sem reenviar arquivos.
6. Faça um novo deploy. Repita a conferência pelo desktop e pelo PWA. Se o PWA estiver antigo, feche e abra-o para ativar o novo service worker.
7. Use duas empresas: A não deve ler uma foto privada de B, nem substituí-la por ID. Logo corporativa pública é a exceção intencional descrita acima.
8. Substitua uma foto compartilhada com um envio antigo. O cadastro deve mostrar a nova, e o envio antigo deve conservar acesso à anterior.
9. Em ambiente de teste, coloque credenciais S3 inválidas: o upload deve falhar com mensagem clara e o cadastro conservar a imagem anterior. Restaure as credenciais depois.
10. Confirme no painel R2, depois de alguns dias, que os objetos e as referências permanecem e que não há regra de expiração. Nenhum teste rápido substitui observação prolongada em produção.

## 9. O que foi efetivamente testado

Acompanhe `docs/VALIDACAO-MIDIAS.txt`, incluído no pacote, com o resultado final executado.

- Instalação de produção via `npm ci --omit=dev`, com aplicação bem-sucedida do patch de libsignal.
- Suíte Node completa e laboratório fiscal, em banco SQLite isolado, sem transmissão fiscal nem envio a números reais.
- Upload/leitura HTTP reais contra API local, PNG de verdade transformado em WebP, produto, multipart de Marketing, preço/estoque preservados, tenants, cookie e Bearer.
- Novo serviço e novo servidor HTTP lendo o mesmo banco/store simulado, sem a antiga pasta local: simulação de substituição da instância.
- S3 simulado no nível dos comandos: PUT/HEAD/GET, confirmação divergente, falha sem segredo e ausência de comandos de exclusão.
- Baileys com socket simulado, carregador real de mídia, conversão WebP→JPEG e confirmação de envio. Falha de anexo preserva pendência/tentativas da fila; recuperação permite envio.
- Migração de arquivo/base64/JSON/anexos/fila, diagnóstico, repetição idempotente, ausente, sem empresa, falha do store, concorrência e edição simultânea.
- Upload concorrente deduplicado; bloqueio de tipo falso, tamanho, SVG externo, travessia de caminho e destino de rede privado.
- PWA em ambiente JavaScript simulado: Bearer restrito à API, blob revogado e mídia fora do cache offline.

Não foram executados: deploy real, upload real ao seu R2, migração do TiDB real, envio com seu celular ou acompanhamento de vários dias. Não há credenciais/autorização de ambiente disponíveis aqui para realizá-los. Não afirmei recuperação de imagens sem confirmação. A aparência das telas não foi redesenhada; a validação visual final é o roteiro acima.

## 10. Custos e proteção futura

Valores oficiais consultados em 14/11/2026, sujeitos a mudanças e às condições de ativação da conta:

| R2 Standard | Faixa gratuita mensal | Excedente |
| --- | --- | --- |
| Armazenamento | 10 GB-mês | US$ 0,015 por GB-mês |
| Operações Classe A | 1 milhão | US$ 4,50 por milhão |
| Operações Classe B | 10 milhões | US$ 0,36 por milhão |
| Egress do R2 | Sem cobrança de egress | Ver condições do provedor |

A gratuidade citada é de **Standard**, não de Infrequent Access. PUT e confirmação HEAD geram operações; leituras via API também. O total pode crescer com uso e retenção de arquivos substituídos. A hospedagem/tráfego do Render segue seu plano e não se torna gratuita por usar R2. Veja os valores e condições atuais em https://developers.cloudflare.com/r2/pricing/.

As imagens deixam de depender do ciclo de vida da instância: após reinício, a API consulta os mesmos metadados no TiDB e os mesmos objetos no bucket. Disponibilidade ainda depende de banco, API, conta/bucket e credenciais válidos. Exclusão manual do bucket, suspensão da conta ou regra de expiração do provedor não podem ser impedidas pelo código; por isso a checagem das regras e o backup independente fazem parte da configuração.

## 11. Lista de arquivos do pacote

Os arquivos de código alterados/novos estão relacionados em `docs/ARQUIVOS-MIDIAS.txt`. O manifesto inclui os caminhos exatos para revisar no VS Code. Este pacote contém 47 arquivos de código/dependências/testes, além deste guia, exemplo de variáveis, validação e manifesto. Não contém `.env`, credenciais reais, `node_modules`, banco ou imagens pessoais.
