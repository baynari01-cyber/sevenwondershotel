import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
