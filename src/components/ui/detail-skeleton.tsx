import { SkeletonShimmer } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonShimmer className="h-8 w-48" />
          <SkeletonShimmer className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonShimmer className="h-9 w-20 rounded-lg" />
          <SkeletonShimmer className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Info card skeleton */}
      <div className="rounded-[1.25rem] border border-border/60 p-5 space-y-4">
        <SkeletonShimmer className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <SkeletonShimmer className="h-4 w-20" />
              <SkeletonShimmer className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Table card skeleton */}
      <div className="rounded-[1.25rem] border border-border/60 p-5 space-y-4">
        <SkeletonShimmer className="h-5 w-32" />
        <div className="space-y-2">
          <div className="flex gap-2 pb-2 border-b border-border/40">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonShimmer key={i} className="h-3 w-24" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2 py-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <SkeletonShimmer key={j} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
