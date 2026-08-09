import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const badgeVariants = (variant: string = 'default') => {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

    const variants: Record<string, string> = {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
        warning: "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200",
    }

    // Default fallback to 'default' style if variant is not found
    return cn(base, variants[variant] || variants.default)
}

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants(variant), className)} {...props} />
    )
}

export { Badge, badgeVariants }
