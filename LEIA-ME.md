# PetHub — logo da empresa e cabeçalho padrão nas configurações do Cliente

Esta correção é incremental sobre o pacote de abas já instalado. Não substitua nem apague a pasta frontend inteira.

## Correção

A tela `/configuracoes/portal-cliente.html` usava um cabeçalho próprio em formato de card, afastado das margens. Além disso, a sidebar era inserida depois da inicialização dos scripts tradicionais da logo e permanecia com a imagem padrão.

Agora:

- A barra superior é fixa no topo, de ponta a ponta a partir da sidebar, sem borda arredondada ou margem externa.
- A estrutura utiliza as classes do Dashboard, com menu recolhível, ajuda, calendário, Início Rápido, pesquisa e usuário.
- Ajuda e menu do usuário reutilizam os componentes existentes do ERP. O nome do usuário e da empresa vêm da sessão, sem nomes fixos nesta implementação.
- O título das configurações, o indicador de rascunho e Voltar ao sistema ficam abaixo da barra, separados dela.
- A logo da empresa é carregada mesmo que a sidebar termine de ser inserida depois da consulta de identidade.
- O espaço da logo é 113 × 77 px, com `object-fit: contain`, preservando a proporção e a transparência.
- Sem logo, ou se a imagem falhar, aparece o nome da empresa. Não é escolhida a primeira empresa de uma lista.

## Arquivos

Copie mantendo estes caminhos:

| Arquivo | Função |
|---|---|
| `frontend/configuracoes/portal-cliente.html` | Barra padrão e carregamento dos componentes compartilhados |
| `frontend/components/cliente-portal-config.css` | Barra encostada nas margens, logo e adaptação responsiva |
| `frontend/components/cliente-portal-config-shell.js` | Identidade da empresa, nome do usuário, pesquisa e Início Rápido |
| `frontend/sidebar-component/sidebar-navigation.js` | Informa quando a sidebar termina de carregar, para aplicar a logo |
| `tests/browser/portal-config-shell.dom.cjs` | Testes da correção |

Os componentes de ajuda e perfil já existentes no projeto não foram modificados. O arquivo novo não carrega `dashboard.js` nem inicia consultas de indicadores do Dashboard.

## Identidade e segurança

Somente leituras são feitas automaticamente:

1. `GET /api/usuarios/me` identifica a empresa da sessão autenticada.
2. `GET /api/empresas/identidade-pdf` reutiliza o serviço existente que resolve a imagem no armazenamento permanente e retorna a logo em dados de imagem. Apesar do nome do endpoint, esta consulta não gera nem imprime documento.
3. Quando esse serviço não está disponível, a consulta de cadastro existente `GET /api/empresas/{id-da-sessao}` é usada como compatibilidade para nomes de arquivos locais e URLs HTTPS de mídia.

A identidade recebida precisa corresponder à empresa da sessão. Não são usados IDs de empresa do endereço da página, da pesquisa, de armazenamento local ou de uma lista de empresas. Respostas 401/403 não são contornadas. As requisições incluem a sessão existente e não armazenam credenciais.

Não há alterações de cadastro, upload automático, alterações de logo, banco, autenticação ou endpoints. O fallback de nome evita mostrar a marca de outra empresa quando a imagem não estiver disponível. Um arquivo antigo já perdido no servidor não pode ser recuperado apenas por esta correção.

## Testes realmente executados

Node.js 24.22.1 e jsdom 26, com APIs e eventos de imagem simulados:

**24 testes aprovados, zero falhas na execução selecionada.** Registro em `TESTES.txt`.

- 7 novos: posição e elementos da barra; identidade da sessão; sidebar tardia; logo 113 × 77; carregamento/falha da imagem; fallback de nome; nomes de arquivos legados e URLs HTTPS; rejeição de outra empresa e URLs inseguras; sessão não autorizada; pesquisa sem depender de acento; abertura/fechamento do Início Rápido; inicialização única; destinos e scripts existentes; integração com ajuda e perfil compartilhados.
- 13 testes da reorganização anterior: abas, formulários e rascunhos, salvamentos simulados, validação, menus e auditoria HTTP local de arquivos.
- 4 testes de continuidade de áudio entre abas.
- `node --check` nos scripts novo e de navegação: aprovado.

Para repetir, com jsdom disponível no ambiente de desenvolvimento:

```bash
node --test tests/browser/portal-config-shell.dom.cjs tests/browser/portal-config-layout.dom.cjs tests/portal-audio-abas.test.js
```

Os dois últimos arquivos de teste já acompanham os pacotes anteriores. Nenhuma dependência foi adicionada ao package.json.

### Limitações

Não foi feito login em produção, consulta ao TiDB/R2 real, reprodução física de áudio ou decodificação real da imagem do seu cadastro nesta execução. O teste de imagem dispara eventos simulados; ele confirma a lógica de exibição e fallback, não a disponibilidade do arquivo real.

A inspeção visual em navegador real continua pendente neste ambiente, onde o Chromium não inicia por restrição de socket. As propriedades do cabeçalho foram verificadas no DOM e as regras responsivas foram implementadas, mas a aparência deve ser conferida em desktop e celular após o deploy. Os 24 testes selecionados não representam toda a suíte histórica do projeto.

## Instalação

1. Copie os quatro arquivos de frontend para as mesmas pastas do projeto atual.
2. Faça commit e deploy no Render normalmente.
3. Atualize a página com Ctrl + F5.
4. Confira a logo na sidebar, a barra superior e o nome do usuário.
5. Teste ajuda, calendário, Início Rápido, pesquisa e recolhimento do menu. Confirme também que abas e salvamentos continuam funcionando.
6. Se a empresa não possuir logo acessível, a sidebar mostrará seu nome; confira o arquivo cadastrado em Configuração → Empresa.

**Sem migração de banco, sem mudança de variáveis do Render e sem alteração dos comandos de deploy.**
