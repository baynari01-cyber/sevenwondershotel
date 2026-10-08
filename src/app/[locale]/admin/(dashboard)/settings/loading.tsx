import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-96 max-w-full" />
      <Skeleton className="h-[32rem] w-full" />
    </div>
  );
}
