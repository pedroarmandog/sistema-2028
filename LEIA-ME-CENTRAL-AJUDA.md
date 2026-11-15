# PetHub — Central de Ajuda com mascotes contextuais

Pacote incremental, somente com arquivos novos/alterados da Central e seus testes. Não substitui o projeto inteiro. Copie as pastas para a raiz do sistema-2028, preservando os caminhos.

## Diagnóstico

A Central existente é uma aplicação pequena de JavaScript sem framework, com index.html, CSS próprio, um índice JSON e arquivos Markdown. Essa estrutura foi mantida. Não foram criados aplicativo separado, serviços de backend, tabelas, endpoints, autenticação ou dependências de produção.

O código anterior atribuía aleatoriamente o rótulo “Vídeo Tutorial” a artigos sem vídeo e chamava uma seleção estática de “Mais acessados”, embora não houvesse métricas. Os links superiores Vídeos/Novidades/Status não tinham renderização associada. Também havia duplicação de eventos de navegação/pesquisa e links Markdown relativos que saíam da Central. Esses pontos foram corrigidos dentro da própria Central.

O índice contém 85 referências em 17 módulos, mas a cópia disponível contém apenas 71 arquivos Markdown. As 14 referências sem arquivo foram preservadas. Agora há um manifesto de disponibilidade separado, contagens de guias disponíveis e aviso nas referências ausentes. Os links continuam acessíveis para permitir abrir um arquivo que exista na sua versão. Confira CONTEUDOS-A-CONFERIR.md e regenere o manifesto no seu projeto antes de publicar.

## Mudanças visuais e de navegação

- Hero azul-marinho com gradiente, laranja #FFAA33, pesquisa branca, sugestões, contagens reais e mascote grande sobreposto ao banner, com brilho e profundidade.
- Primeiros passos usando artigos existentes; cards de módulos com espaçamento, hierarquia, contagem e hover; leituras recomendadas sem fingir ranking de acessos.
- Banners maiores para Marketing e Financeiro, com poses contextuais, além da área de tutoriais.
- Páginas de módulo com mascote próprio, introdução discreta nos artigos, dicas reutilizáveis e relacionados. Nenhum texto original dos artigos foi removido ou substituído.
- Busca sem acentos ou distinção entre maiúsculas/minúsculas, estado vazio amigável, limpeza, Escape, foco e atalho “/”. Links dos artigos permitem compartilhar a URL e usar Voltar/Avançar do navegador.
- Menu compacto com aria-expanded, fechamento por Escape/overlay; link para pular ao conteúdo; foco após navegação; imagens decorativas sem leitura redundante.
- Animação suave do hero, limitada a três ciclos, entradas e microinterações leves. No celular o mascote principal fica estático. prefers-reduced-motion desliga as animações/transições; não há parallax de sensor ou biblioteca pesada.
- Layouts específicos para desktop, tablet e smartphone. Textos e personagens se reorganizam verticalmente nas telas menores.
- Se uma imagem falhar, aparece um detalhe gráfico discreto. Se o catálogo não carregar, os textos e links continuam funcionando. Sem marked, o texto Markdown continua legível como fallback.
- Novidades preserva as quatro entradas existentes. Não foram inventadas datas novas.
- Não há vídeos cadastrados nem monitor de disponibilidade conectado nesta base. As respectivas telas informam isso e encaminham para guias ou suporte; não mostram vídeos fictícios nem prometem status “online”.

## Mascotes e origem

Na cópia do projeto, frontend/mascote pethub tinha duas imagens. As versões adicionais utilizadas são as imagens oficiais já compartilhadas nesta conversa. Não foi gerado nem redesenhado personagem algum. Os originais foram preservados; somente variantes de tamanho/formato foram criadas.

| Pose original | Uso contextual |
|---|---|
| Mascote PetHub com Café e Laptop.png | Hero de boas-vindas e clientes |
| Mascote PetHub no escritório digital.png | Organização, produtos, estoque, compras e dicas |
| Mascote PetHub em Nova Campanha.png | Marketing, vídeos e novidades |
| Mascote PetHub Apresenta Dashboard Digital.png | Dashboard, financeiro, caixa e relatórios |
| Mascote Veterinário PetHub com Checklist.png | Pets e clínica |
| Mascote PetHub com Tablet e Garrafa de Água.png | Agenda, Mobile, notificações e configurações |
| Lontra PetHub no café.png | Busca sem resultados e estados de orientação |

As associações usam as poses reais disponíveis, sem afirmar que o personagem tem calendário/calculadora ou adereços ausentes na imagem.

Foram criadas 14 variantes WebP lossless, em larguras de 360 e 720 pixels, com transparência real e proporção preservada. Total aproximado: 4,01 MiB; todas as variantes menores somadas: 885 KiB. O navegador escolhe o tamanho via srcset/sizes. O hero é prioritário; os demais personagens usam lazy loading. Dimensões e caixas proporcionais reservam espaço para evitar saltos de layout. Os PNGs originais não foram incluídos novamente no ZIP.

## Organização e componentes

- `frontend/base-conhecimento/index.html`: adiciona os recursos novos, link para pular conteúdo e identificação do menu. Mantém navbar e retorno ao sistema.
- `frontend/base-conhecimento/base-conhecimento.js`: aproveita o índice/categorias/conteúdo existentes e reorganiza sua apresentação e navegação.
- `frontend/base-conhecimento/central-premium.css`: estilos exclusivos da Central, incluindo responsividade e movimento reduzido. O CSS anterior continua disponível.
- `frontend/base-conhecimento/mascotes.js`: catálogo central de arquivos/alt/dimensões e associação por contexto. Componentes reutilizáveis: imagem, dica, introdução e estado vazio; os banners reutilizam o renderizador contextual da Central.
- `frontend/base-conhecimento/assets/mascotes/`: 14 WebP otimizados, com nomes ASCII consistentes.
- `frontend/base-conhecimento/data/disponibilidade.json`: manifesto gerado, separado do índice original.
- `frontend/base-conhecimento/ferramentas/atualizar-disponibilidade.cjs`: confere os Markdown que existem na sua cópia, sem apagar referências.
- `frontend/base-conhecimento/ferramentas/otimizar-mascote.cjs`: gera novas variantes preservando o original, usando Sharp já instalado.
- `tests/central-ajuda.test.js`: testes automatizados de funcionamento e integridade dos assets.
- `tests/browser/central-ajuda.ui.cjs`: roteiro opcional de validação visual para ambiente com Chromium.

A lista de todos os caminhos novos/alterados está em ARQUIVOS-ALTERADOS.txt. O índice artigos.json e os 71 Markdown recebidos permanecem intactos. Não houve alterações nos módulos do ERP, fiscal, WhatsApp, upload de mídias, Mobile ou no código da paleta por empresa.

## Aplicação e deploy

1. Extraia o ZIP na raiz do projeto, mantendo frontend/ e tests/ nos caminhos corretos. Inclua também os arquivos novos e imagens no commit.
2. Antes de publicar, execute na sua cópia:

   ```sh
   node frontend/base-conhecimento/ferramentas/atualizar-disponibilidade.cjs
   ```

   Isso ajusta as contagens caso você tenha arquivos de artigos que não vieram na cópia analisada. Não apaga artigos ou referências. Faça commit também do manifesto atualizado.
3. Faça deploy normalmente. Não precisa mudar o Pre-Deploy Command do Render nem criar variáveis, migrar o banco ou contratar serviços.
4. Abra /base-conhecimento/index.html. Recarregue uma vez as abas antigas para receber o JavaScript novo.
5. Confira pesquisa, um artigo, um módulo, suporte, navegação mobile e os avisos de conteúdo antes de disponibilizar aos seus clientes.

## Como incluir outra pose

Guarde o original na sua pasta de mascotes. Exemplo no Windows, a partir da raiz do projeto:

```sh
node frontend/base-conhecimento/ferramentas/otimizar-mascote.cjs "frontend/mascote pethub/nova-pose.png" nova-pose
```

O utilitário gera nova-pose-360.webp e nova-pose-720.webp sem alterar o original. Recusa sobrescrever variantes existentes por acidente.

Em mascotes.js, adicione uma entrada em assets com o nome do arquivo, dimensões originais e descrição acessível; depois associe o nome ao contexto em contextos. Nenhum artigo ou página precisa ser editado. Exemplo:

```js
// assets
calendario: { arquivo: 'nova-pose', width: 1200, height: 1400, alt: 'Mascote PetHub segurando um calendário' }
// contextos — somente se essa for realmente a pose da nova imagem
agenda: 'calendario'
```

As animações ficam em central-premium.css; o catálogo controla a escolha das imagens. Não altere nomes de arquivos sem atualizar o catálogo e enviar as duas variantes no commit.

Para novos artigos, mantenha o fluxo atual de adicionar o Markdown e seu registro em artigos.json. Depois execute atualizar-disponibilidade.cjs para atualizar as contagens.

## Testes reais e limites

```sh
node --test tests/central-ajuda.test.js
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

Resultado: **13 testes específicos aprovados; suíte completa com 215 testes aprovados e zero falhas.**

Os testes específicos executam o JavaScript real da Central em DOM simulado, com o índice/Markdown reais: pesquisa, geração de todos os módulos, links, histórico por hash, resposta antiga de artigo, estados vazios/erros, menu, fallback sem catálogo/imagem, conteúdo disponível, prioridade/lazy loading, caminhos dos assets, proporção e canal alfa. A preferência de movimento no scroll e a presença das regras responsivas/movimento reduzido também foram verificadas. Os testes antigos de backend continuam passando. Sintaxe JavaScript e integridade do ZIP foram verificadas.

**Não houve validação visual em navegador real.** O Chromium local não iniciou neste ambiente; a alternativa de navegador remoto não conseguiu acessar a prévia local. Assim, não foram medidos overflow real, CLS, performance em celular, contraste por ferramenta ou leitura em leitor de tela. As regras responsivas foram implementadas e revisadas, mas isso não equivale a teste físico nos dispositivos. Não foi realizado deploy no Render nem modificação de dados de produção.

O roteiro tests/browser/central-ajuda.ui.cjs está incluído para validar o layout em 1440, 900 e 375 pixels, pesquisa/artigos/menu, imagens e movimento reduzido em ambiente com navegador disponível. Esse roteiro **não foi executado com sucesso nesta sessão**. Ele usa Playwright apenas para testes, sem adicionar dependência de produção. Instruções opcionais estão no próprio arquivo.
