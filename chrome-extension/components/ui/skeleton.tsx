import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Componente Skeleton para loading states
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-20',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

/**
 * Skeleton para card de gravação
 */
export function RecordingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-6 border border-gray-10 rounded-xl">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <Skeleton className="w-12 h-12 rounded-xl" />
            
            <div className="flex-1 space-y-3">
              {/* Title */}
              <Skeleton className="h-5 w-48" />
              
              {/* Metadata */}
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            
            {/* Status badge */}
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Actions */}
          <div className="mt-4 flex justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para popup
 */
export function PopupSkeleton() {
  return (
    <div className="w-[400px] p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      
      {/* Button */}
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Skeleton para lista genérica
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
