// Script para criar usuário inicial padrão
const { Usuario } = require('../models');

async function criarUsuarioInicial() {
    try {
        // Verificar se já existe o usuário LOGIN INICIAL
        const usuarioExistente = await Usuario.findOne({
            where: { usuario: 'admin' }
        });

        if (!usuarioExistente) {
            console.log('📝 Criando usuário inicial...');
            
            await Usuario.create({
                nome: 'LOGIN INICIAL',
                usuario: 'admin',
                senha: 'admin123', // Será hasheado automaticamente
                grupoUsuario: 'Acesso Total',
                grupoUsuarioId: '1',
                ativo: true,
                profissionalId: null,
                setorPadraoId: null,
                setorPadraoNome: '',
                acessoValor: 'Total',
                permissoes: [],
                empresas: []
            });

            console.log('✅ Usuário inicial criado com sucesso!');
        } else {
            console.log('ℹ️  Usuário inicial já existe');
        }
    } catch (error) {
        console.error('❌ Erro ao criar usuário inicial:', error);
    }
}

module.exports = criarUsuarioInicial;
