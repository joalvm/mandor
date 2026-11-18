import { useEditorRuntime } from '../../hooks/useEditorRuntime.js';
import { cn } from '../../lib/cn.js';

/** How far each line of the shape runs: a short text, no two lines alike. */
const LINE_WIDTHS = ['w-1/3', 'w-2/3', 'w-1/2', 'w-3/4', 'w-2/5'] as const;

/**
 * The shape of a text, drawn where an editor is about to open while the editor and its type
 * load. The place keeps its form, and no editor is shown before it can measure the letters it
 * draws. Once both are in, the editor takes the place.
 */
export function EditorSkeleton() {
    const runtime = useEditorRuntime();

    if (runtime !== null) {
        return null;
    }

    return (
        <div
            aria-hidden
            className="flex flex-col items-start gap-gap-control px-pad-panel py-2"
            data-part="editor-skeleton"
        >
            {LINE_WIDTHS.map((width) => (
                <span
                    className={cn(
                        'h-2 rounded-sm bg-surface-control motion-safe:animate-pulse',
                        width,
                    )}
                    key={width}
                />
            ))}
        </div>
    );
}
