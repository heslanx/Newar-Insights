'use client'

import { cn } from '@/lib/utils'

interface OutlineButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  disabled?: boolean
  variant?: 'default' | 'blue' | 'danger'
  type?: 'button' | 'submit' | 'reset'
}

export function OutlineButton({
  children,
  href,
  onClick,
  className,
  disabled = false,
  variant = 'default',
  type = 'button'
}: OutlineButtonProps) {
  const Component = href ? 'a' : 'button'

  const variantStyles = {
    default: cn(
      'border-white/10 text-white',
      'hover:border-white/30 hover:bg-white/5',
      'active:scale-95'
    ),
    blue: cn(
      'border-blue/30 text-blue',
      'hover:border-blue hover:bg-blue/10 hover:text-white',
      'active:scale-95'
    ),
    danger: cn(
      'border-danger/30 text-danger',
      'hover:border-danger hover:bg-danger/10 hover:text-white',
      'active:scale-95'
    )
  }

  const commonProps = {
    className: cn(
      // Base styles
      "h-10 px-5 flex items-center justify-center gap-2 relative",
      "uppercase font-bold text-11 tracking-snug leading-none",
      "rounded-full border-2 transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-grey-5",

      // Shadow and effects
      "shadow-sm hover:shadow-md",

      // Disabled state
      disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer",

      // Variant styles
      variantStyles[variant],

      // Custom overrides
      className
    ),
    onClick: disabled ? undefined : onClick,
    type: href ? undefined : type,
    ...(href && !disabled ? { href } : {}),
  }

  return (
    // @ts-ignore
    <Component {...commonProps}>
      {children}
    </Component>
  )
}
