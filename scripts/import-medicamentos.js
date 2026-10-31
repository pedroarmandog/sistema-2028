// Script para importar o array `medicamentosData` definido em
// frontend/item/clinica/medicamentos.js para a tabela `itens` (Produto).
// Uso: node scripts/import-medicamentos.js

const fs = require('fs');
const path = require('path');

(async function(){
  try{
    const Produto = require('../backend/models/Produto');
    const sequelize = Produto.sequelize;

    const frontendFile = path.join(__dirname, '..', 'frontend', 'item', 'clinica', 'medicamentos.js');
    if(!fs.existsSync(frontendFile)){
      console.error('Arquivo frontend não encontrado:', frontendFile); process.exit(1);
    }
    const src = fs.readFileSync(frontendFile, 'utf8');
    const marker = 'let medicamentosData =';
    const idx = src.indexOf(marker);
    if(idx === -1){ console.error('Não encontrei a declaração de medicamentosData no frontend'); process.exit(1); }
    const sub = src.slice(idx + marker.length);
    const closeIdx = sub.indexOf('];');
    if(closeIdx === -1){ console.error('Não encontrei o fim do array medicamentosData'); process.exit(1); }
    const arrayText = sub.slice(0, closeIdx + 1);

    // Avaliar o arrayText de forma segura
    const arr = (new Function('return (' + arrayText + ');'))();
    if(!Array.isArray(arr) || arr.length === 0){ console.error('Array vazio ou inválido'); process.exit(1); }

    console.log('Itens extraídos do frontend:', arr.length);

    // obter maior id numérico atual na tabela itens
    const [[row]] = await Produto.sequelize.query("SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM itens");
    let maxId = (row && (row.maxId !== null && row.maxId !== undefined)) ? Number(row.maxId) : 0;
    console.log('Maior id atual no DB:', maxId);

    let created = 0, updated = 0;
    for(const p of arr){
      try{
        const codigo = p.codigo !== undefined && p.codigo !== null ? String(p.codigo).trim() : null;
        const nome = p.nome ? String(p.nome).trim() : '';
        if(!nome) continue;

        // procurar por codigo primeiro
        let existing = null;
        if(codigo){ existing = await Produto.findOne({ where: { codigo: String(codigo) } }); }
        if(!existing){ existing = await Produto.findOne({ where: { nome: nome } }); }

        if(existing){
          // atualizar campos essenciais
          await existing.update({ nome: nome, codigo: codigo, agrupamento: 'MEDICAMENTOS', ativo: (p.ativo ? 'sim' : 'nao'), controlado: p.controlado || null });
          updated++;
          console.log('Atualizado:', { id: existing.id, codigo: existing.codigo, nome: existing.nome });
        } else {
          maxId = (maxId || 0) + 1;
          const id = String(maxId);
          const payload = {
            id,
            nome,
            codigo: codigo,
            agrupamento: 'MEDICAMENTOS',
            ativo: (p.ativo ? 'sim' : 'nao'),
            controlado: p.controlado || null
          };
          await Produto.create(payload);
          created++;
          console.log('Criado:', { id, codigo, nome });
        }
      }catch(err){ console.warn('Falha item:', p && p.nome, err && err.message); }
    }

    console.log('Importação concluída. Criados:', created, 'Atualizados:', updated);
    process.exit(0);
  }catch(err){
    console.error('Erro no script:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
