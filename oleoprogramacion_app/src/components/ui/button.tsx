import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.99] focus-visible:ring-primary",
        primary:
          "bg-primary text-white shadow-sm hover:bg-primary-dark active:scale-[0.99] focus-visible:ring-primary",
        destructive:
          "bg-negative text-white shadow-sm hover:bg-red-700 active:scale-[0.99] focus-visible:ring-negative",
        outline:
          "border-2 border-forest-900/30 bg-white text-forest-950 font-bold shadow-2xs hover:bg-forest-50 hover:border-forest-900 hover:text-forest-900 active:scale-[0.99]",
        secondary:
          "bg-secondary text-white shadow-sm hover:bg-forest-800 active:scale-[0.99] focus-visible:ring-secondary",
        ghost:
          "text-forest-900 font-semibold hover:bg-forest-100/70 hover:text-forest-950",
        link:
          "text-primary underline-offset-4 hover:underline normal-case",
        accent:
          "bg-accent text-forest-950 font-bold shadow-sm hover:bg-accent-hover active:scale-[0.99]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
