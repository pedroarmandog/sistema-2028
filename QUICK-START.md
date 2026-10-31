# ⚡ QUICK START - Relatórios Stimulsoft

## 🎯 TESTE AGORA EM 3 PASSOS

### 1️⃣ Certifique-se que o servidor está rodando
```bash
npm start
```

### 2️⃣ Abra no navegador
```
http://localhost:3000/frontend/test-report-viewer.html
```

### 3️⃣ Clique em qualquer botão de teste!

---

## 💡 USO RÁPIDO

### No seu código JavaScript:
```javascript
// Abrir relatório
window.reportViewer.open('faturamento', {
    dataInicio: '01/11/2025',
    dataFim: '30/11/2025'
});

// Fechar relatório
window.reportViewer.close();
```

### No seu HTML:
```html
<!-- 1. Incluir o script -->
<script src="../components/report-viewer.js"></script>

<!-- 2. Criar botão -->
<button onclick="window.reportViewer.open('faturamento', {})">
    Visualizar Relatório
</button>
```

---

## 📂 ESTRUTURA DE ARQUIVOS

```
✅ frontend/components/report-viewer.html  (Viewer Stimulsoft)
✅ frontend/components/report-viewer.js    (Modal Controller)
✅ frontend/reports/templates/*.mrt        (Templates)
✅ backend/routes/relatoriosRoutes.js      (API Endpoints)
```

---

## 🧪 PÁGINAS DE TESTE

1. **Teste Geral:**
   `http://localhost:3000/frontend/test-report-viewer.html`

2. **Relatório de Faturamento:**
   `http://localhost:3000/frontend/painel/rel-faturamento.html`

3. **Viewer Direto:**
   `http://localhost:3000/frontend/components/report-viewer.html?type=faturamento&filters={}`

---

## 🎨 EXEMPLO COMPLETO

```javascript
// Coletar filtros
const filtros = {
    dataInicio: document.getElementById('dataInicio').value,
    dataFim: document.getElementById('dataFim').value,
    relatorioPor: 'produto',
    ordenacao: 'lucratividade'
};

// Abrir visualizador
window.reportViewer.open('faturamento', filtros);
```

---

## ✨ FUNCIONALIDADES

- ✅ Modal Fullscreen
- ✅ Navegação entre páginas
- ✅ Zoom +/-
- ✅ Miniaturas
- ✅ Exportar PDF
- ✅ Exportar Excel
- ✅ Exportar Word
- ✅ Impressão
- ✅ Busca no texto
- ✅ Responsivo

---

## 🚀 JÁ ESTÁ FUNCIONANDO!

Tudo configurado e pronto para usar.
Basta abrir a página de teste e clicar!

---

**Veja documentação completa em:**
- `RELATORIOS-STIMULSOFT.md` (Guia detalhado)
- `INSTALACAO-CONCLUIDA.md` (Resumo completo)
