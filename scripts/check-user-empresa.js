const { sequelize } = require('../backend/models');
const { QueryTypes } = require('sequelize');

async function checkUser() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...\n');
    
    const usuarios = await sequelize.query(
      'SELECT id, usuario, nome, empresa_id, empresas, ativo FROM usuarios LIMIT 10',
      { type: QueryTypes.SELECT }
    );
    
    console.log(`Total de usuários encontrados: ${usuarios.length}\n`);
    
    usuarios.forEach((u, index) => {
      console.log(`\n========== USUÁRIO ${index + 1} ==========`);
      console.log(`ID: ${u.id}`);
      console.log(`Usuário: ${u.usuario}`);
      console.log(`Nome: ${u.nome}`);
      console.log(`Ativo: ${u.ativo}`);
      console.log(`empresa_id (coluna): ${u.empresa_id}`);
      console.log(`empresas (JSON): ${u.empresas}`);
      
      // Tentar extrair empresaId
      let empresaId = null;
      if (u.empresa_id) {
        empresaId = Number(u.empresa_id);
      } else if (u.empresas) {
        try {
          const empresas = typeof u.empresas === 'string' ? JSON.parse(u.empresas) : u.empresas;
          if (Array.isArray(empresas) && empresas.length > 0) {
            const first = empresas[0];
            if (typeof first === 'number') empresaId = first;
            else if (typeof first === 'object' && first !== null) {
              empresaId = first.id || first.empresaId ? Number(first.id || first.empresaId) : null;
            }
          }
        } catch (e) {
          console.log(`  ❌ Erro ao parsear empresas: ${e.message}`);
        }
      }
      
      console.log(`\n✅ empresaId extraído: ${empresaId || '❌ NULL'}`);
      
      if (!empresaId) {
        console.log(`\n⚠️  PROBLEMA: Este usuário NÃO tem empresaId associado!`);
        console.log(`   Isso causará erro 403 em todas as rotas financeiras.`);
      }
    });
    
    console.log('\n\n========== VERIFICANDO EMPRESAS ==========\n');
    
    const empresas = await sequelize.query(
      'SELECT id, nome, cnpj, email FROM empresas LIMIT 10',
      { type: QueryTypes.SELECT }
    );
    
    console.log(`Total de empresas: ${empresas.length}`);
    empresas.forEach((e, i) => {
      console.log(`${i + 1}. ID: ${e.id} | Nome: ${e.nome} | CNPJ: ${e.cnpj}`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkUser();