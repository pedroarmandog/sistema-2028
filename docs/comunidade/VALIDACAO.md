# Validação executada

## Resultado

30 testes automatizados passaram, com Node 24.22.3. Comando reproduzível:

```bash
npm test --prefix comunidade
```

Nesta execução, as dependências da API foram disponibilizadas em um diretório de laboratório através de NODE_PATH, pois a cópia local do projeto não tem a instalação completa da raiz. Em um checkout completo, elas são resolvidas pelo `node_modules` da raiz. As dependências de teste do frontend estão declaradas no seu package.json/lock.

| Grupo | Quantidade | O que foi exercitado |
|---|---:|---|
| Serviço social + autenticação do portal | 13 | Senha real/bcrypt e sessão ERP preservada; identidade e vínculos; liberação e revogação; consentimento/posse de pet; proteção de perfil alheio; audiência; idempotência; comentários; contadores; mídia; bloqueio; Momentos; paginação; eventos; expiração |
| HTTP Express | 6 | Cookie HttpOnly/Secure/Path; CSRF; CORS; flag; isolamento de privilégios administrativos; auditoria; notificações bloqueadas; exclusão e preservação de clientes/pets |
| DOM | 5 | Login e navegação; termo de hashtag; editor e CSRF; texto escapado; reversão de curtida após erro; tema; logout; formulário administrativo |
| Instalador e PWA | 3 | Backup, montagem antes do CORS, idempotência e recusa de ponto desconhecido; comportamento do worker fora do escopo e nas escritas |
| Migração vazia | 1 | Rollback somente sem registros, preservação de tabela ERP e reaplicação |
| Proxy de domínio | 2 | Caminhos permitidos, cookie/CSRF/JSON, preservação de Set-Cookie e exigência de HTTPS para o destino |

Os testes de serviço/HTTP usam Sequelize com SQLite em memória, o código real de autenticação do PetHub Cliente e um armazenamento controlado de laboratório. Os testes DOM usam jsdom e respostas HTTP controladas. Os adaptadores são exclusivos de `tests/` e não são usados em produção.

Foram executados builds de produção para:

- Base `/comunidade/`, servida pela API existente.
- Base `/`, para domínio exclusivo; o manifest gerado teve `scope=/`.

O `dist` incluído no ZIP é o build final de `/comunidade/`.

## Limitações observadas

- A tentativa de iniciar Chromium falhou com `socket() failed: Operation not permitted`. Não houve screenshot nem revisão visual renderizada nesse navegador. Os testes DOM não substituem a revisão em celular real.
- O pré-verificador identificou dois arquivos compartilhados ausentes na cópia local reconstruída: `backend/services/midias/armazenamento.js` e `backend/services/midias/validar.js`. Eles já são dependências do serviço de mídia existente, e não arquivos novos da Comunidade. Devem existir no seu checkout real antes de habilitar uploads. O pacote não sobrescreve ou reinventa esse serviço.
- Não houve conexão ao TiDB ou R2 de produção. A migração SQL foi exercitada no laboratório; é necessário aplicá-la e conferir FKs/índices em homologação TiDB.
- A persistência de registros/interações e o reaproveitamento de referências foram testados por novos serviços usando o mesmo banco de laboratório. Não foi realizado restart de Render, restauração de backup ou deploy contra o bucket real.
- Não foram testadas instalação Android/iOS, permissões de push, DNS, certificados, cookies no domínio final, quota/custo de storage ou concorrência em carga.
- Não foi executado o ERP inteiro nem integração real WhatsApp/fiscal. A verificação de regressão nesta entrega cobre autenticação reaproveitada, sessão anterior preservada, fronteira de montagem e ausência de alterações nos dados ERP do laboratório.

## Roteiro de homologação antes de abrir ao público

1. Rodar o pré-verificador no checkout completo; corrigir arquivos e dependências ausentes.
2. Migrar uma cópia do TiDB e conferir criação exclusivamente de `community_*`.
3. Liberar duas contas de empresas diferentes e testar o feed global com dados públicos escolhidos.
4. Conferir publicação pública, seguidores e só eu em duas contas; incluir foto e abrir em sessão sem permissão.
5. Reabrir navegador/API e conferir persistência de post, curtida, perfil e foto no R2.
6. Revogar a conta e depois a empresa, testando também uma identidade com segundo vínculo comprovado.
7. Conferir denúncia, revisão administrativa, bloqueio, desbloqueio, suspensão e ocultação de conteúdo.
8. Conferir evento, presença, cancelamento e notificação; conferir expiração de Momento.
9. Testar telefone real em 360/390 px, tablet e desktop; tema escuro, teclado, foco e leitor de tela.
10. Instalar o PWA em HTTPS, abrir sem rede após uma visita online e conferir atualização do worker sem interceptar os apps existentes.
11. Validar exportação inicial e o processo operacional de atendimento às solicitações de exclusão.

Essa homologação ainda não foi executada no seu ambiente; não há deploy automático incluído nesta entrega.
