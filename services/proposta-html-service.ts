/**
 * Serviço para geração de HTML para propostas
 */
export class PropostaHTMLService {
  /**
   * Gera o HTML para uma proposta
   * @param proposta Dados da proposta
   * @param dependentes Lista de dependentes
   * @param questionario Respostas do questionário de saúde
   * @param incluirDeclaracao Se deve incluir a declaração e campos de assinatura
   * @returns HTML formatado da proposta
   */
  static generatePropostaHTML(
    proposta: any,
    dependentes: any[] = [],
    questionario: any[] = [],
    incluirDeclaracao = false,
  ): string {
    if (!proposta) {
      console.error("Dados da proposta não fornecidos para geração de HTML")
      return "<p>Erro: Dados da proposta não disponíveis</p>"
    }

    try {
      // Debug: Log dos dados da proposta para verificar os campos
      console.log("🔍 Dados da proposta para HTML:", proposta)

      // Formatar data
      const formatarData = (dataString: string) => {
        if (!dataString) return "N/A"
        try {
          const data = new Date(dataString)
          return data.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        } catch (e) {
          console.error("Erro ao formatar data:", e)
          return dataString || "N/A"
        }
      }

      // Formatar moeda
      const formatarMoeda = (valor: any) => {
        try {
          if (!valor) return "R$ 0,00"

          // Se for string, converter para número
          let valorNumerico = valor
          if (typeof valor === "string") {
            valorNumerico = Number.parseFloat(valor.replace(/[^\d,]/g, "").replace(",", "."))
          }

          if (isNaN(valorNumerico)) return "R$ 0,00"

          return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(valorNumerico)
        } catch (e) {
          console.error("Erro ao formatar moeda:", e)
          return "R$ 0,00"
        }
      }

      // Escapar HTML para evitar XSS
      const escapeHtml = (unsafe: string) => {
        if (!unsafe) return ""
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      }

      // Função para obter valor do campo com fallbacks
      const obterValorCampo = (campo: string, ...fallbacks: string[]) => {
        const valor = proposta[campo]
        if (valor && valor !== "" && valor !== null && valor !== undefined) {
          console.log(`✅ Campo ${campo} encontrado:`, valor)
          return valor
        }

        for (const fallback of fallbacks) {
          const valorFallback = proposta[fallback]
          if (valorFallback && valorFallback !== "" && valorFallback !== null && valorFallback !== undefined) {
            console.log(`✅ Campo ${fallback} (fallback) encontrado:`, valorFallback)
            return valorFallback
          }
        }

        console.log(`❌ Nenhum valor encontrado para ${campo} ou fallbacks:`, fallbacks)
        return "N/A"
      }

      // CSS melhorado e responsivo
      const styles = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 100%;
          margin: 0 auto;
          padding: 0;
          background-color: #f8f9fa;
        }
        
        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          margin: 0 auto;
          width: 100%;
        }
        
        .header {
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          color: white;
          padding: 25px 20px;
          text-align: center;
        }
        
        .header h1 {
          margin: 0 0 10px 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .header p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }
        
        .content {
          padding: 20px;
        }
        
        .section {
          margin-bottom: 30px;
          border-bottom: 1px solid #e9ecef;
          padding-bottom: 20px;
        }
        
        .section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .section-title {
          color: #0F172A;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #0F172A;
          display: inline-block;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 15px;
        }
        
        .info-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #0F172A;
        }
        
        .info-label {
          font-weight: 600;
          color: #495057;
          font-size: 13px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          color: #212529;
          font-size: 15px;
          word-break: break-word;
        }
        
        .table-container {
          overflow-x: auto;
          margin-top: 15px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          font-size: 14px;
        }
        
        th {
          background: #0F172A;
          color: white;
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #e9ecef;
          vertical-align: top;
        }
        
        tr:last-child td {
          border-bottom: none;
        }
        
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        .highlight-value {
          background: #e8f5e8;
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 600;
          color: #0F172A;
          display: inline-block;
        }
        
        .no-data {
          text-align: center;
          color: #6c757d;
          font-style: italic;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 2px dashed #dee2e6;
        }
        
        .declaracao {
          margin-top: 30px;
          padding: 20px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .assinatura-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin-top: 30px;
        }
        
        .assinatura-campo {
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #333;
        }
        
        .valor-total {
          border: 2px solid #0F172A;
          background: #e8f5e8;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .valor-total .info-label {
          color: #0F172A;
          font-weight: bold;
          font-size: 14px;
        }
        
        .valor-total .info-value {
          color: #0F172A;
          font-weight: bold;
          font-size: 18px;
        }
        
        /* Responsividade */
        @media (min-width: 640px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .assinatura-container {
            grid-template-columns: 1fr 1fr;
          }
          
          .content {
            padding: 30px;
          }
          
          .header {
            padding: 30px;
          }
          
          .header h1 {
            font-size: 28px;
          }
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 800px;
          }
          
          .info-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }
        }
      </style>
    `

      // Gerar HTML para os dependentes
      console.log("🔍 Gerando HTML para dependentes:", dependentes)

      const dependentesHTML =
        dependentes && dependentes.length > 0
          ? `
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Data de Nascimento</th>
          <th>Parentesco</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${dependentes
          .map((dep, index) => {
            const valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
            console.log(`🔍 Dependente ${index + 1} para tabela:`, {
              nome: dep.nome,
              cpf: dep.cpf,
              data_nascimento: dep.data_nascimento,
              parentesco: dep.parentesco,
              valor: valorDep,
            })

            return `
          <tr>
            <td>${escapeHtml(dep.nome || `Dependente ${index + 1}`)}</td>
            <td>${escapeHtml(dep.cpf || "N/A")}</td>
            <td>${formatarData(dep.data_nascimento)}</td>
            <td>${escapeHtml(dep.parentesco || "N/A")}</td>
            <td>${formatarMoeda(valorDep)}</td>
          </tr>
        `
          })
          .join("")}
      </tbody>
    </table>
  </div>
`
          : '<div class="no-data">Nenhum dependente incluído nesta proposta</div>'

      // Gerar HTML para o questionário de saúde
      const questionarioHTML =
        questionario && questionario.length
          ? `
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Pergunta</th>
                <th>Resposta</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              ${questionario
                .map(
                  (q) => `
                <tr>
                  <td>${escapeHtml(q.pergunta || "")}</td>
                  <td><span class="highlight-value">${escapeHtml(q.resposta || "")}</span></td>
                  <td>${escapeHtml(q.observacao || "-")}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
          : '<div class="no-data">Nenhuma informação de saúde reportada</div>'

      // Declaração e assinatura (opcional)
      const declaracaoHTML = incluirDeclaracao
        ? `
        <div class="declaracao">
          <p><strong>Declaração:</strong> Declaro que as informações prestadas nesta proposta são verdadeiras e estou ciente que a omissão de informações pode resultar no cancelamento do contrato.</p>
          
          <div class="assinatura-container">
            <div class="assinatura-campo">
              <p><strong>Assinatura do Titular</strong></p>
            </div>
            <div class="assinatura-campo">
              <p><strong>Data: ___/___/______</strong></p>
            </div>
          </div>
        </div>
      `
        : ""

      // Obter valores dos campos com fallbacks
      const plano = obterValorCampo("sigla_plano", "codigo_plano", "plano")
      const cobertura = obterValorCampo("cobertura", "tipo_cobertura")
      const acomodacao = obterValorCampo("acomodacao", "tipo_acomodacao")
      const valorTitular = obterValorCampo("valor", "valor_plano")
      const nome = obterValorCampo("nome", "nome_cliente")

      console.log("🔍 Debug valores:", {
        valorTitular,
        dependentes: dependentes?.length || 0,
        dependentesData: dependentes,
      })

      // Calcular valor total
      let valorTotal = 0

      // Converter valor do titular para número
      if (valorTitular && valorTitular !== "N/A") {
        const valorTitularNum =
          typeof valorTitular === "string"
            ? Number.parseFloat(valorTitular.replace(/[^\d,]/g, "").replace(",", "."))
            : Number(valorTitular)

        if (!isNaN(valorTitularNum)) {
          valorTotal += valorTitularNum
          console.log("✅ Valor titular adicionado:", valorTitularNum)
        }
      }

      // Adicionar valores dos dependentes
      if (dependentes && dependentes.length > 0) {
        console.log("🔍 Processando dependentes:", dependentes)
        dependentes.forEach((dep, index) => {
          // Tentar diferentes campos para o valor do dependente
          const valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
          console.log(`🔍 Dependente ${index + 1} (${dep.nome}):`, {
            valor_individual: dep.valor_individual,
            valor: dep.valor,
            valor_plano: dep.valor_plano,
            valorUsado: valorDep,
          })

          if (valorDep) {
            const valorDepNum =
              typeof valorDep === "string"
                ? Number.parseFloat(valorDep.replace(/[^\d,]/g, "").replace(",", "."))
                : Number(valorDep)

            if (!isNaN(valorDepNum) && valorDepNum > 0) {
              valorTotal += valorDepNum
              console.log(`✅ Valor dependente ${dep.nome} adicionado:`, valorDepNum)
            }
          }
        })
      }

      console.log("💰 Valor total calculado:", valorTotal)

      // Montar o HTML completo da proposta
      return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumo da Proposta</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Resumo da Proposta</h1>
            <p>Proposta #${escapeHtml(proposta.id || "")} • ${formatarData(proposta.created_at)}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2 class="section-title">Informações do Plano</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Plano</div>
                  <div class="info-value">${escapeHtml(plano)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Cobertura</div>
                  <div class="info-value">${escapeHtml(cobertura)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Acomodação</div>
                  <div class="info-value">${escapeHtml(acomodacao)}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Dados do Titular</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Nome Completo</div>
                  <div class="info-value">${escapeHtml(nome)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">CPF</div>
                  <div class="info-value">${escapeHtml(proposta.cpf || "N/A")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">RG</div>
                  <div class="info-value">${escapeHtml(proposta.rg || "N/A")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Data de Nascimento</div>
                  <div class="info-value">${formatarData(proposta.data_nascimento)}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value">${escapeHtml(proposta.email || "N/A")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Telefone</div>
                  <div class="info-value">${escapeHtml(proposta.telefone || "N/A")}</div>
                </div>
              </div>
              
              <h3 style="color: #0F172A; margin-top: 20px; margin-bottom: 12px; font-size: 16px;">Endereço</h3>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Logradouro</div>
                  <div class="info-value">${escapeHtml(proposta.endereco || "N/A")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Cidade/UF</div>
                  <div class="info-value">${escapeHtml(proposta.cidade || "N/A")}/${escapeHtml(proposta.estado || "N/A")}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">CEP</div>
                  <div class="info-value">${escapeHtml(proposta.cep || "N/A")}</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Detalhamento dos Valores</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Valor do Titular</div>
                  <div class="info-value">${formatarMoeda(valorTitular)}</div>
                </div>
                ${
                  dependentes && dependentes.length > 0
                    ? dependentes
                        .map((dep, index) => {
                          const valorDep = dep.valor_individual || dep.valor || dep.valor_plano || 0
                          return `
        <div class="info-item">
          <div class="info-label">Valor ${dep.nome ? dep.nome.split(" ")[0] : `Dependente ${index + 1}`}</div>
          <div class="info-value">${formatarMoeda(valorDep)}</div>
        </div>
      `
                        })
                        .join("")
                    : `
    <div class="info-item">
      <div class="info-label">Dependentes</div>
      <div class="info-value">Nenhum dependente incluído</div>
    </div>
    `
                }
              </div>
              
              <div class="valor-total">
                <div class="info-label">VALOR TOTAL MENSAL</div>
                <div class="info-value">${formatarMoeda(valorTotal)}</div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Dependentes</h2>
              ${dependentesHTML}
            </div>
            
            <div class="section">
              <h2 class="section-title">Dados de Saúde</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Peso</div>
                  <div class="info-value">${escapeHtml(proposta.peso || "N/A")} kg</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Altura</div>
                  <div class="info-value">${escapeHtml(proposta.altura || "N/A")} cm</div>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Questionário de Saúde</h2>
              ${questionarioHTML}
            </div>
            
            ${declaracaoHTML}
          </div>
        </div>
      </body>
      </html>
    `
    } catch (error) {
      console.error("Erro ao gerar HTML da proposta:", error)
      return `
      <div style="color: red; text-align: center; padding: 20px;">
        <h2>Erro ao gerar resumo da proposta</h2>
        <p>Ocorreu um erro ao processar os dados. Por favor, tente novamente ou entre em contato com o suporte.</p>
        <p>Detalhes do erro: ${error.message || "Erro desconhecido"}</p>
      </div>
    `
    }
  }
}
