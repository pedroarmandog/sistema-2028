// Script: popular fornecedores a partir das entradas existentes
// Uso: node backend/scripts/populate-fornecedores-from-entradas.js

const path = require('path');
(async function(){
    try {
        // garantir que o projeto carregue as configurações de modelos
        const modelsPath = path.join(__dirname, '..');
        const models = require(modelsPath + '/models');
        const { Entrada, Fornecedor } = models;
        if (!Entrada || !Fornecedor) {
            console.error('Modelos Entrada ou Fornecedor não encontrados. Verifique backend/models/index.js');
            process.exit(1);
        }

        console.log('Buscando entradas no banco...');
        const entradas = await Entrada.findAll({ attributes: ['id','fornecedor','createdAt'], order: [['createdAt','DESC']] });
        console.log(`Encontradas ${entradas.length} entradas`);

        let created = 0;
        for (const e of entradas) {
            const nome = (e.fornecedor || '').toString().trim();
            if (!nome) continue;

            // verificar existência por nome exato (case-insensitive)
            const existing = await Fornecedor.findOne({ where: { nome } });
            if (!existing) {
                try {
                    await Fornecedor.create({ nome, ativo: true });
                    created++;
                    console.log('Criado fornecedor:', nome);
                } catch (err) {
                    console.warn('Falha ao criar fornecedor', nome, err && err.message);
                }
            }
        }

        console.log(`Concluído. Fornecedores criados: ${created}`);
        process.exit(0);
    } catch (err) {
        console.error('Erro no script:', err && err.message);
        process.exit(2);
    }
})();
