import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
  try {
    console.log('🔧 Verificando constraint atual...');

    // Primeiro, vamos verificar quais valores de status existem
    const { data: faturas, error: selectError } = await supabaseAdmin
      .from('faturas')
      .select('status')
      .limit(10);

    if (selectError) {
      console.error('❌ Erro ao consultar faturas:', selectError.message);
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    console.log('📊 Status encontrados:', [...new Set(faturas?.map(f => f.status))]);

    // Como não podemos executar ALTER TABLE diretamente, vamos verificar se as faturas com status "paga" podem ser inseridas
    // Vamos tentar inserir uma fatura de teste com status "paga"
    const { data: testFatura, error: testError } = await supabaseAdmin
      .from('faturas')
      .insert({
        cliente_id: 'teste',
        cliente_nome: 'Teste',
        cliente_email: 'teste@teste.com',
        valor: 100,
        vencimento: '2025-12-31',
        status: 'paga',
        administradora_id: 'a7b5b2d5-0e8f-4905-8917-4b95dc98d20f'
      })
      .select()
      .single();

    if (testError) {
      console.log('⚠️ Erro ao inserir fatura de teste:', testError.message);
      
      // Se o erro for de constraint, significa que precisamos alterar a constraint
      if (testError.message.includes('faturas_status_check')) {
        return NextResponse.json({ 
          error: 'Constraint precisa ser alterada manualmente no banco',
          constraint_error: testError.message,
          suggestion: 'Execute no banco: ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_status_check; ALTER TABLE faturas ADD CONSTRAINT faturas_status_check CHECK (status IN (\'pendente\', \'paga\', \'atrasada\', \'cancelada\', \'vencida\'));'
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: testError.message }, { status: 500 });
    }

    // Se chegou aqui, a constraint já aceita "paga"
    console.log('✅ Constraint já aceita status "paga"');
    
    // Remover a fatura de teste
    await supabaseAdmin
      .from('faturas')
      .delete()
      .eq('id', testFatura.id);

    return NextResponse.json({ success: true, message: 'Constraint já está correta!' });

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}