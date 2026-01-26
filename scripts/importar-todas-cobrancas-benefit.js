// ============================================
// SCRIPT PARA IMPORTAR TODAS AS COBRANÇAS DO ASAAS
// BENEFIT COBRANÇAS
// ============================================
// 
// Este script importa TODAS as cobranças que estão no Asaas,
// sem fazer match por CPF. Importa tudo que existe lá.
// 
// INSTRUÇÕES:
// 1. Abra o console do navegador (F12) em qualquer página do admin
// 2. Cole este script completo
// 3. Pressione Enter
// 4. Aguarde a conclusão (pode demorar alguns minutos)
// ============================================

(async () => {
  const ADMINISTRADORA_ID = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  console.log('🚀 ============================================');
  console.log('🚀 IMPORTAR TODAS AS COBRANÇAS DO ASAAS');
  console.log('🚀 BENEFIT COBRANÇAS');
  console.log('🚀 ============================================');
  console.log('');
  console.log('📋 Administradora ID:', ADMINISTRADORA_ID);
  console.log('⏳ Iniciando importação...');
  console.log('');
  
  try {
    const startTime = Date.now();
    
    // Usar a rota existente com parâmetro importar_todas_cobrancas
    const response = await fetch('/api/importar-asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        administradora_id: ADMINISTRADORA_ID,
        importar_todas_cobrancas: true
      })
    });
    
    const result = await response.json();
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('');
    console.log('✅ ============================================');
    console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
    console.log('✅ ============================================');
    console.log('');
    console.log('📊 RESULTADOS:');
    console.log('   - Total de cobranças encontradas no Asaas:', result.total_cobrancas_encontradas || 0);
    console.log('   - Faturas importadas (novas):', result.faturas_importadas || 0);
    console.log('   - Faturas atualizadas:', result.faturas_atualizadas || 0);
    console.log('   - Faturas já existentes:', result.faturas_ja_existentes || 0);
    console.log('   - Faturas sem cliente vinculado:', result.faturas_sem_cliente || 0);
    console.log('   - Erros:', result.erros?.length || 0);
    console.log('   - Tempo decorrido:', duration, 'segundos');
    console.log('');
    
    if (result.erros && result.erros.length > 0) {
      console.log('⚠️ ERROS ENCONTRADOS:');
      result.erros.slice(0, 10).forEach((erro, i) => {
        console.log(`   ${i + 1}. ${erro}`);
      });
      if (result.erros.length > 10) {
        console.log(`   ... e mais ${result.erros.length - 10} erros`);
      }
      console.log('');
    }
    
    if (result.sucesso) {
      console.log('✅ Importação realizada com sucesso!');
      console.log('');
      console.log('💡 PRÓXIMOS PASSOS:');
      console.log('   1. Verifique as faturas importadas na página da administradora');
      console.log('   2. Faturas sem cliente vinculado podem ser vinculadas manualmente');
      console.log('   3. Se houver erros, verifique os logs acima');
    } else {
      console.log('❌ Erro na importação:', result.error || 'Erro desconhecido');
    }
    
    console.log('');
    console.log('📋 RESULTADO COMPLETO:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ ERRO FATAL:', error);
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
  }
})();

