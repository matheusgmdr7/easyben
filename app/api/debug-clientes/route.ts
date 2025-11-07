import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Verificando clientes válidos para teste...")
    
    const { searchParams } = new URL(request.url)
    const administradoraId = searchParams.get('administradora_id') || 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'
    const clienteNome = searchParams.get('cliente_nome')
    
    // 1. Verificar estado do Marcus
    const { data: marcus, error: marcusError } = await supabase
      .from('clientes_administradoras')
      .select(`
        id,
        status,
        asaas_customer_id,
        integrar_asaas,
        criar_assinatura,
        data_vinculacao,
        created_at,
        proposta:propostas (
          nome,
          cpf,
          email,
          telefone
        )
      `)
      .eq('propostas.cpf', '04570423205')
      .single()

    if (marcusError && marcusError.code !== 'PGRST116') {
      console.error("❌ Erro ao buscar Marcus:", marcusError)
    }

    // 1.5 Buscar cliente específico por nome (se fornecido)
    let clienteEspecifico = null
    if (clienteNome) {
      const { data: clienteData, error: clienteError } = await supabase
        .from('propostas')
        .select(`
          id,
          nome,
          cpf,
          email,
          telefone,
          status,
          created_at
        `)
        .ilike('nome', `%${clienteNome}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!clienteError) {
        // Buscar vínculo com administradora
        const { data: vinculoData } = await supabase
          .from('clientes_administradoras')
          .select('*')
          .eq('proposta_id', clienteData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        clienteEspecifico = {
          proposta: clienteData,
          vinculo: vinculoData || null
        }
      }
    }

    // 2. Buscar clientes válidos para teste
    const { data: clientesValidos, error: clientesError } = await supabase
      .from('clientes_administradoras')
      .select(`
        id,
        status,
        asaas_customer_id,
        integrar_asaas,
        criar_assinatura,
        data_vinculacao,
        created_at,
        proposta:propostas (
          nome,
          cpf,
          email,
          telefone
        )
      `)
      .eq('administradora_id', administradoraId)
      .eq('status', 'ativo')
      .is('asaas_customer_id', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (clientesError) {
      console.error("❌ Erro ao buscar clientes válidos:", clientesError)
      throw clientesError
    }

    // 3. Resumo por status
    const { data: resumoStatus, error: resumoError } = await supabase
      .from('clientes_administradoras')
      .select('status, asaas_customer_id')
      .eq('administradora_id', administradoraId)

    if (resumoError) {
      console.error("❌ Erro ao buscar resumo:", resumoError)
      throw resumoError
    }

    // Processar resumo
    const resumo = resumoStatus?.reduce((acc: any, cliente: any) => {
      if (!acc[cliente.status]) {
        acc[cliente.status] = {
          total: 0,
          com_asaas: 0,
          sem_asaas: 0
        }
      }
      acc[cliente.status].total++
      if (cliente.asaas_customer_id) {
        acc[cliente.status].com_asaas++
      } else {
        acc[cliente.status].sem_asaas++
      }
      return acc
    }, {})

    console.log("✅ DEBUG: Dados encontrados")
    
    return NextResponse.json({
      success: true,
      marcus: marcus || null,
      clienteEspecifico: clienteEspecifico || null,
      clientesValidos: clientesValidos || [],
      resumoStatus: resumo || {},
      totalClientesValidos: clientesValidos?.length || 0
    })
  } catch (error) {
    console.error("❌ DEBUG: Erro:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 })
  }
}