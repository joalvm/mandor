import { cn } from '../../lib/cn.js';
import { Tooltip } from '../tooltip/Tooltip.js';

type StatusDotProps = {
    className?: string | undefined;
    label: string;
    state: 'connected' | 'connecting' | 'disconnected' | 'error' | 'warning';
};

const STATE_CLASSES = {
    connected: 'border-solid-success bg-solid-success',
    connecting: 'animate-pulse motion-reduce:animate-none border-solid-warning bg-solid-warning',
    disconnected: 'border-border-hover bg-transparent',
    error: 'border-solid-error bg-solid-error',
    warning: 'border-solid-warning bg-solid-warning',
} as const;

/**
 * Adds shape and an accessible label to live connection state.
 *
 * The label travels to the tooltip of the window, never to a native `title`: the browser would
 * put a second globe up a second later, beside ours and in another shape. The state is never
 * colour alone — the dot keeps its shape and its label wherever it lands.
 */
export function StatusDot({ className, label, state }: StatusDotProps) {
    return (
        <Tooltip content={label}>
            <span
                aria-label={label}
                className={cn(
                    'inline-block size-2 shrink-0 rounded-full border',
                    STATE_CLASSES[state],
                    className,
                )}
                data-part="status-dot"
                data-state={state}
                role="img"
            />
        </Tooltip>
    );
}
