# 🎨 Sistema de Cores Globais - Pet Cria

## 📋 Visão Geral

Este sistema centraliza todas as cores do projeto Pet Cria em variáveis CSS reutilizáveis, facilitando a manutenção e personalização do tema.

## 🗂️ Estrutura de Arquivos

```
frontend/
├── colors.css          # ← Arquivo principal com todas as variáveis de cores
├── dashboard.css       # ← Atualizado para usar var(--color-*)
├── marketing.css       # ← Atualizado para usar var(--color-*)
├── agendamentos.css    # ← Atualizado para usar var(--color-*)
├── style.css           # ← Atualizado para usar var(--color-*)
└── clientes.css        # ← Criado para estilos específicos de clientes
```

## 🎯 Como Usar

### 1. Importação Automática
Todas as páginas principais já importam automaticamente:
```html
<link rel="stylesheet" href="colors.css">
```

### 2. Usando as Variáveis no CSS
```css
/* ✅ Forma correta */
.meu-elemento {
    background-color: var(--color-primary);
    color: var(--text-white);
    border: 1px solid var(--border-color);
}

/* ❌ Forma antiga (evitar) */
.meu-elemento {
    background-color: #007bff;
    color: #ffffff;
    border: 1px solid #dee2e6;
}
```

## 🎨 Principais Grupos de Cores

### 🔵 Cores Principais
- `--color-primary`: #007bff (Azul principal do sistema)
- `--color-primary-hover`: #0056b3 (Hover do azul principal)
- `--color-primary-light`: #3498db (Azul claro)
- `--color-secondary`: #27ae60 (Verde de sucesso)
- `--color-secondary-hover`: #229954 (Hover do verde)

### 📄 Backgrounds
- `--bg-body`: #f8f9fa (Fundo principal da página)
- `--bg-white`: #ffffff (Fundo branco puro)
- `--bg-light`: #f8f9fa (Fundo claro)
- `--bg-sidebar`: linear-gradient(...) (Gradiente da sidebar)

### ✏️ Textos
- `--text-primary`: #333 (Texto principal)
- `--text-secondary`: #6c757d (Texto secundário)
- `--text-muted`: #495057 (Texto esmaecido)
- `--text-white`: #ffffff (Texto branco)

### 🎯 Estados e Status
- `--color-success`: #28a745 (Verde de sucesso)
- `--color-danger`: #dc3545 (Vermelho de erro)
- `--color-info`: #17a2b8 (Azul de informação)
- `--color-warning`: #ffc107 (Amarelo de aviso)

### 🔘 Botões
- `--btn-primary`: #007bff
- `--btn-primary-hover`: #0056b3
- `--btn-success`: #27ae60
- `--btn-success-hover`: #229954
- `--btn-danger`: #e74c3c

## 🚀 Como Personalizar o Tema

### Mudança Rápida de Cor Principal
Para mudar a cor principal do sistema inteiro:

```css
/* No arquivo colors.css, mude apenas esta linha: */
:root {
    --color-primary: #ff6600; /* ← Nova cor principal */
}
```

### Mudança de Tema Completo
Para criar um tema personalizado:

```css
:root {
    /* Cores principais */
    --color-primary: #your-color;
    --color-secondary: #your-secondary;
    
    /* Backgrounds */
    --bg-body: #your-background;
    --bg-sidebar-start: #your-sidebar-start;
    --bg-sidebar-end: #your-sidebar-end;
    
    /* Textos */
    --text-primary: #your-text-color;
}
```

## 🎨 Classes Utilitárias Incluídas

```css
/* Classes de texto */
.text-primary     /* Cor principal */
.text-secondary   /* Cor secundária */
.text-success     /* Verde */
.text-danger      /* Vermelho */
.text-info        /* Azul info */
.text-warning     /* Amarelo */
.text-muted       /* Cinza */
.text-white       /* Branco */

/* Classes de background */
.bg-primary       /* Fundo azul principal */
.bg-secondary     /* Fundo verde */
.bg-success       /* Fundo verde sucesso */
.bg-danger        /* Fundo vermelho */
.bg-light         /* Fundo claro */
.bg-white         /* Fundo branco */
```

## 🔄 Modo Escuro (Futuro)

O sistema já está preparado para modo escuro:

```css
/* Descomente no colors.css quando necessário */
[data-theme="dark"] {
    --bg-body: #1a1a1a;
    --bg-white: #2d2d2d;
    --text-primary: #ffffff;
    --text-secondary: #b0b0b0;
}
```

## 📊 Cards de Estatísticas

Cores especiais para cards:
- `--card-cyan`: #17a2b8
- `--card-yellow`: #ffc107
- `--card-purple`: #6f42c1
- `--card-red`: #dc3545
- `--card-green`: #28a745

## 🛠️ Manutenção

### ✅ Vantagens do Sistema Atual
- ✅ Uma única mudança afeta todo o site
- ✅ Consistência visual garantida
- ✅ Fácil manutenção
- ✅ Preparado para temas personalizados
- ✅ Preparado para modo escuro

### 📝 Boas Práticas
1. **Sempre use variáveis** ao invés de cores hardcoded
2. **Teste em todas as páginas** após mudanças
3. **Use classes utilitárias** quando apropriado
4. **Mantenha consistência** nos nomes das variáveis

## 🎯 Exemplos Práticos

### Botão Personalizado
```css
.meu-botao {
    background: var(--btn-primary);
    color: var(--text-white);
    border: 1px solid var(--border-color);
    padding: 10px 20px;
    border-radius: 6px;
}

.meu-botao:hover {
    background: var(--btn-primary-hover);
}
```

### Card Personalizado
```css
.meu-card {
    background: var(--bg-white);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-card);
    padding: 20px;
    border-radius: 8px;
}

.meu-card h3 {
    color: var(--text-primary);
    margin-bottom: 10px;
}

.meu-card p {
    color: var(--text-secondary);
}
```

---

## 💡 Dicas Finais

- **Todas as cores estão em `colors.css`** - este é o único arquivo que você precisa editar para mudar o tema
- **As importações estão automáticas** - não precisa se preocupar com imports
- **Sistema é escalável** - adicione novas variáveis conforme necessário
- **Compatível com todos os navegadores modernos**

**🎨 Agora você pode mudar facilmente a aparência de todo o sistema Pet Cria editando apenas o arquivo `colors.css`!**