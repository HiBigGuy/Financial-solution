import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 rounded-[9px] border border-border bg-surface-2 px-3 text-[13px] text-foreground placeholder:text-faint outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[72px] rounded-[9px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-foreground placeholder:text-faint outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/20",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";