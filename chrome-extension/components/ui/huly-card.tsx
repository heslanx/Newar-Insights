import { cn } from '@/lib/utils'

interface HulyCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function HulyCard({ children, className, hover = false }: HulyCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-grey-10 bg-grey-5 p-6",
        "transition-all duration-200",
        hover && "hover:border-grey-20 hover:bg-grey-2",
        className
      )}
    >
      {children}
    </div>
  )
}

interface HulyCardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function HulyCardHeader({ children, className }: HulyCardHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

interface HulyCardTitleProps {
  children: React.ReactNode
  className?: string
}

export function HulyCardTitle({ children, className }: HulyCardTitleProps) {
  return (
    <h3 className={cn("text-18 font-semibold text-white tracking-snugger", className)}>
      {children}
    </h3>
  )
}

interface HulyCardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function HulyCardDescription({ children, className }: HulyCardDescriptionProps) {
  return (
    <p className={cn("text-14 text-grey-60 mt-1", className)}>
      {children}
    </p>
  )
}

interface HulyCardContentProps {
  children: React.ReactNode
  className?: string
}

export function HulyCardContent({ children, className }: HulyCardContentProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  )
}

interface HulyCardFooterProps {
  children: React.ReactNode
  className?: string
}

export function HulyCardFooter({ children, className }: HulyCardFooterProps) {
  return (
    <div className={cn("mt-6 flex items-center justify-between", className)}>
      {children}
    </div>
  )
}
