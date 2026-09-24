import { cn } from "@/lib/utils"

function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)} role="progressbar" aria-valuenow={v}>
      <div className={cn("bg-primary h-full rounded-full transition-all", barClassName)} style={{ width: `${v}%` }} />
    </div>
  )
}

export { Progress }
