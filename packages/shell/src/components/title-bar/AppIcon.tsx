import { isApplePlatform } from '../../shortcut/apple-platform.js';

type AppIconProps = {
    /** Each app brings its own mark; the row only knows where it goes. */
    src: string;
};

/**
 * The mark of the app at the start of the title row, before the button of its menu.
 *
 * It is decoration: the window's title already names the app, so a reader skips the icon and the
 * drag surface keeps it, the way it keeps the empty stretch of the row. On macOS the corner
 * belongs to the traffic lights and the app is named by the system menu bar, so nothing is drawn.
 */
export function AppIcon({ src }: AppIconProps) {
    if (isApplePlatform()) {
        return null;
    }

    return <img alt="" className="size-icon-md shrink-0" data-part="app-icon" src={src} />;
}
