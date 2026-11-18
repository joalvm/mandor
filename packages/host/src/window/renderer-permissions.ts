/**
 * The one permission the window uses: writing text to the clipboard, for the copy buttons.
 * Camera, microphone, location, notifications, devices and the rest are never asked for, so
 * a page that asks is not the app.
 */
const GRANTED = new Set(['clipboard-sanitized-write']);

/** The two handlers of a session that decide permissions, named by what they take. */
export type PermissionTarget = {
    setPermissionRequestHandler: (
        handler:
            | ((
                  contents: unknown,
                  permission: string,
                  callback: (granted: boolean) => void,
              ) => void)
            | null,
    ) => void;
    setPermissionCheckHandler: (
        handler: ((contents: unknown, permission: string) => boolean) | null,
    ) => void;
};

/**
 * Electron grants every permission a page asks for unless the app says otherwise. This says
 * no to all but the clipboard, both when a page asks and when it checks before asking, and
 * answers how to hand the decision back to Electron.
 */
export function denyUnusedPermissions(target: PermissionTarget): () => void {
    target.setPermissionRequestHandler((_contents, permission, callback) => {
        callback(GRANTED.has(permission));
    });
    target.setPermissionCheckHandler((_contents, permission) => GRANTED.has(permission));

    return () => {
        target.setPermissionRequestHandler(null);
        target.setPermissionCheckHandler(null);
    };
}
