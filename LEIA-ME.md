# Correção — redefinição e login do tutor

Aplicar sobre o PetHub Cliente já instalado, preservando as demais funcionalidades.

## Problemas encontrados e reproduzidos

1. O backend aceitava o convite e salvava a nova senha mesmo com o portal da empresa desativado. A consulta pública da loja retornava 404 e o login retornava uma mensagem genérica de credenciais inválidas.
2. Após aceitar o convite, a interface atualizava a empresa somente na memória. A URL e o estabelecimento anteriormente salvo podiam continuar apontando para outro contexto quando a página era reaberta.
3. O e-mail correto devolvido pelo convite não era preenchido no login.
4. Um bloqueio anterior por tentativas excessivas permanecia após a redefinição válida da senha.

Os logs enviados são compatíveis com estabelecimento desativado ou link antigo/inexistente. Não foi acessado o banco de produção para verificar qual condição está presente no seu cadastro específico.

## Correções

- Consulta da loja, login e redefinição verificam a disponibilidade do mesmo estabelecimento.
- Portal desativado retorna 403 com orientação clara; link de estabelecimento inexistente retorna 404 com orientação para usar o link mais recente. Senha ou e-mail incorretos continuam retornando 401 genérico, sem enumerar contas.
- A definição da senha é bloqueada enquanto o portal ou a empresa estão desativados. Nessa situação, o convite permanece sem uso e a senha anterior é preservada.
- A geração de novo convite avisa o gestor para ativar o portal antes de alterar credenciais ou revogar sessões.
- Após redefinir, o app grava o identificador público correto do estabelecimento na URL e no contexto local. Senhas, convites e e-mail não são salvos no localStorage.
- O login vem preenchido com o e-mail vinculado ao convite, mantendo a possibilidade de edição manual.
- Uma redefinição válida remove o bloqueio de tentativas apenas da conta correspondente. Senha e sessões anteriores permanecem revogadas.
- A versão do cache do novo PWA foi atualizada para `pethub-cliente-static-v3`.

A correção anterior de `history.replaceState` está preservada no app.js incluído.

## Arquivos

- `backend/services/clientePortal/auth.js`
- `backend/routes/clientePortalRoutes.js`
- `frontend/cliente-app/app.js`
- `frontend/cliente-app/service-worker.js`
- `tests/cliente-portal-redefinicao.test.js` (novo)
- `tests/cliente-portal-inicializacao.test.js` (atualizado)

## Como aplicar no Render

1. Extraia `backend`, `frontend` e `tests` na raiz do projeto `sistema-2028`, substituindo os arquivos correspondentes e preservando os demais.
2. Faça commit/push e aguarde o novo deploy. Aplique backend e frontend juntos.
3. Mantenha os comandos existentes de build, pre-deploy e start. Não há migração de banco nem variável nova neste ajuste.
4. No computador, atualize com Ctrl+Shift+R. No PWA, feche todas as janelas/abas do PetHub Cliente e abra novamente com internet.
5. Acesse `/configuracoes/portal-cliente.html`, na empresa correspondente ao convite, e confira se **Disponibilizar o PetHub Cliente** está marcado e salvo. A opção de receber agendamentos é separada da opção de disponibilizar o portal.
6. Confira também se a empresa e o cadastro do cliente estão ativos. A correção respeita esses controles.
7. Com o portal ativo, o tutor pode entrar com o e-mail vinculado e a última senha definida. Se houver necessidade de uma nova redefinição, gere outro convite no cadastro do cliente. Um convite expirado ou já utilizado exige outro link.

Não é preciso recriar clientes, pets ou contas. Uma senha já gravada não é apagada pelo deploy deste pacote.

## Sobre os avisos do console

O aviso `beforeinstallpromptevent.preventDefault()` diz respeito ao botão de instalação do PWA; ele não é a causa de uma resposta 401 no login. O botão “Como instalar” continua iniciando a instalação quando o navegador a oferece.

Um 404 sem URL identificada pode pertencer a outro recurso. Esta correção trata especificamente o contexto do estabelecimento e o fluxo de redefinição/login.

## Validação

Foram executados testes com SQLite real em memória, bcrypt, JWT, transações, rotas HTTP locais e execução do JavaScript completo em contexto isolado com DOM/API simulados.

Cenários: nova senha permite login; senha/sessão antigas deixam de funcionar; portal desativado impede alteração e preserva convite/senha; geração bloqueada preserva credenciais; mensagens de estabelecimento são coerentes; empresa inativa impede redefinição; bloqueio de tentativas é liberado por convite válido; URL e contexto da empresa são atualizados; e-mail correto aparece no formulário; login usa a empresa retornada pelo convite; loja indisponível apresenta motivo explícito.

Comando completo:

```text
node --test --test-concurrency=1 tests/*.test.js backend/scripts/lab-fiscal/teste.js
```

O resultado está em `RESULTADO-DOS-TESTES.txt`. Não houve alteração no banco de produção, uso de senha/convite real ou transmissão externa. Não foi validada a interface visual em navegador ou aparelho físico neste ajuste.
