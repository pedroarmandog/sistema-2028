const express = require('express');
const router = express.Router();

// Lista de serviços disponíveis (temporário - pode ser movido para banco de dados depois)
const servicos = [
    { id: 1, nome: 'Banho', preco: 25.00, descricao: 'Banho completo com shampoo e condicionador' },
    { id: 2, nome: 'Banho e Tosa', preco: 45.00, descricao: 'Banho completo + Tosa higiênica' },
    { id: 3, nome: 'Tosa Completa', preco: 60.00, descricao: 'Tosa completa com acabamento profissional' },
    { id: 4, nome: 'Consulta Veterinária', preco: 80.00, descricao: 'Consulta clínica geral com veterinário' },
    { id: 5, nome: 'Vacinação', preco: 35.00, descricao: 'Aplicação de vacina (valor não inclui a vacina)' },
    { id: 6, nome: 'Exame de Sangue', preco: 120.00, descricao: 'Hemograma completo' },
    { id: 7, nome: 'Corte de Unha', preco: 15.00, descricao: 'Corte e limpeza das unhas' },
    { id: 8, nome: 'Limpeza de Ouvido', preco: 20.00, descricao: 'Limpeza e higienização do ouvido' },
    { id: 9, nome: 'Escovação Dental', preco: 30.00, descricao: 'Escovação e limpeza dental' },
    { id: 10, nome: 'Hotel (Diária)', preco: 50.00, descricao: 'Hospedagem completa com alimentação' }
];

// Buscar serviços
router.get('/', (req, res) => {
    try {
        const { search } = req.query;
        
        let filteredServicos = servicos;
        
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredServicos = servicos.filter(servico => 
                servico.nome.toLowerCase().includes(searchTerm) ||
                servico.descricao.toLowerCase().includes(searchTerm)
            );
        }
        
        res.json(filteredServicos);
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar serviço por ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const servico = servicos.find(s => s.id === parseInt(id));
        
        if (!servico) {
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }
        
        res.json(servico);
    } catch (error) {
        console.error('Erro ao buscar serviço:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;