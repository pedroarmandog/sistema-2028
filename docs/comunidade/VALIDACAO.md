# Validação local — versão 0.2

59 testes automatizados passaram. Também passaram os builds de produção com base `/comunidade/` e com base `/` para domínio próprio. O build incluído em `dist` é o de `/comunidade/`.

Comando reproduzível:

```bash
npm test --prefix comunidade
```

Ambiente: Node 24.22.3, Sequelize/SQLite em memória e jsdom para DOM. As dependências da API foram disponibilizadas pelo diretório de laboratório via NODE_PATH, pois a cópia local não tem o checkout completo instalado. Em um repositório completo, elas são resolvidas normalmente pelo node_modules da raiz.

| Área | Testes | Evidências |
|---|---:|---|
| Autenticação pública | 11 | Cadastro sem empresa, unicidade no serviço e no banco, hash, termos, confirmação obrigatória, expiração/uso único, recuperação e revogação de sessões, reenvio, falha de entrega sem sucesso fictício e proteção de contas não verificadas |
| Administração | 9 | Métricas reais, listagem/filtros, ausência de hashes/contatos ERP, denúncia e snapshot, estados e auditoria, suspensão/reativação, bloqueio/exclusão, séries e retorno, grupos e configurações |
| Interface DOM | 9 | Login sem loja, cadastro, consentimentos, confirmação por POST e limpeza da URL, navegação, editor, reversão de curtida, texto escapado, tema/logout, painel com nove seções e migração de sessão antiga |
| HTTP | 13 | Cookies isolados, CSRF, HTTPS atrás do proxy, origem hostil, permissões, sessão privada, logout, allowlist, moderador, pausa pública e roteiro completo cadastrar→confirmar→entrar→criar pet→publicar |
| Instalação e PWA | 3 | Backup e montagem antes dos middlewares ERP, idempotência/recusa de ponto desconhecido, worker fora do escopo e nas escritas |
| E-mail | 2 | Contrato de transporte, chave de idempotência e fragmento; recusa de provedor não configurado ou com falha |
| Migração | 3 | Conversão real de fixture do esquema 001 com registros/mídias/relacionamentos, preservação ERP, reaplicação, esquema vazio e upgrade de identidade com sessão social anterior |
| Proxy de domínio | 2 | Encaminhamento permitido, cookies/CSRF/JSON e HTTPS do destino |
| Regressão social | 7 | Curtida e reenvio idempotentes, audiência, comentários/respostas e contadores, mídia privada, bloqueio, Momentos, paginação, eventos e expiração de sessão |

Uma verificação de regressão utilizou o serviço real de autenticação do PetHub Cliente: mudar a senha pública da Comunidade não alterou a senha do portal nem invalidou a sessão anterior dele. Nenhum arquivo do módulo de autenticação do ERP/Cliente foi modificado nesta entrega.

## O que os testes não significam

- O envio de e-mail foi exercitado com um adaptador de transporte controlado, que captura as mensagens no laboratório. Não houve envio real para a caixa de entrada, validação de SPF/DKIM ou chamada ao provedor usando suas credenciais.
- O banco foi SQLite em memória; as queries e migrações TiDB/MySQL precisam de homologação no seu ambiente. O teste de migração preservou registros reais da fixture anterior, não apenas tabelas vazias.
- O storage foi um adaptador controlado para verificar autorização, bytes e referências. Não houve teste no seu R2 nem restart de Render em produção.
- Não houve teste integral do ERP, WhatsApp ou fiscal. Os testes verificaram as interfaces tocadas e a preservação de tabelas/dados ERP no laboratório.
- O Chromium não iniciou neste ambiente (`socket() failed: Operation not permitted`). Houve testes DOM, mas não screenshot ou validação visual renderizada em celular/navegador real.
- Não houve instalação Android/iOS, teste de carga, auditoria independente de segurança, configuração DNS/certificado ou deploy na sua conta.

## Dependência encontrada na cópia local

O arquivo técnico compartilhado `backend/services/midias/armazenamento.js` não está presente na cópia reconstruída local, embora já seja referenciado pelo serviço de mídia anterior. O pré-verificador deve ser executado no seu checkout real. Esta entrega reutiliza essa interface e não sobrescreve o armazenamento já configurado. Sem o arquivo/credenciais corretos, os uploads não podem ser homologados.

## Homologação necessária

1. Aplicar migração 002 em cópia do TiDB e confirmar registros anteriores, índices e FKs.
2. Configurar e-mail real, confirmar recebimento, expiração, reenvio e recuperação em duas caixas independentes.
3. Criar conta sem empresa, confirmar, cadastrar pet/foto e publicar. Reiniciar a API e conferir persistência.
4. Conferir visibilidade pública/seguidores/só eu, bloqueio e notificações com duas contas.
5. Entrar como administrador e moderador separados; testar denúncias, auditoria, suspensão e revogação das sessões.
6. Conferir períodos e virada de dia/mês em Brasília usando a configuração real do ORM/TiDB.
7. Conferir app em 360/390 px, desktop, teclado, contraste e leitores de tela.
8. Instalar PWA em HTTPS, testar offline após primeira visita online e conferir isolamento de sessões/workers.
9. Publicar termos/política completa, canais de suporte e processo de retenção antes da abertura ampla.

O pacote contém implementação funcional local e instruções; não representa confirmação de deploy ou homologação concluídos em produção.
