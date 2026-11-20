type TextareaProps = {
    className?: string | undefined;
    disabled?: boolean | undefined;
    /** Whether the text is code: the mono face of the theme, fixed and even. */
    mono?: boolean | undefined;
    label: string;
    onValueChange: (value: string) => void;
    rows?: number | undefined;
    value: string;
};

/**
 * Many lines of one text, in the box the fields use. The height is the caller's: a bulk edit
 * fills the panel it lives in, and no two of those panels agree on how much that is. Nothing
 * in this product is spell-checked by the system.
 */
export function Textarea({
    className,
    disabled = false,
    mono = false,
    label,
    onValueChange,
    rows,
    value,
}: TextareaProps) {
    return (
        <textarea
            aria-label={label}
            className={
                'w-full resize-none rounded-md border border-border-strong bg-transparent ' +
                'p-pad-control font-ui text-sm text-text-primary transition-colors duration-fast ' +
                'enabled:hover:border-border-hover ' +
                'disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-control disabled:text-text-disabled ' +
                (mono ? 'font-mono text-code ' : '') +
                (className ?? '')
            }
            data-focus-frame=""
            data-part="textarea"
            disabled={disabled}
            onChange={(event) => {
                onValueChange(event.target.value);
            }}
            rows={rows}
            spellCheck={false}
            value={value}
        />
    );
}
