import React, { useCallback, useRef, useEffect } from 'react';
import { Slider } from '../components/ui/slider';

export interface LabelledSliderProps {
    nameLabelId: string;
    nameLabel: string;
    min: number;
    max: number;
    step?: number;
    defaultValue: number;
    onChange: (value: number) => void;
}

export type LabelledSlider = (props: LabelledSliderProps) => JSX.Element;

// This is an ugly hack to be able to update the value label very quickly. Having a prop for the
// label and updating it as the slider is dragged causes severe stuttering of the spectrogram due to
// React taking CPU time re-rendering components.
function generateLabelledSlider(): [LabelledSlider, (value: string) => void] {
    let lastValueLabel: string = '';
    let span: HTMLSpanElement | null = null;
    const onSpanChange = (newSpan: HTMLSpanElement | null) => {
        if (newSpan !== null && newSpan !== span) {
            // Empty the node
            while (newSpan.firstChild) {
                newSpan.removeChild(newSpan.firstChild);
            }
            // Add a new single text node
            newSpan.appendChild(document.createTextNode(''));
        }
        span = newSpan;

        // Update the contents
        if (span !== null && span.firstChild !== null) {
            span.firstChild.nodeValue = lastValueLabel;
        }
    };

    const LabelledSlider = ({
        nameLabelId,
        nameLabel,
        min,
        max,
        step = 1,
        defaultValue,
        onChange,
    }: LabelledSliderProps) => {
        const valueLabelRef = useRef<HTMLSpanElement | null>(null);
        useEffect(() => {
            onSpanChange(valueLabelRef.current);
        }, [valueLabelRef.current]);

        const onValueChange = useCallback(
            (values: number[]) => onChange(values[0]),
            [onChange]
        );

        return (
            <>
                <div className="flex justify-between">
                    <span
                        id={nameLabelId}
                        className="text-xs leading-[1.66] tracking-[0.03333em] text-muted-foreground"
                    >
                        {nameLabel}
                    </span>
                    <span
                        className="text-xs leading-[1.66] tracking-[0.03333em] text-foreground"
                        ref={valueLabelRef}
                    />
                </div>
                <Slider
                    min={min}
                    max={max}
                    step={step}
                    defaultValue={[defaultValue]}
                    onValueChange={onValueChange}
                    aria-labelledby={nameLabelId}
                />
            </>
        );
    };

    return [
        LabelledSlider,
        (value: string) => {
            lastValueLabel = value;
            onSpanChange(span);
        },
    ];
}

export default generateLabelledSlider;
