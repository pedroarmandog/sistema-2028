# Correção do cadastro e edição de clientes

Base analisada — sistema-2028(6).zip, o último projeto completo enviado nesta conversa.

O formulário envia sexo em minúsculas e oferece Outro. O modelo aceitava somente Masculino e Feminino. O backend transmitia o valor sem normalização. Ao editar, o formulário tentava selecionar o texto salvo com maiúsculas em opções com valores minúsculos, perdendo a seleção. A criação também enviava data de nascimento vazia ao banco, e a edição não permitia limpar o sexo.

Agora cadastro e edição normalizam os valores para Masculino, Feminino ou Outro. Valores desconhecidos recebem erro 400 legível. A opção vazia é salva como NULL. O formulário reabre a opção já salva e permite limpá-la. A API exige uma empresa identificada nas rotas de clientes e ignora tentativas de mudar empresa_id e id pelo formulário de edição.

## Aplicar

Faça backup do banco e um commit das alterações locais. Extraia este pacote na raiz do projeto, preservando as pastas backend, frontend e tests. Faça commit e push, aguarde o deploy e abra Shell no serviço Render da API.

Execute uma vez, nesse Shell:

```bash
node backend/scripts/migrar-sexo-clientes.js
```

O script consulta a definição real de clientes.sexo no banco configurado na API. Se ela for ENUM, acrescenta as opções ausentes sem remover opções anteriores. Se já for texto, não faz ALTER. Não apaga clientes. Confira a mensagem de sucesso no terminal.

A alteração do modelo sozinha não garante que a coluna de um TiDB existente mude. Execute o script para habilitar Outro no banco. Se o usuário do banco não tiver permissão de ALTER, o script termina com erro explícito. Nesse caso, execute a alteração com o administrador do banco.

Depois da migração, atualize a tela com Ctrl+F5. Cadastre clientes de teste com Masculino, Feminino, Outro e sem seleção. Abra cada um para editar e confirme o valor. Teste limpar a seleção e salvar novamente.

## Teste automático

Com Node 22.13 ou superior e dependências instaladas:

```powershell
node --test .\tests\cliente-sexo.test.js
```

Este teste usa SQLite em memória e o modelo real do Cliente, exercitando os controladores de criação e edição com valores atuais e antigos, opção vazia, valor inválido e proteção da empresa na edição. Não conecta ao banco de produção nem envia notificações reais.

A estrutura do cadastro foi inspecionada no projeto enviado. A tabela TiDB em produção e o erro exato ocorrido no celular do cliente não estavam acessíveis. O teste de SQLite valida os dados e o fluxo da API, mas não reproduz as regras de ENUM do MySQL. Por isso a migração e o teste no Render são etapas necessárias. Esta entrega não representa auditoria de todos os módulos do ERP.
