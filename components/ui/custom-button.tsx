import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "destructive" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
  href?: string
  className?: string
}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, href, children, ...props }, ref) => {
    // Definir classes base para todos os botões
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none"

    // Definir classes para variantes
    const variantStyles = {
      default: "bg-[#0F172A] text-white hover:bg-[#1E293B]",
      primary: "bg-[#0F172A] text-white hover:bg-[#1E293B]",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
      outline: "border border-[#0F172A] text-[#0F172A] bg-transparent hover:bg-[#0F172A] hover:text-white",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      ghost: "bg-transparent hover:bg-gray-100",
      link: "text-[#0F172A] underline-offset-4 hover:underline bg-transparent",
    }

    // Definir classes para tamanhos
    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm rounded-md",
      sm: "h-9 px-3 py-1.5 text-xs rounded-md",
      lg: "h-11 px-8 py-2.5 text-base rounded-md",
      icon: "h-10 w-10 p-2 rounded-md",
    }

    // Combinar todas as classes
    const buttonClasses = cn(baseStyles, variantStyles[variant], sizeStyles[size], className)

    // Se tiver href, renderizar como Link
    if (href) {
      return (
        <Link href={href} className={buttonClasses}>
          {children}
        </Link>
      )
    }

    // Caso contrário, renderizar como button
    return (
      <button className={buttonClasses} ref={ref} {...props}>
        {children}
      </button>
    )
  },
)

CustomButton.displayName = "CustomButton"

export { CustomButton }
