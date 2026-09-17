import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textAreaVariants = cva(
  "inline-flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-card transition hover:border-border-strong",
  {
    variants: {
      variant: {
        default: "",
        interactive: "cursor-pointer hover:-translate-y-px",
        ghost: "bg-transparent shadow-none border-transparent hover:bg-surface",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function TextAreaCard({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof textAreaVariants>) {
  return <div className={cn(textAreaVariants({ variant }), className)} {...props} />;
}