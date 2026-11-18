import {
    DEFAULT_SHORTCUTS,
    isApplePlatform,
    registeredCommands,
    shortcutLabel,
} from '@mandor/shell';
import { useTranslator } from '@mandor/i18n';

/**
 * The keys of the commands the window knows, read and not edited: each one a row of the
 * settings, the command where a setting has its name and the keys where it has its control.
 */
export function ShortcutsList() {
    const translate = useTranslator();
    const commands = new Map(registeredCommands().map((command) => [command.id, command]));
    const apple = isApplePlatform();
    const shortcuts = DEFAULT_SHORTCUTS.flatMap((shortcut) => {
        const command = commands.get(shortcut.command);

        if (command === undefined) {
            return [];
        }

        return {
            command: translate(command.title, command.titleValues),
            shortcut: shortcutLabel(shortcut.combination, apple),
        };
    });

    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="settings-shortcuts">
            <p className="px-pad-control text-xs text-text-secondary">
                {translate('preferences:shortcutsHelp')}
            </p>
            <ul
                aria-label={translate('preferences:shortcutsTitle')}
                className="grid min-w-0 grid-cols-setting-row gap-x-gap-control gap-y-gap-tight px-pad-control"
            >
                {shortcuts.map((shortcut) => (
                    <li className="contents" key={shortcut.command}>
                        <span className="min-w-0 truncate text-sm text-text-primary">
                            {shortcut.command}
                        </span>
                        <kbd className="font-mono text-xs text-text-secondary">
                            {shortcut.shortcut}
                        </kbd>
                    </li>
                ))}
            </ul>
        </div>
    );
}
