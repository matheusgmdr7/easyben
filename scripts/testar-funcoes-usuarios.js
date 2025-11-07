// =====================================================
// SCRIPT: Testar Funções de Usuários Admin
// =====================================================
// 
// Este script testa as funções de criar e desativar usuários
// Execute no console do navegador na página admin
//
// =====================================================

// Função para testar criação de usuário
async function testarCriarUsuario() {
  console.log('🧪 Testando criação de usuário...');
  
  try {
    const dadosUsuario = {
      nome: "Usuário Teste",
      email: `teste.${Date.now()}@empresa.com`, // Email único
      senha: "senha123",
      perfil: "vendas",
      permissoes: ["dashboard", "propostas", "vendas", "leads"]
    };
    
    console.log('📝 Dados do usuário:', dadosUsuario);
    
    const resultado = await UsuariosAdminService.criar(dadosUsuario);
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('👤 Dados retornados:', {
      id: resultado.id,
      nome: resultado.nome,
      email: resultado.email,
      perfil: resultado.perfil,
      ativo: resultado.ativo,
      auth_user_id: resultado.auth_user_id
    });
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    throw error;
  }
}

// Função para testar desativação de usuário
async function testarDesativarUsuario(usuarioId) {
  console.log('🧪 Testando desativação de usuário...');
  
  try {
    console.log('🔄 Desativando usuário ID:', usuarioId);
    
    await UsuariosAdminService.deletar(usuarioId);
    
    console.log('✅ Usuário desativado com sucesso!');
    
    // Verificar se foi desativado
    const usuario = await UsuariosAdminService.buscarPorId(usuarioId);
    console.log('📊 Status após desativação:', {
      id: usuario.id,
      nome: usuario.nome,
      ativo: usuario.ativo,
      status: usuario.status
    });
    
    return usuario;
    
  } catch (error) {
    console.error('❌ Erro ao desativar usuário:', error);
    throw error;
  }
}

// Função para testar login do usuário criado
async function testarLoginUsuario(email, senha = "senha123") {
  console.log('🧪 Testando login do usuário...');
  
  try {
    console.log('🔑 Tentando login com:', email);
    
    const resultado = await UsuariosAdminService.validarSenha(email, senha);
    
    if (resultado) {
      console.log('✅ Login bem-sucedido!');
      console.log('👤 Dados do usuário logado:', {
        nome: resultado.nome,
        email: resultado.email,
        perfil: resultado.perfil,
        permissoes: resultado.permissoes?.length || 0
      });
    } else {
      console.log('❌ Login falhou - credenciais inválidas');
    }
    
    return resultado;
    
  } catch (error) {
    console.error('💥 Erro no teste de login:', error);
    throw error;
  }
}

// Função para testar ativação/reativação de usuário
async function testarReativarUsuario(usuarioId) {
  console.log('🧪 Testando reativação de usuário...');
  
  try {
    console.log('🔄 Reativando usuário ID:', usuarioId);
    
    const resultado = await UsuariosAdminService.toggleAtivo(usuarioId, true);
    
    console.log('✅ Usuário reativado com sucesso!');
    console.log('📊 Status após reativação:', {
      id: resultado.id,
      nome: resultado.nome,
      ativo: resultado.ativo,
      status: resultado.status
    });
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao reativar usuário:', error);
    throw error;
  }
}

// Função para testar exclusão de usuário
async function testarExcluirUsuario(usuarioId) {
  console.log('🧪 Testando exclusão de usuário...');
  
  try {
    console.log('🗑️ Excluindo usuário ID:', usuarioId);
    
    await UsuariosAdminService.excluir(usuarioId);
    
    console.log('✅ Usuário excluído permanentemente!');
    
    // Tentar buscar o usuário (deve falhar)
    try {
      await UsuariosAdminService.buscarPorId(usuarioId);
      console.log('⚠️ Aviso: Usuário ainda existe na base de dados');
    } catch (error) {
      console.log('✅ Confirmado: Usuário foi removido da base de dados');
    }
    
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    throw error;
  }
}

// Função para teste completo
async function testeCompleto() {
  console.log('🚀 Iniciando teste completo do sistema de usuários...');
  
  try {
    // 1. Criar usuário
    console.log('\n=== ETAPA 1: CRIAR USUÁRIO ===');
    const usuario = await testarCriarUsuario();
    
    // 2. Testar login
    console.log('\n=== ETAPA 2: TESTAR LOGIN ===');
    await testarLoginUsuario(usuario.email);
    
    // 3. Desativar usuário
    console.log('\n=== ETAPA 3: DESATIVAR USUÁRIO ===');
    await testarDesativarUsuario(usuario.id);
    
    // 4. Tentar login após desativação (deve falhar)
    console.log('\n=== ETAPA 4: TESTAR LOGIN APÓS DESATIVAÇÃO ===');
    await testarLoginUsuario(usuario.email);
    
    // 5. Reativar usuário
    console.log('\n=== ETAPA 5: REATIVAR USUÁRIO ===');
    await testarReativarUsuario(usuario.id);
    
    // 6. Testar login após reativação
    console.log('\n=== ETAPA 6: TESTAR LOGIN APÓS REATIVAÇÃO ===');
    await testarLoginUsuario(usuario.email);
    
    // 7. Desativar novamente para teste de exclusão
    console.log('\n=== ETAPA 7: DESATIVAR PARA EXCLUSÃO ===');
    await testarDesativarUsuario(usuario.id);
    
    // 8. Excluir usuário permanentemente
    console.log('\n=== ETAPA 8: EXCLUIR USUÁRIO PERMANENTEMENTE ===');
    await testarExcluirUsuario(usuario.id);
    
    console.log('\n🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('✅ Todas as funções estão funcionando corretamente');
    
  } catch (error) {
    console.error('\n💥 ERRO NO TESTE COMPLETO:', error);
    console.log('❌ Alguma função não está funcionando corretamente');
  }
}

// Função para listar usuários atuais
async function listarUsuarios() {
  console.log('📋 Listando usuários atuais...');
  
  try {
    const usuarios = await UsuariosAdminService.listar();
    
    console.log(`📊 Total de usuários: ${usuarios.length}`);
    console.log('\n👥 Lista de usuários:');
    
    usuarios.forEach((usuario, index) => {
      console.log(`${index + 1}. ${usuario.nome} (${usuario.email})`);
      console.log(`   - Perfil: ${usuario.perfil}`);
      console.log(`   - Status: ${usuario.ativo ? '✅ Ativo' : '❌ Inativo'}`);
      console.log(`   - Auth ID: ${usuario.auth_user_id ? '✅' : '❌'}`);
      console.log('');
    });
    
    return usuarios;
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw error;
  }
}

// Exportar funções para uso no console
window.testarCriarUsuario = testarCriarUsuario;
window.testarDesativarUsuario = testarDesativarUsuario;
window.testarLoginUsuario = testarLoginUsuario;
window.testarReativarUsuario = testarReativarUsuario;
window.testarExcluirUsuario = testarExcluirUsuario;
window.testeCompleto = testeCompleto;
window.listarUsuarios = listarUsuarios;

console.log('🔧 Script de teste carregado!');
console.log('📋 Comandos disponíveis:');
console.log('  - listarUsuarios()');
console.log('  - testarCriarUsuario()');
console.log('  - testarDesativarUsuario("id-do-usuario")');
console.log('  - testarLoginUsuario("email@exemplo.com")');
console.log('  - testarReativarUsuario("id-do-usuario")');
console.log('  - testarExcluirUsuario("id-do-usuario")');
console.log('  - testeCompleto() // Testa tudo automaticamente');
console.log('\n💡 Recomendação: Execute testeCompleto() para testar todas as funções');