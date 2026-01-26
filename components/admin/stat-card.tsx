import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"
    | "blue"
    | "green"
    | "emerald"
    | "indigo"
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = "neutral",
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-blue-50 text-blue-700 border border-blue-100",
    secondary: "bg-indigo-50 text-indigo-700 border border-indigo-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-red-50 text-red-700 border border-red-100",
    info: "bg-cyan-50 text-cyan-700 border border-cyan-100",
    neutral: "bg-gray-50 text-gray-700 border border-gray-100",
    blue: "bg-blue-50 text-blue-700 border border-blue-100",
    green: "bg-[#7BD9F6] bg-opacity-20 text-[#0F172A] border border-[#7BD9F6] border-opacity-20",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  }

  const trendClasses = {
    up: "text-gray-600",
    down: "text-gray-600",
    neutral: "text-gray-500",
  }

  const trendIcons = {
    up: "↗",
    down: "↘",
    neutral: "→",
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
          {description && <p className="text-sm text-gray-500 mb-2">{description}</p>}

          {trend && trendValue && (
            <div className={`flex items-center text-sm ${trendClasses[trend]}`}>
              <span className="mr-1">{trendIcons[trend]}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`p-3 rounded-full ${colorClasses[color]} flex-shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  )
}
