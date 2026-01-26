// ============================================
// SCRIPT DE TESTE - CHAMADA ASAAS
// BENEFIT COBRANÇAS
// ============================================
// 
// Este script testa a chamada ao Asaas passo a passo
// para identificar onde está o problema
// 
// INSTRUÇÕES:
// 1. Abra o console do navegador (F12) em qualquer página do admin
// 2. Cole este script completo
// 3. Pressione Enter
// ============================================

(async () => {
  const ADMINISTRADORA_ID = '050be541-db3b-4d3c-be95-df80b68747f1';
  const CLIENTE_ID = '05be43ac-7534-47dc-ba40-bc2f9478bf33';
  const CLIENTE_CPF = '01432034448'; // CPF conhecido: KLEYTHYANY
  
  console.log('🧪 ============================================');
  console.log('🧪 TESTE DE CHAMADA ASAAS - BENEFIT COBRANÇAS');
  console.log('🧪 ============================================');
  console.log('');
  
  try {
    // ETAPA 1: Verificar configuração no banco
    console.log('📋 ETAPA 1: Verificando configuração no banco...');
    console.log('');
    
    const configResponse = await fetch('/api/admin/administradoras/' + ADMINISTRADORA_ID + '/config-financeira', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Configuração encontrada:');
      console.log('   - Instituição:', config.instituicao_financeira || 'N/A');
      console.log('   - Ambiente:', config.ambiente || 'N/A');
      console.log('   - Status:', config.status_integracao || 'N/A');
      console.log('   - API Key:', config.api_key ? (config.api_key.substring(0, 15) + '...') : 'NÃO CONFIGURADA');
      console.log('');
      
      if (!config.api_key || config.api_key === '') {
        console.log('❌ ERRO: API Key não está configurada!');
        console.log('   Ação: Configure a API Key na página de configurações da administradora.');
        return;
      }
      
      if (config.instituicao_financeira !== 'asaas') {
        console.log('❌ ERRO: Instituição financeira não está como "asaas"!');
        console.log('   Atual:', config.instituicao_financeira);
        console.log('   Ação: Altere para "Asaas" na página de configurações.');
        return;
      }
      
      if (config.status_integracao !== 'ativa') {
        console.log('❌ ERRO: Status da integração não está como "ativa"!');
        console.log('   Atual:', config.status_integracao);
        console.log('   Ação: Ative a integração na página de configurações.');
        return;
      }
    } else {
      console.log('❌ ERRO: Não foi possível buscar a configuração');
      console.log('   Status:', configResponse.status);
      const error = await configResponse.json().catch(() => ({}));
      console.log('   Erro:', error);
      return;
    }
    
    // ETAPA 2: Testar chamada direta à API de recuperar faturas
    console.log('📋 ETAPA 2: Testando chamada à API de recuperar faturas...');
    console.log('   Cliente ID:', CLIENTE_ID);
    console.log('   CPF:', CLIENTE_CPF);
    console.log('');
    
    const response = await fetch('/api/admin/recuperar-fatura-asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cliente_administradora_id: CLIENTE_ID,
        administradora_id: ADMINISTRADORA_ID
      })
    });
    
    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Response OK:', response.ok);
    console.log('');
    
    const result = await response.json();
    
    if (response.ok && result.sucesso) {
      console.log('✅ SUCESSO!');
      console.log('   - Faturas novas:', result.faturas_salvas || 0);
      console.log('   - Faturas existentes:', result.faturas_existentes || 0);
      console.log('   - Total processadas:', result.total_processadas || 0);
      
      if (result.erros && result.erros.length > 0) {
        console.log('   - Avisos:', result.erros);
      }
    } else {
      console.log('❌ ERRO na chamada:');
      console.log('   - Sucesso:', result.sucesso);
      console.log('   - Erros:', result.erros || result.error);
      
      // Analisar o tipo de erro
      if (result.erros) {
        result.erros.forEach((erro, i) => {
          console.log(`   Erro ${i + 1}: ${erro}`);
          
          if (erro.includes('API key')) {
            console.log('   💡 Problema: API Key não encontrada ou incorreta');
            console.log('   💡 Solução: Verifique a configuração no banco');
          } else if (erro.includes('Cliente não encontrado no Asaas')) {
            console.log('   💡 Problema: Cliente não existe no Asaas com este CPF');
            console.log('   💡 Solução: Verifique se o CPF está correto e se o cliente existe no Asaas');
          } else if (erro.includes('Nenhuma cobrança encontrada')) {
            console.log('   💡 Problema: Cliente existe no Asaas mas não tem faturas');
            console.log('   💡 Solução: Verifique se há faturas cadastradas no Asaas para este cliente');
          }
        });
      }
    }
    
    console.log('');
    console.log('🧪 ============================================');
    console.log('🧪 TESTE CONCLUÍDO');
    console.log('🧪 ============================================');
    console.log('');
    
    // Mostrar resultado completo
    console.log('📋 RESULTADO COMPLETO:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ ERRO FATAL:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
  }
})();







