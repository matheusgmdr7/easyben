"use client"

import { Settings } from "lucide-react"

interface DashboardPreview {
  title: string
  type: "corretor" | "admin" | "gestor" | "analista" | "administradora"
  stats: Array<{ label: string; value: string }>
  chart?: boolean
  table?: boolean
  list?: boolean
}

const dashboards: DashboardPreview[] = [
  {
    title: "Portal do Corretor",
    type: "corretor",
    stats: [
      { label: "Propostas Enviadas", value: "24" },
      { label: "Propostas Aprovadas", value: "18" },
      { label: "Clientes Ativos", value: "15" },
    ],
    chart: true,
    list: true,
  },
  {
    title: "Portal Administrativo",
    type: "admin",
    stats: [
      { label: "Leads Recebidos", value: "150+" },
      { label: "Propostas Recebidas", value: "89" },
      { label: "Propostas Aprovadas", value: "67" },
      { label: "Corretores Ativos", value: "42" },
    ],
    chart: true,
    list: true,
  },
  {
    title: "Portal do Gestor",
    type: "gestor",
    stats: [
      { label: "Equipe", value: "8" },
      { label: "Propostas da Equipe", value: "156" },
      { label: "Aprovadas", value: "124" },
    ],
    chart: true,
    list: true,
  },
  {
    title: "Portal do Analista",
    type: "analista",
    stats: [
      { label: "Em Análise", value: "12" },
      { label: "Aguardando Cadastro", value: "8" },
    ],
    table: true,
    list: true,
  },
]

export default function StackedDashboards() {
  return (
    <div className="relative w-full h-full min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center justify-center">
      {/* Container dos dashboards empilhados */}
      <div className="relative w-full max-w-4xl h-[500px]">
        {dashboards.map((dashboard, index) => {
          // O último dashboard (index 0) mostra completo, os outros mostram apenas uma parte
          const isFull = index === dashboards.length - 1
          // Offset horizontal para empilhamento lateral - ajustado para melhor visualização
          const offsetX = (dashboards.length - 1 - index) * 50
          const scale = 1 // Todos com mesmo tamanho
          const zIndex = index + 1
          const opacity = isFull ? 1 : Math.max(0.5, 0.8 - index * 0.15)

          return (
            <div
              key={index}
              className="absolute"
              style={{
                left: `${offsetX}px`,
                top: '50%',
                transform: `translateY(-50%)`,
                zIndex,
                opacity,
                width: '100%',
                maxWidth: '400px',
              }}
            >
              {/* Responsive: Em telas menores, mostrar apenas o último dashboard */}
              <div className="hidden lg:block w-full">
                <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden transform hover:scale-[1.02] transition-all duration-500 w-full max-w-[400px]">
                {/* Dashboard Header */}
                <div className="bg-white border-b border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    </div>
                    {/* Logo do Cliente */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <div className="text-gray-400 text-[8px] font-semibold text-center px-1">
                          LOGO
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-0 border-b border-gray-200">
                    <div className="px-2.5 py-1 bg-[#1E293B] text-white text-[9px] font-semibold border-b-2 border-[#1E293B]">
                      {dashboard.title.split(" ")[1] || "Dashboard"}
                    </div>
                    <div className="px-2.5 py-1 text-gray-600 text-[9px] font-medium hover:bg-gray-50 transition-colors">
                      Analytics
                    </div>
                    <div className="px-2.5 py-1 text-gray-600 text-[9px] font-medium hover:bg-gray-50 transition-colors">
                      Reports
                    </div>
                  </div>
                </div>

                {/* Dashboard Content - Design único para cada página */}
                <div className="p-3 bg-gray-50">
                  {/* Último dashboard (mais visível) - Dashboard com gráfico melhorado */}
                  {isFull && (
                    <>
                      {/* Stats Grid - Melhorado */}
                      <div className={`grid gap-3 mb-4 ${dashboard.stats.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {dashboard.stats.map((stat, statIndex) => (
                          <div
                            key={statIndex}
                            className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-gray-300 hover:scale-[1.02]"
                          >
                            <div className="text-[10px] text-gray-500 font-medium mb-1.5 uppercase tracking-wide" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                              {stat.label}
                            </div>
                            <div className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                              {stat.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Chart Area - Melhorado para dashboard da frente */}
                      {dashboard.chart && (
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm mb-4">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-800" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          {dashboard.type === "corretor" ? "Performance Mensal" : dashboard.type === "admin" ? "Desempenho 6 Meses" : "Performance da Equipe"}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#64748B]"></div>
                            <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>2024</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#CBD5E1]"></div>
                            <span className="text-xs text-gray-600 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>2023</span>
                          </div>
                        </div>
                      </div>
                      {/* Gráfico de Linha - Melhorado */}
                      <div className="h-32 relative">
                        <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                          {/* Grid lines suaves */}
                          <line x1="0" y1="25" x2="200" y2="25" stroke="#f3f4f6" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="200" y2="50" stroke="#f3f4f6" strokeWidth="0.5" />
                          <line x1="0" y1="75" x2="200" y2="75" stroke="#f3f4f6" strokeWidth="0.5" />
                          
                          {/* Linha 2024 - Cor suave */}
                          <polyline
                            points="0,60 25,50 50,55 75,30 100,40 125,20 150,25 175,15 200,20"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            className="hover:stroke-[#64748B] transition-colors"
                          />
                          
                          {/* Linha 2023 - Cor mais suave */}
                          <polyline
                            points="0,70 25,65 50,70 75,55 100,60 125,50 150,55 175,45 200,50"
                            fill="none"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            strokeDasharray="3,3"
                          />
                          
                          {/* Pontos na linha 2024 */}
                          {[
                            { x: 0, y: 60 },
                            { x: 25, y: 50 },
                            { x: 50, y: 55 },
                            { x: 75, y: 30 },
                            { x: 100, y: 40 },
                            { x: 125, y: 20 },
                            { x: 150, y: 25 },
                            { x: 175, y: 15 },
                            { x: 200, y: 20 },
                          ].map((point, i) => (
                            <circle
                              key={i}
                              cx={point.x}
                              cy={point.y}
                              r="2"
                              fill="#94a3b8"
                              className="hover:fill-[#64748B] transition-colors"
                            />
                          ))}
                        </svg>
                      </div>
                      {/* Chart Labels - Melhorado */}
                      <div className="flex justify-between mt-3 pt-2 border-t border-gray-200">
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'].map((month, i) => (
                          <span key={i} className="text-[10px] text-gray-600 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {month}
                          </span>
                        ))}
                      </div>
                    </div>
                      )}

                      {/* Recent Activity - Melhorado */}
                      {dashboard.list && (
                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-4 border border-gray-200 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                            {dashboard.type === "corretor" ? "Últimas Propostas" : dashboard.type === "admin" ? "Corretores Recentes" : dashboard.type === "gestor" ? "Equipe" : "Atividade Recente"}
                          </h4>
                          <div className="space-y-2.5">
                            {[
                              dashboard.type === "corretor" ? "Nova proposta enviada" : dashboard.type === "admin" ? "Novo corretor cadastrado" : dashboard.type === "gestor" ? "Novo membro na equipe" : "Proposta aprovada",
                              dashboard.type === "corretor" ? "Proposta aprovada" : dashboard.type === "admin" ? "5 propostas aprovadas" : dashboard.type === "gestor" ? "Meta mensal atingida" : "Cliente cadastrado",
                              dashboard.type === "corretor" ? "Comissão recebida" : dashboard.type === "admin" ? "Relatório gerado" : dashboard.type === "gestor" ? "Relatório de equipe" : "Análise concluída",
                            ].map((activity, i) => (
                              <div key={i} className="flex items-center justify-between p-2.5 bg-white rounded-md border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-[#64748B]" : i === 1 ? "bg-[#94A3B8]" : "bg-[#CBD5E1]"} flex-shrink-0`}></div>
                                  <span className="text-xs text-gray-700 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                                    {activity}
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                                  {i === 0 ? "2h" : i === 1 ? "5h" : "1d"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Dashboard 1 (Analista) - Página de Tabela de Propostas */}
                  {!isFull && dashboard.type === "analista" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-700" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          Propostas em Análise
                        </h3>
                        <span className="text-[8px] text-gray-500">12 itens</span>
                      </div>
                      <div className="bg-white rounded-md border border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full text-[8px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Cliente</th>
                                <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Status</th>
                                <th className="px-2 py-1.5 text-left text-gray-600 font-semibold">Data</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { cliente: "João Silva", status: "Em Análise", data: "15/01" },
                                { cliente: "Maria Santos", status: "Pendente", data: "14/01" },
                                { cliente: "Pedro Costa", status: "Em Análise", data: "13/01" },
                                { cliente: "Ana Lima", status: "Aprovada", data: "12/01" },
                              ].map((row, i) => (
                                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-2 py-1.5 text-gray-700">{row.cliente}</td>
                                  <td className="px-2 py-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] ${
                                      row.status === "Aprovada" ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]" :
                                      row.status === "Em Análise" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-gray-100 text-gray-800"
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-gray-500">{row.data}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dashboard 2 (Gestor) - Página de Lista de Equipe */}
                  {!isFull && dashboard.type === "gestor" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-700" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          Minha Equipe
                        </h3>
                        <span className="text-[8px] text-gray-500">8 membros</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { nome: "Carlos Mendes", propostas: "24", status: "Ativo" },
                          { nome: "Fernanda Alves", propostas: "18", status: "Ativo" },
                          { nome: "Roberto Lima", propostas: "15", status: "Ativo" },
                          { nome: "Juliana Souza", propostas: "12", status: "Ativo" },
                        ].map((membro, i) => (
                          <div key={i} className="bg-white rounded-md p-2 border border-gray-200 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-[7px] font-semibold text-gray-600">{membro.nome.split(" ")[0][0]}{membro.nome.split(" ")[1]?.[0] || ""}</span>
                                </div>
                                <div>
                                  <div className="text-[9px] font-semibold text-gray-800">{membro.nome}</div>
                                  <div className="text-[8px] text-gray-500">{membro.propostas} propostas</div>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 bg-[#7BD9F6] bg-opacity-30 text-[#0F172A] rounded text-[7px]">{membro.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dashboard 3 (Admin) - Página de Grid de Cards */}
                  {!isFull && dashboard.type === "admin" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-700" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          Gestão de Corretores
                        </h3>
                        <span className="text-[8px] text-gray-500">42 ativos</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { nome: "Lucas", email: "lucas@email.com", status: "Ativo" },
                          { nome: "Patricia", email: "patricia@email.com", status: "Ativo" },
                          { nome: "Marcos", email: "marcos@email.com", status: "Pendente" },
                          { nome: "Sandra", email: "sandra@email.com", status: "Ativo" },
                        ].map((corretor, i) => (
                          <div key={i} className="bg-white rounded-md p-2 border border-gray-200 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-[7px] font-semibold text-gray-600">{corretor.nome[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[8px] font-semibold text-gray-800 truncate">{corretor.nome}</div>
                                <div className="text-[7px] text-gray-500 truncate">{corretor.email}</div>
                              </div>
                            </div>
                            <span className={`px-1 py-0.5 rounded text-[7px] ${
                              corretor.status === "Ativo" ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]" : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {corretor.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dashboard 4 (Corretor) - Página de Lista de Propostas */}
                  {!isFull && dashboard.type === "corretor" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold text-gray-700" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                          Minhas Propostas
                        </h3>
                        <span className="text-[8px] text-gray-500">24 enviadas</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { cliente: "Cliente A", plano: "Plano Premium", status: "Aprovada", valor: "R$ 450" },
                          { cliente: "Cliente B", plano: "Plano Básico", status: "Em Análise", valor: "R$ 280" },
                          { cliente: "Cliente C", plano: "Plano Standard", status: "Aprovada", valor: "R$ 350" },
                        ].map((proposta, i) => (
                          <div key={i} className="bg-white rounded-md p-2 border border-gray-200 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-semibold text-gray-800 truncate">{proposta.cliente}</div>
                                <div className="text-[8px] text-gray-500 truncate">{proposta.plano}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[9px] font-semibold text-gray-800">{proposta.valor}</div>
                                <span className={`px-1.5 py-0.5 rounded text-[7px] ${
                                  proposta.status === "Aprovada" ? "bg-[#7BD9F6] bg-opacity-30 text-[#0F172A]" : "bg-yellow-100 text-yellow-800"
                                }`}>
                                  {proposta.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table Area - Removido, agora cada dashboard tem seu design */}
                  {false && dashboard.table && (
                    <div className="bg-white rounded-md p-2.5 border border-gray-200 shadow-sm mb-2.5">
                      <h3 className="text-[10px] font-semibold text-gray-700 mb-2" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        Propostas em Análise
                      </h3>
                      <div className="space-y-1">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-[8px]">
                            <span className="text-gray-700">Cliente {i}</span>
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[7px]">Em Análise</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Activity - Apenas no último dashboard */}
                  {isFull && dashboard.list && (
                    <div className="bg-white rounded-md p-2.5 border border-gray-200">
                      <h4 className="text-[9px] font-semibold text-gray-700 mb-1.5 pb-1 border-b border-gray-200" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                        {dashboard.type === "corretor" ? "Últimas Propostas" : dashboard.type === "admin" ? "Corretores Recentes" : dashboard.type === "gestor" ? "Equipe" : "Atividade Recente"}
                      </h4>
                      <div className="space-y-1.5">
                        {[
                          dashboard.type === "corretor" ? "Nova proposta enviada" : dashboard.type === "admin" ? "Novo corretor cadastrado" : dashboard.type === "gestor" ? "Novo membro na equipe" : "Proposta aprovada",
                          dashboard.type === "corretor" ? "Proposta aprovada" : dashboard.type === "admin" ? "5 propostas aprovadas" : dashboard.type === "gestor" ? "Meta mensal atingida" : "Cliente cadastrado",
                          dashboard.type === "corretor" ? "Comissão recebida" : dashboard.type === "admin" ? "Relatório gerado" : dashboard.type === "gestor" ? "Relatório de equipe" : "Análise concluída",
                        ].map((activity, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[9px] py-0.5">
                            <div className={`w-1 h-1 rounded-full ${i === 0 ? "bg-gray-400" : i === 1 ? "bg-gray-300" : "bg-gray-400"} flex-shrink-0`}></div>
                            <span className="text-gray-600 flex-1 font-medium truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {activity}
                            </span>
                            <span className="text-gray-400 text-[8px]" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {i === 0 ? "2h" : i === 1 ? "5h" : "1d"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          )
        })}
        
        {/* Dashboard único para mobile/tablet - mostrar apenas o último */}
        <div className="lg:hidden absolute inset-0">
          {dashboards.slice(-1).map((dashboard, index) => (
            <div key={`mobile-${index}`} className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 overflow-hidden w-full h-full">
              {/* Dashboard Header */}
              <div className="bg-white border-b border-gray-200 px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                      <div className="text-gray-400 text-[8px] font-semibold text-center px-1">
                        LOGO
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-0 border-b border-gray-200">
                  <div className="px-2.5 py-1 bg-[#1E293B] text-white text-[9px] font-semibold border-b-2 border-[#1E293B]">
                    {dashboard.title.split(" ")[1] || "Dashboard"}
                  </div>
                  <div className="px-2.5 py-1 text-gray-600 text-[9px] font-medium hover:bg-gray-50 transition-colors">
                    Analytics
                  </div>
                  <div className="px-2.5 py-1 text-gray-600 text-[9px] font-medium hover:bg-gray-50 transition-colors">
                    Reports
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-3 bg-gray-50">
                <div className={`grid gap-2 mb-3 ${dashboard.stats.length === 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {dashboard.stats.map((stat, statIndex) => (
                    <div
                      key={statIndex}
                      className="bg-white rounded-md p-2 border border-gray-200 shadow-sm"
                    >
                      <div className="text-[9px] text-gray-500 font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                        {stat.label}
                      </div>
                      <div className="text-lg font-bold text-gray-800" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/15 via-gray-900/8 to-transparent rounded-lg blur-2xl -z-10 transform translate-y-6 translate-x-2"></div>
    </div>
  )
}





