'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded-[0.375rem] bg-gradient-to-b from-level-3 to-level-2 text-foreground ghost-border hover:from-accent hover:to-level-2",
        destructive:
          "rounded-[0.375rem] bg-tally-red text-level-0 hover:bg-tally-red/90",
        outline:
          "rounded-[0.375rem] ghost-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-[0.375rem] bg-level-2 text-foreground ghost-border hover:bg-level-3",
        ghost:
          "hover:bg-accent hover:text-accent-foreground rounded-[0.375rem]",
        link:
          "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
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
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      navigator.vibrate?.(10)
      onClick?.(e)
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
