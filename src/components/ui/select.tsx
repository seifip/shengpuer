import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '../../lib/utils';

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            'flex items-center justify-between w-full px-3.5 py-2 border border-white/[0.23] rounded bg-transparent text-foreground text-sm cursor-default transition-colors hover:border-primary disabled:opacity-[0.38] disabled:cursor-default',
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon>
            <i
                className="fa-solid fa-chevron-down text-[0.7em] text-muted-foreground ml-2"
                aria-hidden="true"
            />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={cn(
                'z-[1400] max-h-60 overflow-y-auto rounded bg-[#333] py-2 shadow-lg outline-none',
                position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
                className
            )}
            position={position}
            sideOffset={4}
            {...props}
        >
            {children}
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectViewport = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Viewport>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Viewport>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Viewport ref={ref} className={className} {...props} />
));
SelectViewport.displayName = SelectPrimitive.Viewport.displayName;

const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            'flex items-center px-4 py-1.5 text-sm text-foreground cursor-default select-none outline-none data-[highlighted]:bg-white/[0.08] data-[state=checked]:bg-white/[0.16]',
            className
        )}
        {...props}
    >
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectGroup = SelectPrimitive.Group;

const SelectLabel = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={cn(
            'px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.08em] text-white/40 select-none',
            className
        )}
        {...props}
    />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export { Select, SelectValue, SelectTrigger, SelectContent, SelectViewport, SelectItem, SelectGroup, SelectLabel };
