import { useState } from 'react';

/** Whether the section has been open at some point: once it has, it stays that way. */
export function useOpenedOnce(open: boolean): boolean {
    const [opened, setOpened] = useState(open);

    if (open && !opened) {
        setOpened(true);
    }

    return opened || open;
}
