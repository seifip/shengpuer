import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../lib/utils';

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        data-slider=""
        className={cn(
            'relative flex w-full touch-none select-none items-center py-3',
            className
        )}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-0.5 w-full rounded-sm bg-white/30">
            <SliderPrimitive.Range className="absolute h-full rounded-sm bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-primary outline-none shadow-[0_0_0_0_rgba(255,255,255,0.16)] transition-shadow hover:shadow-[0_0_0_6px_rgba(255,255,255,0.16)] focus-visible:shadow-[0_0_0_6px_rgba(255,255,255,0.16)]" />
    </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
