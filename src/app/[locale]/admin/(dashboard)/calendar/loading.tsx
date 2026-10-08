import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-[60vh] w-full" />
    </div>
  );
}
