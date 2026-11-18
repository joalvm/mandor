import { useMessages } from '@mandor/i18n';
import { WarningIcon } from '@mandor/icons';
import type { ScriptStatus } from '@mandor/ipc';
import { hiddenCharactersIn } from '@mandor/script';
import { Button, cn } from '@mandor/ui';

type ScriptTrustBandProps = {
    /** The text shown under the band, read for the characters nobody would see. */
    source: string;
    /** What main said of that text; `null` while it has not answered. */
    status: ScriptStatus | null;
    onApprove: () => void;
};

type BandProps = Pick<ScriptTrustBandProps, 'onApprove' | 'source'>;

const BAND = cn(
    'flex h-section shrink-0 items-center gap-gap-control',
    'rounded-md px-pad-control',
    'bg-surface-warning-tint text-text-primary',
    'text-xs',
);

/** Which band a status draws: an approved text, or one not answered yet, draws none. */
const BAND_OF_STATUS = {
    approved: NoBand,
    tooLarge: TooLargeBand,
    unapproved: UnapprovedBand,
} satisfies Record<ScriptStatus, (props: BandProps) => unknown>;

/**
 * The band over a script that will not run as it is. It never hides the text and never blocks
 * the editor: it says why the script stays out of the send, and how many characters in it hide.
 * Only a text main can approve gets the button.
 */
export function ScriptTrustBand({ source, status, onApprove }: ScriptTrustBandProps) {
    const Band = status === null ? NoBand : BAND_OF_STATUS[status];

    return <Band onApprove={onApprove} source={source} />;
}

function NoBand(): null {
    return null;
}

function UnapprovedBand({ onApprove, source }: BandProps) {
    const labels = useMessages('collections');

    if (source.trim() === '') {
        return null;
    }

    return (
        <div className={BAND} data-part="script-trust-band">
            <span className="shrink-0 text-text-warning">
                <WarningIcon />
            </span>
            <span className="min-w-0 truncate">{labels('scriptUnapproved')}</span>
            <HiddenCount source={source} />
            <Button
                className="ml-auto"
                data-part="script-approve"
                onClick={onApprove}
                size="sm"
                variant="secondary"
            >
                {labels('scriptApprove')}
            </Button>
        </div>
    );
}

function TooLargeBand() {
    const labels = useMessages('collections');

    return (
        <div className={BAND} data-part="script-trust-band">
            <span className="shrink-0 text-text-warning">
                <WarningIcon />
            </span>
            <span className="min-w-0 truncate">{labels('scriptTooLarge')}</span>
        </div>
    );
}

function HiddenCount({ source }: Pick<BandProps, 'source'>) {
    const labels = useMessages('collections');
    const count = hiddenCharactersIn(source);

    if (count === 0) {
        return null;
    }

    return (
        <span className="shrink-0 text-text-secondary" data-part="script-hidden-count">
            {labels('scriptHidden', { count })}
        </span>
    );
}
