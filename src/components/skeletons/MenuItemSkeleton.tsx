import { Skeleton } from '@/components/ui/skeleton';

export function MenuItemSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border-2 border-transparent">
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full" />
      
      {/* Content skeleton */}
      <div className="p-3 lg:p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between mt-3">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function MenuItemSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  );
}
