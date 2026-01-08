import { Skeleton } from '@/components/ui/skeleton';

export function OrderSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>

        <Skeleton className="h-px w-full my-3" />

        {/* Order items */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>

        <Skeleton className="h-px w-full my-3" />

        <div className="flex justify-between">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      {/* QR Code section */}
      <div className="bg-muted/50 p-4 border-t border-border">
        <Skeleton className="h-3 w-48 mx-auto mb-3" />
        <div className="flex justify-center">
          <Skeleton className="w-[140px] h-[140px] rounded-xl" />
        </div>
        <Skeleton className="h-3 w-24 mx-auto mt-3" />
      </div>
    </div>
  );
}

export function OrderSkeletonList({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderSkeleton key={i} />
      ))}
    </div>
  );
}
