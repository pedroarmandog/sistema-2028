#!/usr/bin/env node
const Produto = require('../models/Produto');
const sequelize = Produto.sequelize;
const { QueryTypes } = require('sequelize');

async function run(arg) {
    if (!arg) {
        console.log('Uso: node backend/scripts/find-items-by-fornecedor.js <id|nome>');
        process.exit(1);
    }
    const isId = /^[0-9]+$/.test(arg);
    if (isId) {
        console.log(`Buscando itens com fornecedor id=${arg} (JSON_SEARCH)`);
        const sql = `SELECT id,nome,fornecedores FROM itens WHERE JSON_SEARCH(fornecedores, 'one', :val, NULL, '$[*].id') IS NOT NULL`;
        const rows = await sequelize.query(sql, { replacements: { val: String(arg) }, type: QueryTypes.SELECT });
        console.log(`Encontrados ${rows.length} itens (por id):`);
        rows.forEach(r => console.log(`${r.id} - ${r.nome} -> ${JSON.stringify(r.fornecedores)}`));
    }

    // também procurar por nome (case-insensitive) dentro do JSON (campo nome ou fornecedor)
    console.log(`\nBuscando itens por nome contendo: "${arg}" (insensível)`);
    const nome = arg.toString().toLowerCase();
    // buscar linhas onde algum fornecedor.nome ou fornecedor.fornecedor contém a substring
    const sql2 = `SELECT id,nome,fornecedores FROM itens`;
    const all = await sequelize.query(sql2, { type: QueryTypes.SELECT });
    const matches = [];
    for (const r of all) {
        const farr = r.fornecedores || [];
        if (!Array.isArray(farr)) continue;
        for (const fi of farr) {
            if (!fi) continue;
            if (typeof fi === 'string') {
                if (fi.toLowerCase().includes(nome)) { matches.push(r); break; }
            } else if (typeof fi === 'object') {
                const n = (fi.nome || fi.fornecedor || '').toString().toLowerCase();
                if (n.includes(nome)) { matches.push(r); break; }
            }
        }
    }
    console.log(`Encontrados ${matches.length} itens (por nome):`);
    matches.forEach(r => console.log(`${r.id} - ${r.nome} -> ${JSON.stringify(r.fornecedores)}`));
}

const arg = process.argv[2];
run(arg).then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
