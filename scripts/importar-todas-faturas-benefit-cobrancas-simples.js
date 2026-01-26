// ============================================
// SCRIPT PARA IMPORTAR TODAS AS FATURAS DO ASAAS
// BENEFIT COBRANÇAS
// ============================================
// 
// INSTRUÇÕES:
// 1. Abra o console do navegador (F12) na página:
//    https://contratandoplanos.com.br/admin/administradoras/050be541-db3b-4d3c-be95-df80b68747f1
// 2. Cole este script completo
// 3. Pressione Enter
// ============================================

(async () => {
  const ADMINISTRADORA_ID = '050be541-db3b-4d3c-be95-df80b68747f1';
  
  console.log('🚀 Iniciando importação de TODAS as faturas do Asaas...');
  console.log('📋 Administradora: BENEFIT COBRANÇAS');
  console.log('');
  
  try {
    // 1. Primeiro, buscar todos os clientes do banco
    console.log('🔍 Passo 1: Buscando clientes no banco de dados...');
    
    // Buscar clientes usando a mesma lógica da página
    // Vamos buscar em lotes (páginas) para pegar todos
    let todosClientes = [];
    let pagina = 1;
    const limite = 100;
    let temMais = true;
    
    while (temMais) {
      try {
        // Usar fetch para buscar da API ou diretamente do Supabase se disponível
        // Como estamos no navegador, vamos usar uma abordagem diferente
        // Vamos buscar da página atual se estivermos na página de administradoras
        
        // Tentar buscar via API interna (se existir) ou usar o serviço diretamente
        const response = await fetch(`/api/admin/administradoras/${ADMINISTRADORA_ID}/clientes?pagina=${pagina}&limite=${limite}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const clientes = data.clientes || data.data || [];
          todosClientes = todosClientes.concat(clientes);
          
          console.log(`   📥 Página ${pagina}: ${clientes.length} clientes encontrados`);
          
          if (clientes.length < limite) {
            temMais = false;
          } else {
            pagina++;
          }
        } else {
          // Se a API não existir, vamos usar uma abordagem alternativa
          console.log('   ⚠️ API não disponível, usando método alternativo...');
          temMais = false;
        }
      } catch (error) {
        console.error('   ❌ Erro ao buscar página:', error);
        temMais = false;
      }
    }
    
    // Se não conseguiu buscar via API, vamos usar lista manual baseada no que sabemos
    if (todosClientes.length === 0) {
      console.log('   ⚠️ Não foi possível buscar via API.');
      console.log('   💡 Usando método direto: importar faturas por cliente conhecido...');
      
      // Cliente conhecido: KLEYTHYANY LACERDA NUNES
      todosClientes = [{
        id: '05be43ac-7534-47dc-ba40-bc2f9478bf33',
        cliente_nome: 'KLEYTHYANY LACERDA NUNES',
        cliente_cpf: '01432034448'
      }];
      
      console.log(`   ✅ Usando cliente conhecido: ${todosClientes[0].cliente_nome}`);
    }
    
    // Filtrar apenas clientes com CPF válido
    const clientesValidos = todosClientes.filter(c => {
      const cpf = (c.cliente_cpf || c.cpf || '').replace(/\D/g, '');
      return cpf.length >= 11;
    });
    
    console.log('');
    console.log(`📊 Total de clientes encontrados: ${todosClientes.length}`);
    console.log(`✅ Clientes com CPF válido: ${clientesValidos.length}`);
    console.log('');
    
    if (clientesValidos.length === 0) {
      console.log('❌ Nenhum cliente válido encontrado para importação.');
      alert('❌ Nenhum cliente válido encontrado. Verifique se há clientes cadastrados.');
      return;
    }
    
    // 2. Importar faturas para cada cliente
    console.log('🔍 Passo 2: Importando faturas do Asaas para cada cliente...');
    console.log('');
    
    let sucesso = 0;
    let erros = 0;
    let totalFaturasSalvas = 0;
    let totalFaturasExistentes = 0;
    let totalProcessadas = 0;
    
    for (let i = 0; i < clientesValidos.length; i++) {
      const cliente = clientesValidos[i];
      const clienteId = cliente.id || cliente.cliente_administradora_id;
      const clienteNome = cliente.cliente_nome || cliente.nome || 'Cliente sem nome';
      const clienteCpf = cliente.cliente_cpf || cliente.cpf || '';
      
      try {
        console.log(`[${i + 1}/${clientesValidos.length}] Processando: ${clienteNome} (CPF: ${clienteCpf})...`);
        
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
          const total = result.total_processadas || 0;
          
          totalFaturasSalvas += faturasSalvas;
          totalFaturasExistentes += faturasExistentes;
          totalProcessadas += total;
          sucesso++;
          
          if (faturasSalvas > 0 || faturasExistentes > 0) {
            console.log(`  ✅ ${faturasSalvas} novas, ${faturasExistentes} existentes (${total} no Asaas)`);
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
    console.log(`   - Total de faturas no Asaas: ${totalProcessadas}`);
    console.log(`   - Total de faturas no banco: ${totalFaturasSalvas + totalFaturasExistentes}`);
    console.log('');
    console.log('🔄 Recarregue a página financeiro para ver as faturas importadas.');
    console.log('');
    
    alert(`✅ Importação concluída!\n\n- Clientes: ${clientesValidos.length}\n- Sucesso: ${sucesso}\n- Erros: ${erros}\n- Faturas novas: ${totalFaturasSalvas}\n- Faturas existentes: ${totalFaturasExistentes}`);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    alert(`Erro: ${error.message}`);
  }
})();

