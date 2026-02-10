import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded font-medium uppercase tracking-wide cursor-pointer transition-colors text-[0.8125rem] leading-[1.75] disabled:opacity-[0.38] disabled:cursor-default disabled:pointer-events-none',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/85',
                outline:
                    'border border-white/50 bg-transparent hover:border-primary hover:bg-white/[0.08]',
                ghost: 'bg-transparent hover:bg-white/[0.08]',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            },
            size: {
                default: 'px-4 py-1.5',
                sm: 'px-2.5 py-1',
                lg: 'px-[22px] py-2 text-[0.9375rem]',
                icon: 'p-2 rounded-full min-w-0',
            },
            fullWidth: {
                true: 'w-full',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, fullWidth, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, fullWidth, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
