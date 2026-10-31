# Diagnóstico de Push Notifications - Guia Completo

## 📋 Resumo das Alterações Implementadas

Adicionei logs de diagnóstico em **todas as etapas** do fluxo de push notifications:

### Backend
1. **`backend/services/pushNotificationService.js`** - Logs detalhados em:
   - Início do envio
   - Verificação de pré-requisitos (web-push, VAPID, modelo)
   - Busca de subscriptions
   - Envio para cada dispositivo
   - Sucesso/falha/ignoradas/expiradas
   - Resumo final

2. **`backend/routes/pushNotificationRoutes.js`** - Logs em:
   - Requisição de VAPID key
   - Novo endpoint `/api/push/test` para testes
   - Subscribe/unsubscribe
   - Preferences

### Frontend
3. **`frontend/mobile/service-worker.js`** - Logs em:
   - Recebimento de evento push
   - Payload recebido
   - Exibição de notificação
   - Clique em notificação

4. **`frontend/mobile/test-push-debug.js`** - Nova ferramenta de diagnóstico

---

## 🔍 Como Diagnosticar

### Passo 1: Verificar se o web-push está instalado

```bash
# Verificar se o pacote está no package.json
grep "web-push" package.json

# Se não estiver, instalar:
npm install web-push
```

### Passo 2: Verificar se as VAPID keys estão configuradas

```bash
# Verificar no .env
cat .env | grep VAPID

# Se não existirem, gerar:
npx web-push generate-vapid-keys

# Adicionar no .env:
VAPID_PUBLIC_KEY=BC_...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contato@pethubflow.com.br
```

### Passo 3: Reiniciar o backend

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente:
npm start
```

### Passo 4: Verificar os logs do backend

Quando o servidor iniciar, você deve ver:

```
[Push] ✅ web-push disponível
[Push] ✅ VAPID configurado
[Push] ✅ Modelo PushSubscription disponível
```

Se não aparecer, há um problema na configuração do VAPID.

### Passo 5: Testar no frontend

1. Acesse o mobile PWA
2. Abra o DevTools (F12)
3. Vá para a aba "Console"
4. Execute o diagnóstico:

```javascript
// Executar diagnóstico completo
PushDebug.runDiagnostics();

// OU abrir em nova aba com interface visual
PushDebug.showDiagnostics();
```

### Passo 6: Verificar se há subscriptions no banco

Execute no banco de dados:

```sql
SELECT * FROM push_subscriptions WHERE ativo = 1;
```

Você deve ver registros com:
- `endpoint`: URL do serviço de push
- `keys`: Objeto com `auth` e `p256dh`
- `empresa_id`: ID da empresa
- `usuario_id`: ID do usuário
- `ativo`: 1

### Passo 7: Testar envio de notificação

1. No DevTools do frontend, execute:

```javascript
// Testar envio de notificação
fetch("/api/push/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    evento: "novo_agendamento",
    mensagem: "Teste de notificação"
  })
})
.then(r => r.json())
.then(console.log);
```

2. Verifique os logs do backend - você deve ver:

```
[Push] ========== INÍCIO notificarEmpresa ==========
[Push] Evento: novo_agendamento, Empresa: 123
[Push] ✅ web-push disponível
[Push] ✅ VAPID configurado
[Push] ✅ Modelo PushSubscription disponível
[Push] ✅ Encontradas X subscription(s) ativa(s) para empresa 123
[Push] ✅ Evento "novo_agendamento" é válido
[Push] Iniciando envio para X dispositivo(s)...
[Push] 📤 [1/X] Enviando para usuário Y...
[Push] ✅ [1/X] Notificação enviada com sucesso
[Push] ========== RESUMO DO ENVIO ==========
[Push] Total: X | Sucesso: X | Falhas: 0 | Ignoradas: 0 | Expiradas: 0
[Push] ========== FIM notificarEmpresa ==========
```

3. Verifique os logs do Service Worker (no DevTools > Application > Service Workers):

```
[SW] 📬 Evento PUSH recebido!
[SW]    event.data: ...
[SW] ✅ Payload JSON: {title: "📅 Novo Agendamento", ...}
[SW] 📢 Exibindo notificação: 📅 Novo Agendamento
[SW] ✅ Notificação exibida com sucesso
```

---

## 🐛 Problemas Comuns e Soluções

### Problema 1: "web-push NÃO está instalado"

**Solução:**
```bash
npm install web-push
```

### Problema 2: "VAPID NÃO está configurado"

**Solução:**
```bash
# Gerar chaves
npx web-push generate-vapid-keys

# Adicionar no .env
VAPID_PUBLIC_KEY=BC_...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:contato@pethubflow.com.br

# Reiniciar servidor
npm start
```

### Problema 3: "Nenhuma subscription ativa"

**Causa:** O usuário não ativou notificações no app

**Solução:** 
- Ir para Configurações > Notificações
- Ativar o toggle "Ativar notificações"

### Problema 4: "Subscription expirada (410/404)"

**Causa:** A subscription expirou (app foi desinstalado ou dados limpos)

**Solução:** O sistema já marca automaticamente como inativa. O usuário precisa reativar.

### Problema 5: Evento push chega mas notificação não aparece

**Verificar:**
1. Logs do Service Worker (DevTools > Application > Service Workers > Console)
2. Permissões do browser (DevTools > Application > Permissions)
3. Se o browser está bloqueando notificações

### Problema 6: Notificação aparece mas não ao clicar

**Verificar:**
1. Logs do Service Worker no evento `notificationclick`
2. Se o `targetUrl` está correto
3. Se há abas do mobile abertas

---

## 📊 Checklist de Verificação

Marque cada item conforme verifica:

### Backend
- [ ] `web-push` está instalado (verificar package.json)
- [ ] VAPID keys estão no .env
- [ ] Backend foi reiniciado após configurar VAPID
- [ ] Logs mostram "✅ web-push disponível"
- [ ] Logs mostram "✅ VAPID configurado"
- [ ] Logs mostram "✅ Modelo PushSubscription disponível"

### Banco de Dados
- [ ] Tabela `push_subscriptions` existe
- [ ] Há registros com `ativo = 1`
- [ ] Registros têm `endpoint`, `keys`, `empresa_id`, `usuario_id`

### Frontend
- [ ] Service Worker está registrado
- [ ] Service Worker está ativo (tem controller)
- [ ] Permissão de notificação é "granted"
- [ ] Há subscription ativa no PushManager
- [ ] VAPID key é retornada pelo backend

### Teste
- [ ] Endpoint `/api/push/test` responde com sucesso
- [ ] Logs do backend mostram envio bem-sucedido
- [ ] Logs do Service Worker mostram recebimento do push
- [ ] Notificação aparece no sistema

---

## 🧪 Testando Eventos Reais

Depois de confirmar que o teste funciona, teste eventos reais:

### 1. Novo Agendamento
```javascript
// Criar um agendamento e verificar logs
```

### 2. Check-in
```javascript
// Fazer check-in de um pet
```

### 3. Serviço Concluído
```javascript
// Marcar serviço como concluído
```

Para cada evento, verifique:
1. Logs do backend (deve aparecer `[Push] ========== INÍCIO notificarEmpresa`)
2. Logs do Service Worker (deve aparecer `[SW] 📬 Evento PUSH recebido`)
3. Notificação no sistema operacional

---

## 📝 Interpretando os Logs

### Logs do Backend (terminal)

```
[Push] ========== INÍCIO notificarEmpresa ==========
[Push] Evento: novo_agendamento, Empresa: 123
```
✅ Evento foi disparado corretamente

```
[Push] ❌ web-push NÃO está instalado/importado
```
❌ Pacote não instalado - executar `npm install web-push`

```
[Push] ❌ VAPID NÃO está configurado
```
❌ Chaves VAPID não configuradas no .env

```
[Push] ⚠️ Nenhuma subscription ativa para empresa 123
```
⚠️ Nenhum usuário ativou notificações ainda

```
[Push] 📤 [1/3] Enviando para usuário 456
[Push] ✅ [1/3] Notificação enviada com sucesso
```
✅ Notificação enviada com sucesso

```
[Push] ❌ [1/3] Falha ao enviar: 410 Gone
```
❌ Subscription expirada - será removida automaticamente

### Logs do Service Worker (DevTools)

```
[SW] 📬 Evento PUSH recebido!
```
✅ Push chegou no Service Worker

```
[SW] ✅ Payload JSON: {title: "📅 Novo Agendamento", ...}
```
✅ Payload recebido corretamente

```
[SW] 📢 Exibindo notificação: 📅 Novo Agendamento
[SW] ✅ Notificação exibida com sucesso
```
✅ Notificação exibida

```
[SW] ⚠️ Evento push sem dados - ignorando
```
❌ Evento push sem payload

---

## 🎯 Próximos Passos

1. **Execute o diagnóstico** usando `PushDebug.runDiagnostics()`
2. **Verifique os logs** do backend ao iniciar
3. **Teste o endpoint** `/api/push/test`
4. **Verifique se há subscriptions** no banco de dados
5. **Teste um evento real** (criar agendamento, etc.)

Se algum teste falhar, o log indicará exatamente onde está o problema.

---

## 📞 Suporte

Se após seguir este guia ainda houver problemas:

1. Execute `PushDebug.showDiagnostics()` e tire um screenshot
2. Copie os logs do backend (terminal)
3. Copie os logs do Service Worker (DevTools)
4. Verifique se há subscriptions no banco: `SELECT * FROM push_subscriptions WHERE ativo = 1`

Com essas informações será possível identificar exatamente onde está o problema.