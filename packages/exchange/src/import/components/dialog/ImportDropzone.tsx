import { useMessages } from '@mandor/i18n';
import { ImportIcon } from '@mandor/icons';
import { Button } from '@mandor/ui';
import { type DragEvent, useState } from 'react';

import { picksOf, type ImportChoice, type ImportPick } from '../../lib/import-choice.js';

type ImportDropzoneProps = {
    disabled: boolean;
    formats: readonly ImportChoice[];
    loading: boolean;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onPick: (input: ImportPick) => void;
    onStop: () => void;
    /** How many files are read so far, while a pick or a drop is under way. */
    reading: number | null;
};

/** The words on the button of each way to pick. */
const PICK_LABELS = { files: 'choose', folder: 'chooseFolder' } as const;

const LAYOUT =
    'flex flex-col items-center justify-center gap-gap-control rounded-md transition-colors duration-fast';
const SURFACE_IDLE =
    'border border-dashed border-border-strong bg-surface-raised px-pad-dialog py-gap-section';
const SURFACE_OVER =
    'border border-dashed border-border-strong bg-surface-accent-tint px-pad-dialog py-gap-section';

/**
 * Where the document comes in. The area takes what is dropped on it, and the button under the
 * copy asks main for the operating system's open dialog — the drop needs no click, the click
 * needs no drop, and neither names a path by hand. It lists the formats the app takes, so nobody
 * drops a document blind; which of them a document is, the host finds out. While a document
 * hovers on it, the area says so with the tint of the accent, the same way a taken row does.
 * While a read is under way it says how it goes and offers to stop it.
 */
export function ImportDropzone({
    disabled,
    formats,
    loading,
    onDrop,
    onPick,
    onStop,
    reading,
}: ImportDropzoneProps) {
    const messages = useMessages('import');
    const [over, setOver] = useState(false);

    return (
        <div
            aria-label={messages('dropTitle')}
            className={`${LAYOUT} ${over ? SURFACE_OVER : SURFACE_IDLE}`}
            data-over={over ? 'true' : 'false'}
            data-part="import-dropzone"
            onDragEnter={() => {
                setOver(true);
            }}
            onDragLeave={() => {
                setOver(false);
            }}
            onDragOver={(event) => {
                event.preventDefault();
            }}
            onDrop={(event) => {
                setOver(false);

                if (!disabled) {
                    onDrop(event);
                }
            }}
            role="region"
        >
            <DropzoneContent
                disabled={disabled}
                formats={formats}
                loading={loading}
                onPick={onPick}
                onStop={onStop}
                reading={reading}
            />
        </div>
    );
}

function DropzoneContent({
    disabled,
    formats,
    loading,
    onPick,
    onStop,
    reading,
}: Pick<
    ImportDropzoneProps,
    'disabled' | 'formats' | 'loading' | 'onPick' | 'onStop' | 'reading'
>) {
    const messages = useMessages('import');

    if (loading) {
        return <DropzoneReading onStop={onStop} reading={reading} />;
    }

    return (
        <>
            <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-accent-tint text-text-accent"
            >
                <ImportIcon size="lg" />
            </span>
            <p className="font-semibold text-md text-text-primary">{messages('dropTitle')}</p>
            <ul className="flex flex-col items-center gap-gap-tight" data-part="import-formats">
                {formats.map(({ hint, label }) => (
                    <li className="text-xs text-text-secondary" key={label}>
                        <span className="font-semibold text-text-primary">{label}</span> {hint}
                    </li>
                ))}
            </ul>
            <div
                className="mt-gap-tight flex items-center gap-gap-control"
                data-part="import-picks"
            >
                {picksOf(formats).map((input) => (
                    <Button
                        disabled={disabled}
                        key={input}
                        onClick={() => {
                            onPick(input);
                        }}
                        variant="secondary"
                    >
                        {messages(PICK_LABELS[input])}
                    </Button>
                ))}
            </div>
        </>
    );
}

/** How the read goes, in files while they are being gathered, and the way to stop it. */
function DropzoneReading({ onStop, reading }: Pick<ImportDropzoneProps, 'onStop' | 'reading'>) {
    const messages = useMessages('import');
    const text =
        reading === null ? messages('loading') : messages('reading', { files: String(reading) });

    return (
        <>
            <p className="text-sm text-text-secondary">{text}</p>
            <Button onClick={onStop} variant="secondary">
                {messages('stopReading')}
            </Button>
        </>
    );
}
