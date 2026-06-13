import { SkeletonShimmer } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-[100dvh] p-5 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonShimmer className="h-8 w-48" />
          <SkeletonShimmer className="h-4 w-72" />
        </div>
        <SkeletonShimmer className="h-8 w-24 rounded-full" />
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[1.5rem] border border-border/60 p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <SkeletonShimmer className="h-4 w-24" />
                <SkeletonShimmer className="h-9 w-16" />
              </div>
              <SkeletonShimmer className="h-11 w-11 rounded-xl" />
            </div>
            <SkeletonShimmer className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Modules skeleton */}
      <div className="space-y-4">
        <SkeletonShimmer className="h-6 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[1.5rem] border border-border/60 p-5">
              <div className="flex items-start gap-4">
                <SkeletonShimmer className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonShimmer className="h-4 w-24" />
                  <SkeletonShimmer className="h-3 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
