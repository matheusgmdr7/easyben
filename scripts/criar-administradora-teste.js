/**
 * Script para criar/atualizar uma administradora de teste
 * 
 * Execute: node scripts/criar-administradora-teste.js
 * 
 * Credenciais de teste:
 * Email: teste@administradora.com
 * Senha: teste123
 */

const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
// As variáveis de ambiente devem estar configuradas no sistema ou no .env.local
// Para Next.js, elas são carregadas automaticamente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtzbuxoslaotpnwsphqv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada!');
  console.log('');
  console.log('Opções:');
  console.log('1. Configure a variável de ambiente: export SUPABASE_SERVICE_ROLE_KEY="sua-chave"');
  console.log('2. Ou execute via API route: POST /api/admin/criar-administradora-teste');
  console.log('   (acesse http://localhost:3000/api/admin/criar-administradora-teste no navegador)');
  console.log('');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function criarAdministradoraTeste() {
  try {
    console.log('🚀 Criando/atualizando administradora de teste...');
    
    // Gerar hash da senha "teste123"
    const senha = 'teste123';
    const senhaHash = await bcrypt.hash(senha, 10);
    console.log('✅ Hash da senha gerado');
    
    // Buscar tenant_id padrão
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('status', 'ativo')
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (tenantError || !tenants || tenants.length === 0) {
      console.error('❌ Erro ao buscar tenant:', tenantError);
      console.log('⚠️ Tentando continuar sem tenant_id...');
    }
    
    const tenantId = tenants && tenants.length > 0 ? tenants[0].id : null;
    console.log('🏢 Tenant ID:', tenantId || 'Nenhum encontrado');
    
    // Verificar se já existe
    const { data: existente, error: checkError } = await supabase
      .from('administradoras')
      .select('id')
      .eq('email_login', 'teste@administradora.com')
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Erro ao verificar administradora:', checkError);
      throw checkError;
    }
    
    const dadosAdministradora = {
      nome: 'Administradora de Teste',
      nome_fantasia: 'Admin Teste',
      cnpj: '12.345.678/0001-90',
      email: 'teste@administradora.com',
      email_login: 'teste@administradora.com',
      telefone: '(11) 99999-9999',
      status: 'ativa',
      status_login: 'ativo',
      senha_hash: senhaHash,
      updated_at: new Date().toISOString(),
    };
    
    if (tenantId) {
      dadosAdministradora.tenant_id = tenantId;
    }
    
    if (existente) {
      // Atualizar existente
      console.log('📝 Atualizando administradora existente...');
      const { data, error } = await supabase
        .from('administradoras')
        .update(dadosAdministradora)
        .eq('id', existente.id)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao atualizar:', error);
        throw error;
      }
      
      console.log('✅ Administradora de teste atualizada com sucesso!');
      console.log('📋 ID:', data.id);
    } else {
      // Criar nova
      console.log('➕ Criando nova administradora...');
      const { data, error } = await supabase
        .from('administradoras')
        .insert([dadosAdministradora])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar:', error);
        throw error;
      }
      
      console.log('✅ Administradora de teste criada com sucesso!');
      console.log('📋 ID:', data.id);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CREDENCIAIS DE TESTE CRIADAS COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email: teste@administradora.com');
    console.log('🔑 Senha: teste123');
    console.log('🌐 URL: /administradora/login');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Erro ao criar administradora de teste:', error);
    process.exit(1);
  }
}

criarAdministradoraTeste();

