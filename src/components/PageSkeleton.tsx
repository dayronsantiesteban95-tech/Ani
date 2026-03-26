import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/** Skeleton table with header row + N body rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Body rows */}
        <div className="p-4 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton metric cards (stat tiles) */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass-card rounded-2xl">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-2 w-10" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Skeleton chart area */
export function ChartSkeleton() {
  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-[220px] pt-4">
          {[40, 65, 50, 80, 55, 70, 45, 60].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Full page skeleton: title + subtitle + optional stat cards + table */
export function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text">{title}</h1>
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <StatCardsSkeleton />
      <TableSkeleton />
    </div>
  );
}
