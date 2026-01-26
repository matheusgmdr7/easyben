"use client"

import { CustomButton } from "@/components/ui/custom-button"
import { ArrowRight, Users, Building, UserPlus } from "lucide-react"
import { useTenantTheme } from "@/components/tenant/tenant-theme-provider"

interface CotacaoTemplateProps {
  tenantSlug?: string
}

export default function CotacaoTemplate({ tenantSlug }: CotacaoTemplateProps) {
  const { theme } = useTenantTheme()
  const primaryColor = theme.colors.primary
  const secondaryColor = theme.colors.secondary

  // Obter configurações das seções
  const secoes = theme.config?.secoes || {}
  const hero = secoes.hero || {}
  const planos = secoes.planos || {}

  const cotacaoHref = tenantSlug ? `/${tenantSlug}/cotacao` : "/cotacao"
  const contatoHref = tenantSlug ? `/${tenantSlug}/contato` : "/contato"

  return (
    <>
      {/* Hero Section */}
      <section
        className="relative py-12 md:py-20 lg:py-28 overflow-hidden"
        style={{
          background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})`,
        }}
      >
        <div className="absolute inset-0 -skew-y-6 origin-top-left transform-gpu -translate-y-32 z-0 opacity-20"></div>
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-white">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                {hero.titulo || "Encontre o plano de saúde ideal para você e sua família"}
              </h1>
              <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white/90 leading-relaxed">
                {hero.subtitulo ||
                  `Compare preços e coberturas dos melhores planos de saúde do Brasil com ${theme.branding.nomeMarca}.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <CustomButton
                  href={cotacaoHref}
                  size="lg"
                  className="bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all"
                >
                  {hero.ctaTexto || "Faça sua cotação agora"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </CustomButton>
              </div>
            </div>
            <div className="block relative mt-8 md:mt-0">
              <div className="absolute -inset-0.5 bg-white/20 rounded-2xl blur-xl"></div>
              <img
                src={hero.imagem || "https://i.ibb.co/vvLp7GFD/Inserir-um-ti-tulo-3.png"}
                alt="Família feliz com plano de saúde"
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Os melhores planos de saúde Section */}
      {planos.mostrarOperadoras !== false && (
        <section className="py-10 md:py-16 bg-white">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6 text-gray-900">
              {planos.titulo || "Os melhores planos de saúde"}
            </h2>
            <p className="text-center text-gray-600 mb-8 md:mb-12 max-w-2xl mx-auto">
              {planos.descricao ||
                "Trabalhamos com as melhores operadoras de planos de saúde do mercado para oferecer as melhores opções para você."}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-8 items-center justify-items-center max-w-5xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow w-full h-16 md:h-24 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src="https://i.ibb.co/Jjm3N0rk/Design-sem-nome-4.png"
                    alt="SulAmérica"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow w-full h-16 md:h-24 overflow-hidden p-0">
                <img
                  src="https://i.ibb.co/LD2f2T3r/Porto-Saude.png"
                  alt="Porto Saúde"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: "center" }}
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow w-full h-16 md:h-24 overflow-hidden p-0">
                <img
                  src="https://i.ibb.co/ycmHb8Yx/Bradesco.png"
                  alt="Bradesco Saúde"
                  className="w-full h-full object-contain"
                  style={{ objectPosition: "center" }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Planos Section */}
      <section className="py-10 md:py-16 bg-gray-50">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
              Planos para todas as necessidades
            </h2>
            <p className="text-gray-600 text-base md:text-lg">
              Encontre o plano ideal para você, sua família ou sua empresa com condições especiais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6 text-white" style={{ backgroundColor: primaryColor }}>
                <h3 className="text-lg md:text-xl font-bold flex items-center">
                  <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Planos Individuais e Familiares
                </h3>
              </div>
              <div className="p-4 md:p-6">
                <p className="text-gray-600 mb-4 text-sm md:text-base">
                  Planos de saúde personalizados para você e sua família, com cobertura completa
                  para consultas, exames, internações e procedimentos médicos, garantindo
                  tranquilidade e bem-estar para todos.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6 text-white" style={{ backgroundColor: primaryColor }}>
                <h3 className="text-lg md:text-xl font-bold flex items-center">
                  <Building className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Planos Empresariais
                </h3>
              </div>
              <div className="p-4 md:p-6">
                <p className="text-gray-600 mb-4 text-sm md:text-base">
                  Soluções completas para empresas de todos os portes, com planos a partir de 2
                  vidas. Ofereça um benefício de qualidade aos seus colaboradores, aumentando a
                  satisfação e produtividade da sua equipe.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6 text-white" style={{ backgroundColor: primaryColor }}>
                <h3 className="text-lg md:text-xl font-bold flex items-center">
                  <UserPlus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Planos Coletivo por Adesão
                </h3>
              </div>
              <div className="p-4 md:p-6">
                <p className="text-gray-600 mb-4 text-sm md:text-base">
                  Planos de saúde destinados a entidades de classe, sindicatos e associações
                  profissionais. Beneficie-se de condições especiais e preços reduzidos por fazer
                  parte de um grupo específico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-12 md:py-20 text-white"
        style={{
          background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor || primaryColor})`,
        }}
      >
        <div className="container px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">
              Garanta sua saúde e bem estar
            </h2>
            <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white/90">
              Faça uma cotação gratuita e descubra as melhores opções de planos de saúde para você.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <CustomButton
                href={cotacaoHref}
                size="lg"
                className="bg-amber-500 text-white hover:bg-amber-600 rounded-full font-bold shadow-lg transform hover:scale-105 transition-all"
              >
                Fazer cotação gratuita
              </CustomButton>
              <CustomButton
                href={contatoHref}
                size="lg"
                className="bg-white hover:bg-white/90 rounded-full font-medium"
                style={{ color: primaryColor }}
              >
                Falar com um consultor
              </CustomButton>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

