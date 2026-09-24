import * as React from "react"

import { cn } from "@/lib/utils"

/** Select nativo con el estilo de Input; funciona directo con FormData y server actions. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 bg-background h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
