// ============================================
// SCRIPT DIRETO PARA IMPORTAR FATURAS
// BENEFIT COBRANÇAS - VERSÃO SIMPLIFICADA
// ============================================
// 
// INSTRUÇÕES:
// 1. Abra o console do navegador (F12) em qualquer página do admin
// 2. Cole este script completo
// 3. Pressione Enter
// ============================================

(async () => {
  const ADMINISTRADORA_ID = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  // LISTA DE CLIENTES (adicione mais clientes aqui se necessário)
  // Formato: { id: 'cliente_id', nome: 'Nome do Cliente', cpf: '00000000000' }
  const CLIENTES = [
    {
      id: '05be43ac-7534-47dc-ba40-bc2f9478bf33',
      nome: 'KLEYTHYANY LACERDA NUNES',
      cpf: '01432034448'
    }
    // Adicione mais clientes aqui:
    // { id: 'outro-id', nome: 'Outro Cliente', cpf: '00000000000' },
  ];
  
  console.log('🚀 Iniciando importação de faturas do Asaas...');
  console.log('📋 Administradora: BENEFIT COBRANÇAS');
  console.log(`📊 Total de clientes na lista: ${CLIENTES.length}`);
  console.log('');
  
  if (CLIENTES.length === 0) {
    console.log('❌ Nenhum cliente na lista. Adicione clientes no array CLIENTES.');
    alert('❌ Adicione clientes no script antes de executar.');
    return;
  }
  
  let sucesso = 0;
  let erros = 0;
  let totalFaturasSalvas = 0;
  let totalFaturasExistentes = 0;
  let totalProcessadas = 0;
  
  for (let i = 0; i < CLIENTES.length; i++) {
    const cliente = CLIENTES[i];
    
    try {
      console.log(`[${i + 1}/${CLIENTES.length}] Processando: ${cliente.nome} (CPF: ${cliente.cpf})...`);
      
      const response = await fetch('/api/admin/recuperar-fatura-asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cliente_administradora_id: cliente.id,
          administradora_id: ADMINISTRADORA_ID
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.sucesso) {
        const faturasSalvas = result.faturas_salvas || 0;
        const faturasExistentes = result.faturas_existentes || 0;
        const total = result.total_processadas || 0;
        
        totalFaturasSalvas += faturasSalvas;
        totalFaturasExistentes += faturasExistentes;
        totalProcessadas += total;
        sucesso++;
        
        if (faturasSalvas > 0 || faturasExistentes > 0) {
          console.log(`  ✅ ${faturasSalvas} novas, ${faturasExistentes} existentes (${total} no Asaas)`);
        } else {
          console.log(`  ℹ️ Nenhuma fatura encontrada no Asaas`);
        }
        
        if (result.erros && result.erros.length > 0) {
          console.log(`  ⚠️ Avisos:`, result.erros);
        }
      } else {
        erros++;
        const erroMsg = result.erros ? result.erros.join(', ') : result.error || 'Erro desconhecido';
        console.log(`  ❌ Erro: ${erroMsg}`);
      }
      
      // Delay de 1 segundo entre requisições
      if (i < CLIENTES.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      erros++;
      console.log(`  ❌ Erro ao processar: ${error.message}`);
    }
  }
  
  console.log('');
  console.log('============================================================');
  console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
  console.log('============================================================');
  console.log(`   - Clientes processados: ${CLIENTES.length}`);
  console.log(`   - Sucesso: ${sucesso}`);
  console.log(`   - Erros: ${erros}`);
  console.log(`   - Faturas novas importadas: ${totalFaturasSalvas}`);
  console.log(`   - Faturas já existentes: ${totalFaturasExistentes}`);
  console.log(`   - Total de faturas no Asaas: ${totalProcessadas}`);
  console.log(`   - Total de faturas no banco: ${totalFaturasSalvas + totalFaturasExistentes}`);
  console.log('');
  console.log('🔄 Recarregue a página financeiro para ver as faturas importadas.');
  console.log('');
  
  alert(`✅ Importação concluída!\n\n- Clientes: ${CLIENTES.length}\n- Sucesso: ${sucesso}\n- Erros: ${erros}\n- Faturas novas: ${totalFaturasSalvas}\n- Faturas existentes: ${totalFaturasExistentes}`);
})();







