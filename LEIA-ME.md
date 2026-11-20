# PetHub — Logo cadastrada da empresa nos PDFs

## Aplicar

1. Faça backup dos arquivos correspondentes e aplique o conteúdo de `backend` e `frontend` preservando os caminhos. Este pacote pressupõe os ajustes anteriores do PetHub já instalados. Não substitua o projeto inteiro nem volte os arquivos do caixa a versões anteriores.
2. Confira as dependências de produção:

```sh
node backend/scripts/verificar-logos-pdf.js
```

A normalização de WebP/SVG/JPEG para PNG usa **sharp**, também utilizada no armazenamento de imagens. Se ainda não estiver nas dependências de produção do seu projeto, execute LOCALMENTE e envie package.json + package-lock.json atualizados:

```sh
npm install sharp --save
```

Não coloque sharp somente em devDependencies, pois `npm ci --omit=dev` não a instala. PDFKit já é dependência do ERP. O pacote não inclui cópias antigas do package.json/lock para não sobrescrever dependências mais recentes.
3. Faça deploy/reinicie a API e recarregue a tela. O comando de build que já usa pode ser mantido depois de atualizar as dependências. Não há migração de banco, nova variável ou novo upload.
4. Gere novamente o PDF: documentos já baixados não mudam retroativamente.

Se estes arquivos tiverem recebido outras alterações próprias, revise/aplique `ALTERACOES.patch` em vez de substituir sua versão integral.

## Correção principal

O comprovante de venda consulta a empresa autenticada e vinculada à venda, e lê o campo `empresa.logo` pelo serviço de mídia persistente da própria empresa. Não tenta procurar somente um arquivo no disco local do Render. Compatibilidade com PNG/JPEG/WebP/SVG, data URL, base64 e caminhos antigos de uploads.

A imagem é normalizada em PNG com proporção preservada e área transparente, depois desenhada dentro de uma caixa limitada à largura/altura do documento. No cupom, o início do conteúdo considera a altura reservada para a logo. Evita distorção ou sobreposição com nome e contato.

Sem logo cadastrada — inclusive após remover no cadastro — usa o asset padrão do PetHub existente no projeto. Não usa logo de outra empresa, o primeiro cadastro ativo ou uma imagem antiga enviada pelo frontend. Cada PDF consulta o cadastro atual; não há cache por empresa que mantenha a logo removida.

Também foram tratados: comprovantes de orçamento e atendimento; prontuário A4 (que já referenciava o serviço de identidade); relatórios de venda no período, faturamento, comissão, atendimentos, produtos, entradas, fornecedores e demonstrativo de resultados. O DANFE local de notas autorizadas recebe a identidade no cabeçalho sem alterar dados da nota. PDFs de documentos de terceiros/importados mantêm seus dados de origem; etiquetas e códigos de barras não recebem uma logo adicional.

Os PDFs gerados no navegador para fornecedor/recebíveis passam a obter o PNG atual em `GET /api/empresas/logo-pdf`, autenticado e sem cache. Não precisa enviar a logo novamente e a tela não escolhe a empresa por query/body.

## Isolamento e armazenamento

- Identificador da empresa vem de `req.user.empresaId`; vínculo do documento precisa coincidir. O comprovante de venda/orçamento faz busca pelo ID e pela empresa.
- Referências de `/uploads` são lidas pela instância de mídia com a empresa correspondente, inclusive quando o objeto está no R2.
- Não baixa URLs arbitrárias nem permite caminhos fora de uploads. Referências locais antigas são suportadas sem procurar pelo basename de outro arquivo.
- Mantém o armazenamento de logos existente. Arquivo cadastrado mas perdido/corrompido gera aviso no log e usa fallback; o pacote não consegue recuperar bytes já excluídos. Reenvie a logo em Empresa se o objeto persistente não existir.

## Testes

**5 testes automatizados passaram**, com múltiplas verificações de formatos, proporção, logo padrão após remoção, separação entre empresas e rejeição de documento cruzado. Foram gerados PDFs reais com PDFKit (cupom e A4) e exercitadas as rotas reais de comprovante, venda no período e faturamento em HTTP, com cadastros/mídias simulados. O teste de faturamento confirma que uma imagem antiga no payload não substitui o padrão após a remoção da logo.

Todos os JavaScripts alterados passaram pela verificação de sintaxe. Resultado em `TESTES.txt`. Os testes não acessaram o TiDB, R2 ou Render real; após publicar, confira uma venda da sua empresa, gere um relatório e teste a remoção/troca da logo.

```sh
node --test --test-force-exit tests/pdf-logo-empresa.test.js
```
