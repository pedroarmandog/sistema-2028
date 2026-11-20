# PetHub — Otimização do Caixa Rápido

Este é um ajuste incremental para o pacote **PetHub-Caixa-Classico-e-Rapido.zip** já instalado. Não reinstale o projeto inteiro.

## Aplicar

1. Faça backup dos três arquivos atuais de `frontend/atendimento` presentes neste pacote.
2. Substitua-os mantendo os caminhos: `caixa-rapido.js`, `caixa-rapido.css` e `nova-venda.html`.
3. Faça o deploy normal e atualize a página Nova Venda. As URLs do CSS/JS foram versionadas para evitar o cache antigo.

**Não há migração, variável de ambiente ou dependência nova de produção.** O backend e a preferência de layout por empresa continuam os mesmos do pacote anterior. Não substitua o `nova-venda.js` nem os arquivos de backend usando uma versão anterior.

Se sua página `nova-venda.html` recebeu outras alterações depois do pacote anterior, preserve-as e atualize somente as versões de `caixa-rapido.css` e `caixa-rapido.js` para `v=20261120-teclado2`, como mostrado no diff incluído.

## Mudanças

- Botão compacto “Alterar visual do caixa” no cabeçalho principal, imediatamente antes do suporte `hcHeaderBtn`, inclusive quando o suporte é inserido depois. Ícone, tooltip e nome acessível. Aparece nos dois visuais de Nova Venda; não modifica o componente de ajuda compartilhado nem outras páginas.
- Removida a linha separada do botão. Espaçamento superior do PDV reduzido.
- Busca com padrão combobox/listbox, primeiro resultado selecionado automaticamente, destaque laranja, setas ↑/↓ e Enter. O cursor permanece na busca e somente a lista rola para acompanhar a seleção.
- ESC fecha resultados sem cancelar a venda. F2 retoma a busca. Enter sem termo/sem seleção não inclui produto. Códigos exatos têm prioridade para o leitor.
- Inclusões continuam serializadas no carrinho original; Enter repetido com o campo vazio não duplica itens. A busca limpa e continua pronta após a inclusão. Nova digitação iniciada durante uma inclusão assíncrona é preservada.
- Foco restaurado ao encerrar operação/fechar modais/iniciar nova venda. Renderizar o catálogo ou carrinho não transfere o foco de cliente, desconto ou de um modal.
- Enter na quantidade da linha confirma a alteração e retorna à busca; Enter nos campos da forma de pagamento usa o botão original de adicionar pagamento. F7/F8 permanecem no fluxo existente, sem nova gravação independente.
- Fotos reais de `imagem` e aliases já retornados pelo catálogo: aceita nome de arquivo (convertido em `/uploads/arquivo`), caminho persistente, URL HTTP(S) ou data URL de imagem. Usa a origem correta da API quando configurada, sem duplicar `/api` nem `/uploads`.
- Mesmas miniaturas em cartões rápidos, resultados e carrinho; dimensões fixas, `object-fit: contain`, lazy loading, decodificação assíncrona, fundo discreto enquanto carrega e fallback de produto/serviço em caso de ausência/erro.
- Atualizar o catálogo também atualiza a referência de foto do produto já no carrinho. Ao reabrir/recarregar Nova Venda, o cadastro é consultado novamente. Não existe upload, tabela ou cópia permanente de imagens específica do PDV.

## Persistência e empresa

As imagens vêm exclusivamente dos produtos da API autenticada já usada por Meus Itens. O PDV mantém o vínculo pelo ID do produto e reutiliza a referência persistida; não consulta produtos por nome em outra empresa nem constrói chaves de armazenamento de outra empresa. O leitor `/uploads` existente no backend continua responsável por recuperar os arquivos persistentes e aplicar a proteção correspondente.

Este pacote corrige a interpretação da referência da foto no frontend. Não altera o armazenamento existente: não recupera arquivos que já tenham sido perdidos no servidor nem transforma um arquivo local antigo em objeto R2. Quando a referência existe mas o arquivo não está mais disponível, exibe o fallback. Fotos novas devem continuar sendo salvas pelo armazenamento persistente configurado em Meus Itens.

## Testes

**14 testes automatizados passaram**: os testes anteriores de persistência/validação e as interações com os scripts reais em JSDOM. Cobertura de botão antes do suporte tardio, seleção e scroll interno, Enter/leitor sem duplicidade, quantidade, pagamentos, fotos/formatos/fallback/atualização e preservação de foco. Resultado em `TESTES.txt`. CSS analisado e JavaScript verificado quanto à sintaxe.

O arquivo de teste atualizado está incluído. Em ambiente de desenvolvimento com Node 22.13+/24 e as dependências do pacote anterior, mais JSDOM:

```sh
node --test --test-force-exit tests/caixa-layout.test.js tests/caixa-rapido.test.js
```

A execução ocorreu com APIs de tela simuladas e SQLite em memória nos testes de backend anteriores. Não acessou o TiDB/Render/R2 real e não substitui uma inspeção visual no navegador. Depois do deploy, confirme uma foto já cadastrada em Meus Itens, pesquisa com setas, leitor físico, F7/F8 e troca de layout em Nova Venda.

O limite atual de catálogo retornado pela API e as regras de venda do pacote anterior permanecem.
