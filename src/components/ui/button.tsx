import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        primary: "bg-charcoal text-ivory hover:bg-charcoal-soft shadow-sm",
        accent: "bg-copper text-white hover:bg-copper-deep shadow-sm",
        outline: "border border-charcoal/30 bg-transparent text-charcoal hover:border-charcoal hover:bg-charcoal/5",
        ghost: "bg-transparent text-charcoal hover:bg-charcoal/5",
        subtle: "bg-sand-100 text-charcoal hover:bg-sand-200",
        inverse: "bg-ivory text-charcoal hover:bg-white",
        inverseOutline: "border border-ivory/60 text-ivory hover:bg-ivory/10 hover:border-ivory",
        destructive: "bg-danger text-white hover:bg-danger/90",
        link: "text-copper underline-offset-4 hover:underline h-auto p-0",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        md: "h-11 px-5",
        lg: "h-13 px-7 text-base",
        icon: "size-10",
        iconSm: "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
