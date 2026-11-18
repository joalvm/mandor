import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The heights and pads of the scale are names of our own, so they teach the merger which ones
 * take each other's place: a component keeps its default and the caller stands a different one.
 */
const merge = extendTailwindMerge({
    extend: {
        classGroups: {
            h: [
                'h-control-xs',
                'h-control-sm',
                'h-control',
                'h-field',
                'h-row-xs',
                'h-row',
                'h-row-pair',
                'h-section',
                'h-tab',
                'h-header',
                'h-titlebar',
                'h-statusbar',
            ],
            pe: ['pe-pad-control', 'pe-pad-panel'],
            ps: ['ps-pad-control', 'ps-pad-panel'],
            px: ['px-pad-control', 'px-pad-panel'],
        },
    },
});

/** Combines conditional classes and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
    return merge(clsx(inputs));
}
