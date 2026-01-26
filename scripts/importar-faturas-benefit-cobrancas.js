// ============================================
// SCRIPT PARA IMPORTAR TODAS AS FATURAS DO ASAAS
// BENEFIT COBRANÇAS
// ============================================
// 
// INSTRUÇÕES:
// 1. Abra o console do navegador (F12)
// 2. Vá para a aba "Console"
// 3. Cole este script completo
// 4. Pressione Enter
//
// O script irá importar faturas para todos os clientes
// da Benefit Cobranças que possuem CPF válido
// ============================================

(async () => {
  const ADMINISTRADORA_ID = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  // Lista de clientes (será preenchida dinamicamente ou manualmente)
  // Para usar dinamicamente, você precisaria fazer uma chamada à API primeiro
  // Por enquanto, vamos usar uma abordagem que busca os clientes via API
  
  console.log('🚀 Iniciando importação de faturas do Asaas...');
  console.log('📋 Administradora: BENEFIT COBRANÇAS');
  console.log('');
  
  try {
    // Primeiro, buscar lista de clientes da administradora
    // Nota: Você pode precisar ajustar esta URL dependendo da sua API
    const clientesResponse = await fetch(`/api/admin/administradoras/${ADMINISTRADORA_ID}/clientes`);
    
    let clientes = [];
    
    if (clientesResponse.ok) {
      const data = await clientesResponse.json();
      // Ajustar conforme a estrutura da resposta da API
      clientes = data.clientes || data || [];
    } else {
      // Se não houver API, usar lista manual
      console.log('⚠️ Não foi possível buscar clientes via API. Use a lista manual abaixo.');
      console.log('');
      console.log('Para usar lista manual, edite o script e adicione os IDs dos clientes no array "clientes"');
      return;
    }
    
    // Filtrar apenas clientes com CPF válido
    const clientesValidos = clientes.filter(c => {
      const cpf = (c.cliente_cpf || c.cpf || '').replace(/\D/g, '');
      return cpf.length >= 11;
    });
    
    console.log(`📊 Total de clientes encontrados: ${clientes.length}`);
    console.log(`✅ Clientes com CPF válido: ${clientesValidos.length}`);
    console.log('');
    
    if (clientesValidos.length === 0) {
      console.log('❌ Nenhum cliente válido encontrado para importação.');
      return;
    }
    
    let sucesso = 0;
    let erros = 0;
    let totalFaturasSalvas = 0;
    let totalFaturasExistentes = 0;
    
    // Processar cada cliente
    for (let i = 0; i < clientesValidos.length; i++) {
      const cliente = clientesValidos[i];
      const clienteId = cliente.id || cliente.cliente_administradora_id;
      const clienteNome = cliente.cliente_nome || cliente.nome || 'Cliente sem nome';
      
      try {
        console.log(`[${i + 1}/${clientesValidos.length}] Processando: ${clienteNome}...`);
        
        const response = await fetch('/api/admin/recuperar-fatura-asaas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cliente_administradora_id: clienteId,
            administradora_id: ADMINISTRADORA_ID
          })
        });
        
        const result = await response.json();
        
        if (response.ok && result.sucesso) {
          const faturasSalvas = result.faturas_salvas || 0;
          const faturasExistentes = result.faturas_existentes || 0;
          const totalProcessadas = result.total_processadas || 0;
          
          totalFaturasSalvas += faturasSalvas;
          totalFaturasExistentes += faturasExistentes;
          sucesso++;
          
          if (faturasSalvas > 0 || faturasExistentes > 0) {
            console.log(`  ✅ ${faturasSalvas} novas, ${faturasExistentes} existentes (${totalProcessadas} no Asaas)`);
          } else {
            console.log(`  ℹ️ Nenhuma fatura encontrada no Asaas para este cliente`);
          }
          
          if (result.erros && result.erros.length > 0) {
            console.log(`  ⚠️ Avisos:`, result.erros);
          }
        } else {
          erros++;
          const erroMsg = result.erros ? result.erros.join(', ') : result.error || 'Erro desconhecido';
          console.log(`  ❌ Erro: ${erroMsg}`);
        }
        
        // Delay de 1 segundo entre requisições para não sobrecarregar a API
        if (i < clientesValidos.length - 1) {
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
    console.log(`   - Clientes processados: ${clientesValidos.length}`);
    console.log(`   - Sucesso: ${sucesso}`);
    console.log(`   - Erros: ${erros}`);
    console.log(`   - Faturas novas importadas: ${totalFaturasSalvas}`);
    console.log(`   - Faturas já existentes: ${totalFaturasExistentes}`);
    console.log(`   - Total de faturas: ${totalFaturasSalvas + totalFaturasExistentes}`);
    console.log('');
    console.log('🔄 Recarregue a página financeiro para ver as faturas importadas.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
})();







