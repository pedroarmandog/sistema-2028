# PetHub — configurações do app em abas e menu completo

## O que muda

A página real é **`/configuracoes/portal-cliente.html`**. Ela passa a ter quatro abas, sem recarregar a página:

| Aba | Conteúdo |
|---|---|
| Geral | Ativação do portal, recebimento de solicitações, push e link da loja |
| Agendamentos | Dias, horários, capacidade, duração, antecedência, horizonte, feriados, bloqueios, serviços e profissionais |
| Aparência | Cinco cores, presets, prévia local, salvar e restaurar |
| Notificações | Dez sons, ouvir, volume, repetição a partir de 1 segundo e MP3 personalizado |

Feriados, bloqueios e MP3 ficam em áreas expansíveis. No desktop, a agenda usa duas áreas lado a lado e até três campos por linha; os sons usam três colunas. Em notebooks e tablets, os grids diminuem para duas ou uma coluna. Até 700 px, os campos ficam em uma coluna, com menu recolhível e abas que podem ser deslizadas horizontalmente.

O contêiner usa o espaço disponível, com limite de 1600 px. A prévia do celular fica ao lado das cores em telas largas e abaixo em telas menores. Os campos continuam presentes, inclusive quando a aba está oculta.

## Arquivos para copiar ao projeto

Copie os arquivos abaixo **mantendo exatamente as pastas**, sobre a versão atual que já tem PetHub Cliente, paleta e sons. Este ZIP é incremental: não substitua nem apague a pasta `frontend` inteira.

| Arquivo | Alteração |
|---|---|
| `frontend/configuracoes/portal-cliente.html` | Cabeçalho, estilos e scripts com caminhos desde a raiz; ícones iguais aos do Dashboard |
| `frontend/components/cliente-portal-config-layout.js` | Abas acessíveis, organização dos formulários existentes, rascunhos, validação e indicador de alterações |
| `frontend/components/cliente-portal-config.css` | Layout amplo, grids, detalhes expansíveis, prévia compacta e responsividade, restritos a esta página |
| `frontend/components/cliente-portal-erp.js` | Salvar acesso/agenda atualiza a revisão sem reconstruir a página e apagar outras edições |
| `frontend/components/cliente-portal-erp.css` | Restringe o estilo de cabeçalho ao cabeçalho da página, evitando atingir os cabeçalhos dos popups |
| `frontend/components/cliente-portal-aparencia.js` | Notifica a conclusão do salvamento da paleta para atualizar o indicador de rascunho |
| `frontend/components/cliente-portal-som-config.js` | MP3 expansível; salvamentos preservam rascunhos independentes; mantém intervalo mínimo de 1 segundo |
| `frontend/sidebar-component/sidebar.html` | Estrutura completa do menu oficial, com ícones e submenus, caminhos desde a raiz e PetHub Cliente após Central Fiscal |
| `frontend/sidebar-component/sidebar-navigation.js` | Inicialização de navegação sem carregar os indicadores e polling do Dashboard |
| `frontend/sidebar-component/inject-sidebar.js` | Usa o inicializador específico nesta página; mantém o fluxo anterior nas demais páginas |
| `tests/browser/portal-config-layout.dom.cjs` | Testes automatizados desta alteração com API e áudio simulados |

Os arquivos `dashboard.html`, `dashboard.js`, credenciais e regras de autorização não foram alterados. O componente compartilhado de HTML agora contém a estrutura completa; outros consumidores desse componente também recebem esse HTML. O novo inicializador de navegação é aplicado somente à página com a classe `pc-settings`.

## Sidebar e caminhos

A estrutura foi extraída da sidebar existente no Dashboard, preservando sua hierarquia e identificadores. A página utiliza `dashboard.css`, `colors.css`, a logo e o mesmo Font Awesome do Dashboard. PetHub Cliente fica **dentro de Configuração, imediatamente depois de Central Fiscal**, sem novo módulo principal.

Os links reais usam `/dashboard.html`, `/clientes.html`, `/pets/...`, `/financeiro/...`, `/configuracoes/...` etc. Não dependem da subpasta atual nem de `<base>`.

O arquivo `ROTAS.csv` relaciona os 76 links do menu. As opções sem destino que já existiam no Dashboard continuam como controles `#`; não foram inventadas páginas para elas. Os destinos locais reais existem nos arquivos recuperados para este trabalho.

Foram verificadas por HTTP em um servidor estático local **68 URLs distintas**, reunindo destinos, página, logo e recursos locais diretos. Todas retornaram 200. Isso verifica o conteúdo estático; não substitui testar autenticação, permissões ou respostas do Render em produção.

O novo inicializador é carregado após a inserção do HTML do menu e não depende de um `DOMContentLoaded` já encerrado. Um identificador evita listeners duplicados. Abrir/fechar menus, grupos internos, teclado e recolher a sidebar foram exercitados em DOM simulado. Se o carregamento do menu falhar, aparece uma mensagem e o link Voltar ao sistema continua disponível.

O Font Awesome continua vindo do CDN já usado pelo Dashboard. A disponibilidade desse serviço externo não foi verificada neste ambiente.

## Salvamentos e rascunhos

Não existe botão global que misture requisições:

- **Salvar acesso e agenda** usa o contrato existente `PUT /api/cliente-portal/config`. Geral e Agendamentos continuam sendo partes da mesma configuração, como já eram no backend.
- **Salvar paleta** usa `PUT /api/cliente-portal/aparencia`.
- **Salvar som e preferências** usa `PUT /api/cliente-portal/som`.
- **Salvar e utilizar** envia o MP3 por multipart em `POST /api/cliente-portal/som/mp3`.

Alternar abas mantém os mesmos elementos de formulário, inclusive o arquivo escolhido. Salvar acesso/agenda não remonta a página. Salvar som não descarta o arquivo MP3 escolhido. Enviar MP3 preserva alterações pendentes de volume e repetição. Falhas mantêm os dados e mostram o erro. A revisão retornada pelo backend é usada no próximo salvamento.

O cabeçalho indica alterações pendentes; as abas recebem um ponto quando há rascunho. Ao sair com rascunhos, o navegador pode mostrar seu aviso padrão de saída. A validação abre a aba e a área expansível do campo inválido antes de o navegador tentar focá-lo.

A prévia da paleta altera apenas o elemento de prévia, sem aplicar cores ao ERP. Os limites, validação real de MP3, armazenamento privado, permissões, autenticação e seleção de empresa continuam nos serviços existentes. Nenhum endpoint passou a aceitar empresa selecionada no frontend.

## Testes executados nesta entrega

Ambiente: Node.js 24.22.1 e jsdom 26, instalado em diretório externo de testes. Nenhuma dependência foi adicionada ao projeto.

**Resultado final da suíte selecionada: 17 testes aprovados, zero falhas.** O registro completo está em `TESTES-APROVADOS.txt`.

- 13 testes novos: quatro abas e separação de formulários; rascunhos preservados ao alternar/salvar; revisão entre salvamentos; prévia e salvamento da paleta; ouvir som por mock; mínimo de 1 segundo; arquivo selecionado preservado; upload multipart simulado; campos inválidos em abas ocultas; erros e envio duplicado; edição durante uma requisição; navegação por teclado; sidebar e grupos internos; caminhos locais e auditoria HTTP; comparação com a hierarquia do Dashboard; falha de carregamento do menu; prévia isolada entre janelas.
- 4 testes existentes de áudio entre abas: transferência de liderança, navegação com preferência lembrada, escopo de empresa e expiração de sinal de outra aba.
- `node --check` nos seis arquivos JavaScript novos/alterados: aprovado.

Para repetir com jsdom disponível no ambiente de desenvolvimento:

```bash
node --test tests/browser/portal-config-layout.dom.cjs tests/portal-audio-abas.test.js
```

### Execuções adicionais e limitações reais

Também foram executados testes antigos recuperados com os patches:

- `tests/portal-alertas-front.test.js`: 7 aprovados e 3 falharam. A mesma execução na cópia anterior a estas alterações reproduziu as mesmas três falhas. Esses testes antigos iniciam reprodução sem configurar a preferência de áudio do dispositivo, enquanto o módulo atual exige ativação. O módulo de áudio não foi modificado nesta entrega; os quatro testes específicos de continuidade atuais passaram.
- `tests/browser/portal-logo-empresa.dom.cjs`: falhou na comparação textual de CSS `0` versus `0px` no jsdom 26. Reproduzido também na cópia anterior às alterações. Os arquivos de logo não foram modificados.
- `tests/browser/portal-aparencia.dom.cjs`: imprimiu a conclusão de suas verificações de paleta/menu, mas o processo terminou com erro assíncrono ao fechar uma janela do jsdom. Não foi contabilizado como teste aprovado. As verificações novas da página passaram na suíte principal acima.

Não foi executada a suíte completa histórica do backend: o conjunto de fontes recuperado nesta sessão não contém todos os auxiliares do laboratório fiscal usados por ela. Não houve teste conectado a TiDB, Render, R2 ou bancos reais. Os salvamentos da nova suíte são exercitados com respostas simuladas dos endpoints; não são uma comprovação de persistência em produção nem de isolamento multiempresa no banco.

O Chromium local não pôde iniciar por restrição de socket do ambiente. Portanto, **não foi feita inspeção visual real em Chrome/Firefox, nem em smartphone**, não foi ouvido som físico e não foi enviado MP3 real ao R2. As regras responsivas estão implementadas em CSS, mas precisam da conferência visual após o deploy.

## Publicação no Render

1. Faça backup/commit da versão atual.
2. Copie os arquivos mantendo as pastas. Publique todos os dez arquivos de frontend juntos.
3. Faça commit e deploy normalmente. Não é necessário mudar Build Command, Start Command, Pre-deploy ou variáveis de ambiente.
4. Abra `/configuracoes/portal-cliente.html` e atualize a página para carregar os novos recursos.
5. Confira em desktop e celular: ícones, menus, abas, ausência de scroll horizontal, botões e prévia.
6. Salve acesso/agenda, cores e som separadamente; recarregue e confirme os valores. Faça também um teste em outra empresa com suas permissões normais.
7. Valide uma solicitação real de teste e o áudio no navegador autorizado. Se usar MP3, valide upload, reprodução e persistência com o armazenamento já configurado.

**Sem alterações no backend, sem migração do banco e sem novas variáveis de ambiente.** Não executar SQL nem apagar tabelas ou arquivos anteriores. Este pacote não substitui patches anteriores de autenticação, som, logo ou armazenamento permanente.
