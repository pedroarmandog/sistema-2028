# Correção — abertura do convite PetHub Cliente

Aplicar sobre o PetHub Cliente já instalado.

## Causa

A função responsável pela tela Histórico se chamava `history`. Por estar no mesmo escopo do código de inicialização, ela ocultava `window.history`. Ao abrir um link com convite, `history.replaceState(...)` tentava acessar um método inexistente nessa função e interrompia todo o app, deixando a tela em “Preparando seu espaço…”.

## Correção

- A função da tela foi renomeada para `renderHistorico`.
- A limpeza do fragmento do convite chama explicitamente `window.history.replaceState`.
- A meta tag `mobile-web-app-capable` foi adicionada; a declaração Apple foi mantida para compatibilidade. O aviso da meta tag era separado do erro que travava a página.
- O cache exclusivo do PWA passou para `pethub-cliente-static-v2`.

## Arquivos

- `frontend/cliente-app/app.js`
- `frontend/cliente-app/app.html`
- `frontend/cliente-app/service-worker.js`
- `tests/cliente-portal-inicializacao.test.js` (novo teste de regressão)

## Aplicar

1. Extraia as pastas `frontend` e `tests` na raiz do `sistema-2028`, preservando os demais arquivos.
2. Faça commit/push e aguarde o deploy no Render.
3. No computador, atualize o app com Ctrl+Shift+R. No app instalado, feche todas as janelas/abas do PetHub Cliente e abra novamente, com conexão à internet.
4. Abra o convite. A tela de definição de senha deve substituir “Preparando seu espaço…”. Se o convite tiver expirado ou já tiver sido usado, gere outro no cadastro do cliente.

Não é necessário alterar banco, variáveis de ambiente, tokens ou configurações de emissão. Mantenha os comandos existentes de build, pre-deploy e start.

## Testes

O teste executa o JavaScript inteiro do app em um contexto isolado, simulando DOM e API. Antes da correção, a abertura do convite e sua ativação reproduziram a falha; depois, os cinco cenários passaram:

1. Convite abre definição de senha e remove o token da URL.
2. Token permanece em memória para ativação e a tela passa ao login após sucesso.
3. Link sem convite continua exibindo login.
4. Navegação da tela Histórico funciona sem ocultar o histórico nativo do navegador.
5. Meta tags mobile e Apple estão presentes.

Comandos:

```text
node --test tests/cliente-portal-inicializacao.test.js
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

Sem uso de convite real, credenciais reais ou envio externo. Não foi realizada validação visual em navegador/aparelho físico neste ajuste.

Resultado da suíte completa: **250 testes aprovados, zero falhas**.
