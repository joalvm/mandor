import { useState } from 'react';

import { Input } from './Input.js';
import { isWholeCount } from './whole-count.js';

type NumberInputProps = {
    label: string;
    /** The smallest value the field accepts. Absent is 0. */
    min?: number | undefined;
    onNumber: (value: number) => void;
    /** The unit the count is read in, written inside the box. */
    unit?: string | undefined;
    value: number;
};

/**
 * A whole count in a short box: attempts, a wait, a cap. What is being typed stays on the line
 * until it is a number worth keeping — half writing one never reaches the owner, and the box
 * says so while it is not.
 */
export function NumberInput({ label, min = 0, onNumber, unit, value }: NumberInputProps) {
    /** What is being typed; null keeps the owner's value on screen. */
    const [draft, setDraft] = useState<string | null>(null);

    function change(next: string): void {
        setDraft(next);

        if (isWholeCount(next, min)) {
            onNumber(Number(next));
        }
    }

    return (
        <Input
            className="w-28"
            invalid={draft !== null && !isWholeCount(draft, min)}
            label={label}
            onValueChange={change}
            unit={unit}
            value={draft ?? String(value)}
        />
    );
}
