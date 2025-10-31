'use client'

import { useState, useRef, MouseEvent, memo } from 'react'
import { cn } from '@/lib/utils'

interface GlowingButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export const GlowingButton = memo(function GlowingButton({
  children,
  href,
  onClick,
  className,
  disabled = false
}: GlowingButtonProps) {
  const [glowPosition, setGlowPosition] = useState(0)
  const buttonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const centerX = rect.width / 2
    const offset = x - centerX

    // Limitar o movimento do brilho
    const maxOffset = rect.width / 3
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset))

    setGlowPosition(clampedOffset)
  }

  const handleMouseLeave = () => {
    setGlowPosition(0)
  }

  const Component = href ? 'a' : 'button'

  const commonProps = {
    ref: buttonRef as any,
    className: cn(
      "uppercase font-bold flex items-center justify-center h-10 px-16 text-12 relative z-10",
      "overflow-hidden rounded-full border border-white/60 bg-[#d1d1d1]",
      "transition-all duration-200",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105",
      className
    ),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onClick: disabled ? undefined : onClick,
    ...(href && !disabled ? { href } : {}),
  }

  return (
    <div className="relative inline-flex items-center z-10">
      {/* Efeito de Brilho na Borda */}
      <div className="absolute left-1/2 top-1/2 h-[calc(100%+9px)] w-[calc(100%+9px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative h-full w-full rounded-full animate-border-light bg-gradient-to-r from-transparent via-orange/50 to-transparent"></div>
      </div>

      {/* @ts-ignore */}
      <Component {...commonProps}>
        {/* Efeito de Brilho Interno (Mouse Follow) */}
        <div
          className="absolute -z-10 flex w-[204px] items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${glowPosition}px)` }}
        >
          {/* Glow 1: Base laranja/amarela */}
          <div className="absolute top-1/2 h-[121px] w-[121px] -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,#FFFFF5_3.5%,#FFAA81_26.5%,#FFDA9F_37.5%,rgba(255,170,129,0.50)_49%,rgba(210,106,58,0.00)_92.5%)]"></div>
          {/* Glow 2: Luz branca suave com blur */}
          <div className="absolute top-1/2 h-[103px] w-[204px] -translate-y-1/2 bg-[radial-gradient(43.3%_44.23%_at_50%_49.51%,#FFFFF7_29%,#FFFACD_48.5%,#F4D2BF_60.71%,rgba(214,211,210,0.00)_100%)] blur-[5px]"></div>
        </div>

        {/* Conteúdo do Botão */}
        <span className="text-[#5A250A] z-10 relative flex items-center gap-1.5">
          {children}
        </span>
      </Component>
    </div>
  )
});

// Ícone de seta (arrow right) para usar com o botão
export const ArrowRightIcon = memo(function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 17 9"
      className={cn("h-[9px] w-[17px]", className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="m12.495 0 4.495 4.495-4.495 4.495-.99-.99 2.805-2.805H0v-1.4h14.31L11.505.99z"
        clipRule="evenodd"
      />
    </svg>
  )
});
