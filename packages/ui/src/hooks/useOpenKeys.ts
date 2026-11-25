import { useState } from 'react';

type OpenKeys = {
    open: ReadonlySet<string>;
    toggle: (key: string) => void;
};

/**
 * Which parts of a long list are open. It lives above the list, because a list that draws only
 * what is on screen forgets the state of a row the moment it scrolls out of sight.
 */
export function useOpenKeys(): OpenKeys {
    const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());

    function toggle(key: string): void {
        setOpen((current) => {
            const next = new Set(current);

            if (!next.delete(key)) {
                next.add(key);
            }

            return next;
        });
    }

    return { open, toggle };
}
