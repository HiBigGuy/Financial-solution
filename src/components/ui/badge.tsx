import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-foreground border border-border",
        success: "bg-success/15 text-success border border-success/20",
        danger: "bg-danger/15 text-danger border border-danger/20",
        warning: "bg-warning/15 text-warning border border-warning/20",
        info: "bg-brand/15 text-brand border border-brand/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}