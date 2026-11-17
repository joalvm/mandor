import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

import type { DiffTarget, MountedDiffEditor } from '../editor/monaco/mount-diff-editor.js';
import { useEditorRuntime } from './useEditorRuntime.js';

type DiffCodeEditorOptions = {
    containerRef: RefObject<HTMLElement | null>;
    onModifiedChange?: ((value: string) => void) | undefined;
    target: DiffTarget;
};

/**
 * Mounts one diff in its container as soon as the editor has loaded, and keeps it where its
 * caller stands: other texts, another language, a result that changed outside it. The diff
 * lives as long as the container; everything else about it is changed in place.
 */
export function useDiffCodeEditor({
    containerRef,
    onModifiedChange,
    target,
}: DiffCodeEditorOptions): RefObject<MountedDiffEditor | null> {
    const runtime = useEditorRuntime();
    const mountedRef = useRef<MountedDiffEditor | null>(null);
    // Read when the diff mounts and each time its text is typed: neither is a reason to mount again.
    const targetNow = useEffectEvent((): DiffTarget => target);
    const changed = useEffectEvent((value: string): void => {
        onModifiedChange?.(value);
    });

    useEffect(() => {
        const container = containerRef.current;

        if (runtime === null || container === null) {
            return;
        }

        const mounted = runtime.mountDiffEditor(container, targetNow(), (value) => {
            changed(value);
        });

        mountedRef.current = mounted;

        return () => {
            mountedRef.current = null;
            mounted.dispose();
        };
    }, [containerRef, runtime]);

    // The texts change with nobody typing here: a draft restored, another side chosen.
    useEffect(() => {
        mountedRef.current?.update(target);
    });

    return mountedRef;
}
