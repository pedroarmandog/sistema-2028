# 📊 Sistema de Relatórios com Stimulsoft Reports.JS

## Guia Completo de Instalação e Uso

---

## 📦 1. Instalação das Dependências

### Backend (Node.js)
```bash
npm install stimulsoft-reports-js stimulsoft-dashboards-js --save
```

**Já instalado! ✅**

---

## 📁 2. Estrutura de Arquivos Criada

```
Sistema ''3'' continuacao/
├── backend/
│   └── routes/
│       └── relatoriosRoutes.js         ← Rotas para dados dos relatórios
│
├── frontend/
│   ├── components/
│   │   ├── report-viewer.html          ← Visualizador Stimulsoft
│   │   └── report-viewer.js            ← Módulo para abrir modal
│   │
│   ├── reports/
│   │   └── templates/
│   │       └── faturamento.mrt         ← Template do relatório
│   │
│   └── painel/
│       ├── rel-faturamento.html        ← Página do relatório (atualizada)
│       ├── rel-faturamento.css
│       └── rel-faturamento.js          ← Integração com viewer (atualizado)
│
└── node_modules/
    ├── stimulsoft-reports-js/          ← Biblioteca Stimulsoft
    └── stimulsoft-dashboards-js/
```

---

## 🚀 3. Como Funciona

### Fluxo de Funcionamento:

```
1. Usuário clica no botão "Visualizar"
   ↓
2. JavaScript coleta os filtros do formulário
   ↓
3. Abre modal fullscreen com iframe
   ↓
4. Iframe carrega report-viewer.html
   ↓
5. Stimulsoft Viewer faz requisição ao backend
   ↓
6. Backend retorna dados JSON
   ↓
7. Stimulsoft renderiza o relatório PDF
   ↓
8. Usuário visualiza, navega, exporta
```

---

## 🔧 4. Endpoints do Backend

### **POST /api/relatorios/faturamento**
Retorna dados do relatório de faturamento

**Requisição:**
```javascript
{
  "dataInicio": "01/11/2025",
  "dataFim": "30/11/2025",
  "relatorioPor": "produto",
  "ordenacao": "lucratividade",
  "filtroGrupo": "todos",
  // ... outros filtros
}
```

**Resposta:**
```javascript
{
  "periodo": "Período: 01/11/2025 até 30/11/2025",
  "produtos": [
    {
      "codigo": "368",
      "produto": "Assinatura 4 Banho/Mês",
      "qtd_vendida": 1,
      "custo": 0.00,
      "total_venda": 200.00,
      "lucro": 200.00,
      "margem": 100
    }
    // ... mais produtos
  ]
}
```

---

## 💻 5. Como Usar no Frontend

### Abrir o visualizador de relatórios:

```javascript
// Exemplo simples
window.reportViewer.open('faturamento', {
    dataInicio: '01/11/2025',
    dataFim: '30/11/2025'
});

// Exemplo com todos os filtros
const filtros = {
    dataInicio: document.getElementById('dataInicioRel').value,
    dataFim: document.getElementById('dataFimRel').value,
    relatorioPor: 'produto',
    ordenacao: 'lucratividade',
    filtroGrupo: 'todos',
    filtroCliente: '',
    // ... outros filtros
};

window.reportViewer.open('faturamento', filtros);
```

### Fechar o visualizador:

```javascript
window.reportViewer.close();
```

---

## 📄 6. Criar Novos Relatórios

### Passo 1: Criar Template (.mrt)

Crie um arquivo JSON em `frontend/reports/templates/nome-relatorio.mrt`

**Estrutura básica:**
```json
{
  "ReportVersion": "2023.1.1",
  "ReportName": "Meu Relatório",
  "Pages": {
    "0": {
      "Components": {
        // Componentes do relatório
      }
    }
  },
  "Dictionary": {
    "DataSources": {
      // Definir campos de dados
    }
  }
}
```

### Passo 2: Criar Endpoint no Backend

Em `backend/routes/relatoriosRoutes.js`:

```javascript
router.post('/meu-relatorio', async (req, res) => {
    try {
        const dados = {
            // Buscar dados do banco
        };
        res.json(dados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Passo 3: Abrir no Frontend

```javascript
window.reportViewer.open('meu-relatorio', filtros);
```

---

## 🎨 7. Funcionalidades do Visualizador

### ✅ Já Implementadas:

- ✅ **Modal Fullscreen** - Tela cheia com overlay
- ✅ **Navegação entre páginas** - Setas para próxima/anterior
- ✅ **Zoom** - In/Out com botões
- ✅ **Miniaturas** - Preview de todas as páginas
- ✅ **Exportar PDF** - Download em PDF
- ✅ **Exportar Excel** - Download em XLS/XLSX
- ✅ **Exportar Word** - Download em DOCX
- ✅ **Exportar HTML** - Download em HTML
- ✅ **Impressão** - Imprimir direto ou gerar PDF
- ✅ **Busca no texto** - Localizar palavras no relatório
- ✅ **Loading overlay** - Animação de carregamento
- ✅ **Responsivo** - Adapta para mobile

---

## 🔐 8. Segurança

### Recomendações:

1. **Autenticação**: Adicionar verificação de token JWT nos endpoints
```javascript
const authMiddleware = require('../middleware/auth');
router.post('/faturamento', authMiddleware, async (req, res) => {
    // ...
});
```

2. **Validação de dados**: Validar filtros recebidos
```javascript
const { body, validationResult } = require('express-validator');

router.post('/faturamento', [
    body('dataInicio').isDate(),
    body('dataFim').isDate()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // ...
});
```

3. **Limite de registros**: Evitar retornar muitos dados
```javascript
const MAX_RECORDS = 1000;
if (produtos.length > MAX_RECORDS) {
    return res.status(400).json({ 
        error: `Muitos registros (${produtos.length}). Máximo: ${MAX_RECORDS}` 
    });
}
```

---

## 🎯 9. Integração com Banco de Dados

### Exemplo com Sequelize:

```javascript
const { Op } = require('sequelize');
const { Produto, ItemVenda } = require('../models');

router.post('/faturamento', async (req, res) => {
    const { dataInicio, dataFim, ordenacao } = req.body;
    
    const produtos = await Produto.findAll({
        include: [{
            model: ItemVenda,
            where: {
                data_venda: {
                    [Op.between]: [
                        new Date(dataInicio),
                        new Date(dataFim)
                    ]
                }
            },
            required: true
        }],
        attributes: [
            'codigo',
            'nome',
            [sequelize.fn('SUM', sequelize.col('ItemVendas.quantidade')), 'qtd_vendida'],
            [sequelize.fn('SUM', sequelize.col('ItemVendas.total')), 'total_venda'],
            'custo'
        ],
        group: ['Produto.id'],
        order: [[ordenacao, 'DESC']]
    });
    
    res.json({
        periodo: `${dataInicio} até ${dataFim}`,
        produtos: produtos.map(p => p.toJSON())
    });
});
```

---

## 🐛 10. Troubleshooting

### Problema: "Report Viewer não carregado"
**Solução**: Verificar se o script `report-viewer.js` está sendo carregado:
```html
<script src="../components/report-viewer.js"></script>
```

### Problema: "Erro ao carregar template"
**Solução**: Verificar caminho do arquivo .mrt e permissões de leitura.

### Problema: "CORS error"
**Solução**: Verificar configuração CORS no backend:
```javascript
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true
}));
```

### Problema: "Dados não aparecem no relatório"
**Solução**: Verificar estrutura JSON retornada do backend corresponde ao template.

---

## 📊 11. Exemplo Completo de Uso

### HTML (já implementado em rel-faturamento.html):
```html
<button id="btnVisualizarRel" class="btn btn-primary">
    <i class="fas fa-chart-bar"></i>
    Visualizar
</button>

<script src="../components/report-viewer.js"></script>
```

### JavaScript (já implementado em rel-faturamento.js):
```javascript
document.getElementById('btnVisualizarRel').addEventListener('click', () => {
    const filtros = {
        dataInicio: document.getElementById('dataInicioRel').value,
        dataFim: document.getElementById('dataFimRel').value,
        relatorioPor: document.getElementById('relatorioPor').value,
        ordenacao: document.getElementById('ordenacao').value
    };
    
    window.reportViewer.open('faturamento', filtros);
});
```

---

## ✨ 12. Próximos Passos

- [ ] Criar mais templates de relatórios
- [ ] Adicionar autenticação nos endpoints
- [ ] Implementar cache de relatórios
- [ ] Adicionar agendamento de relatórios
- [ ] Envio de relatórios por email
- [ ] Salvar relatórios favoritos
- [ ] Histórico de relatórios gerados

---

## 📞 Suporte

Para mais informações sobre Stimulsoft:
- Documentação: https://www.stimulsoft.com/en/documentation
- Exemplos: https://www.stimulsoft.com/en/samples
- API Reference: https://www.stimulsoft.com/en/documentation/online/programming-manual

---

## ✅ Status da Implementação

**CONCLUÍDO! Sistema totalmente funcional.**

1. ✅ Stimulsoft instalado
2. ✅ Estrutura de arquivos criada
3. ✅ Viewer implementado com modal fullscreen
4. ✅ Backend configurado com endpoints
5. ✅ Template de relatório criado
6. ✅ Integração com frontend completa
7. ✅ Exportação PDF/Excel funcionando
8. ✅ Navegação e zoom implementados

**Pronto para uso!** 🚀
