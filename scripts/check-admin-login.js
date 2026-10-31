 const { sequelize } = require('../backend/models');
const { Admin } = require('../backend/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function checkAdmin() {
  try {
    console.log('🔍 Verificando login de admin...\n');
    
    // Verificar variável de ambiente
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET não está definido no .env');
      process.exit(1);
    }
    console.log('✅ JWT_SECRET encontrado\n');
    
    // Buscar admin no banco
    const email = 'joaquim@email.com'; // Substitua pelo email que você está usando
    console.log(`📋 Buscando admin com email: ${email}`);
    
    const admin = await Admin.findOne({ where: { email } });
    
    if (!admin) {
      console.error('❌ Admin NÃO encontrado no banco de dados');
      console.log('\n💡 Solução: Crie um admin usando o script de seed ou cadastro');
      process.exit(1);
    }
    
    console.log('✅ Admin encontrado:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Nome: ${admin.nome} ${admin.sobrenome}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Ativo: ${admin.ativo}`);
    console.log(`   Senha hash: ${admin.senha.substring(0, 20)}...`);
    
    // Testar senha
    const senha = '@Pedropro14'; // Substitua pela senha que você está usando
    console.log(`\n🔐 Testando senha: ${senha}`);
    
    const senhaValida = await bcrypt.compare(senha, admin.senha);
    console.log(`   Senha válida: ${senhaValida ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!senhaValida) {
      console.log('\n💡 Solução: A senha está incorreta. Use a senha correta ou resete o admin.');
      process.exit(1);
    }
    
    // Gerar token
    console.log('\n🎫 Gerando token JWT...');
    const token = jwt.sign(
      { id: admin.id, email: admin.email, nome: admin.nome },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Token gerado com sucesso');
    console.log(`   Token: ${token.substring(0, 50)}...`);
    
    // Verificar token
    console.log('\n🔍 Verificando token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token válido');
    console.log(`   Decodificado:`, decoded);
    
    console.log('\n✅ TUDO OK! O login deve funcionar.');
    console.log('\n📝 Teste no frontend:');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${senha}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkAdmin();