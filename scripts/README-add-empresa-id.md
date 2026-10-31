# add-empresa-id

Scripts para adicionar a coluna `empresa_id` na tabela `usuarios` e popular valores.

Opções:

- `scripts/add-empresa-id.sql` — SQL de exemplo (pode ser executado com cliente MySQL):

  ```sql
  ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id INT NULL;
  UPDATE usuarios SET empresa_id = 1 WHERE id = 1; -- ajuste conforme necessário
  ```

- `scripts/add-empresa-id.js` — script Node que usa `config/config.json` para conexão
  e tenta popular `empresa_id` a partir do campo JSON `empresas`.

Uso recomendado (no Windows, na raiz do projeto):

```powershell
# Dry-run (simula sem aplicar):
node scripts/add-empresa-id.js --env development --dry-run

# Aplicar mudanças (ambiente development):
node scripts/add-empresa-id.js --env development

# Aplicar mapeamentos manuais (formato idUsuario:idEmpresa, separados por vírgula):
node scripts/add-empresa-id.js --set "1:1,2:3"
```

Observações:

- Faça backup do banco antes de executar em produção.
- O script lê `config/config.json` (campos `username`, `password`, `database`, `host`).
- Se preferir cliente MySQL, use `mysql -u user -p -h host database < scripts/add-empresa-id.sql`.
