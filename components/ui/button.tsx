import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Shared component variants pair foreground and background; no element default
// can accidentally turn a filled button label invisible.
const buttonVariants = cva(
  "mm-ui-button inline-flex shrink-0 items-center justify-center gap-2 font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "mm-ui-primary",
        destructive: "mm-ui-destructive",
        outline: "mm-ui-outline",
        secondary: "mm-ui-secondary",
        ghost: "mm-ui-ghost",
        link: "mm-ui-link",
      },
      size: {
        default: "mm-ui-default",
        xs: "mm-ui-xs",
        sm: "mm-ui-sm",
        lg: "mm-ui-lg",
        icon: "mm-ui-icon",
        "icon-xs": "mm-ui-icon",
        "icon-sm": "mm-ui-icon",
        "icon-lg": "mm-ui-icon mm-ui-lg",
      },
    },
    defaultVariants: {variant: "default",size: "default"},
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
