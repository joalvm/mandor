import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

import type { EditorTarget, MountedEditor } from '../editor/monaco/mount-editor.js';
import { useEditorRuntime } from './useEditorRuntime.js';

type CodeEditorOptions = {
    containerRef: RefObject<HTMLElement | null>;
    /** Heard on every move of the view, by the editor itself or by whoever mounted it. */
    onScroll?: (() => void) | undefined;
    onValueChange?: ((value: string) => void) | undefined;
    target: EditorTarget;
};

/**
 * Mounts one editor in its container as soon as the editor has loaded, and keeps it where its
 * caller stands: another document, other options, a text that changed outside it. The editor
 * lives as long as the container; everything else about it is changed in place.
 */
export function useCodeEditor({
    containerRef,
    onScroll,
    onValueChange,
    target,
}: CodeEditorOptions): RefObject<MountedEditor | null> {
    const runtime = useEditorRuntime();
    const mountedRef = useRef<MountedEditor | null>(null);
    // Read when the editor mounts and each time it speaks: none of them is a reason to mount again.
    const targetNow = useEffectEvent((): EditorTarget => target);
    const changed = useEffectEvent((value: string): void => {
        onValueChange?.(value);
    });
    const scrolled = useEffectEvent((): void => {
        onScroll?.();
    });

    useEffect(() => {
        const container = containerRef.current;

        if (runtime === null || container === null) {
            return;
        }

        const mounted = runtime.mountEditor(container, targetNow(), (value) => {
            changed(value);
        });

        const unwatch = mounted.watchScroll(() => {
            scrolled();
        });

        mountedRef.current = mounted;

        return () => {
            mountedRef.current = null;
            unwatch();
            mounted.dispose();
        };
    }, [containerRef, runtime]);

    // The editor compares, and changes only what its caller changed.
    useEffect(() => {
        mountedRef.current?.update(target);
    });

    // The document can change with nobody typing here: a revert, another frame, another view.
    useEffect(() => {
        const mounted = mountedRef.current;

        if (mounted !== null && mounted.getValue() !== target.value) {
            mounted.setValue(target.value);
        }
    }, [runtime, target.value]);

    return mountedRef;
}
