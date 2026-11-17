import { shell } from 'electron';

/**
 * The system answer to "where is this file": the folder opens with the file already chosen,
 * which is the desktop way of offering what a recording wrote. The path travelled validated
 * through the bridge; here it only changes hands.
 */
export function systemReveal(): (path: string) => void {
    return (path) => {
        shell.showItemInFolder(path);
    };
}
