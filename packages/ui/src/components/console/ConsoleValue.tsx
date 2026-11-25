import { ObjectInspector } from 'react-inspector';

/**
 * The colours of the tree, from the tokens of the window, so it follows the theme on its own: a
 * name reads quiet, a string reads in the colour of information, as a browser draws them.
 */
const THEME = {
    BASE_FONT_FAMILY: 'var(--mandor-font-mono)',
    BASE_FONT_SIZE: 'var(--mandor-text-xs-size)',
    BASE_LINE_HEIGHT: 'var(--mandor-text-xs-line)',
    BASE_BACKGROUND_COLOR: 'transparent',
    BASE_COLOR: 'var(--text-primary)',
    OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
    OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
    OBJECT_NAME_COLOR: 'var(--text-secondary)',
    OBJECT_VALUE_NULL_COLOR: 'var(--text-disabled)',
    OBJECT_VALUE_UNDEFINED_COLOR: 'var(--text-disabled)',
    OBJECT_VALUE_REGEXP_COLOR: 'var(--text-error)',
    OBJECT_VALUE_STRING_COLOR: 'var(--text-info)',
    OBJECT_VALUE_SYMBOL_COLOR: 'var(--text-error)',
    OBJECT_VALUE_NUMBER_COLOR: 'var(--text-iris)',
    OBJECT_VALUE_BOOLEAN_COLOR: 'var(--text-iris)',
    OBJECT_VALUE_FUNCTION_PREFIX_COLOR: 'var(--text-iris)',
    ARROW_COLOR: 'var(--text-secondary)',
    ARROW_MARGIN_RIGHT: 4,
    ARROW_FONT_SIZE: 10,
    ARROW_ANIMATION_DURATION: '0s',
    TREENODE_FONT_FAMILY: 'var(--mandor-font-mono)',
    TREENODE_FONT_SIZE: 'var(--mandor-text-xs-size)',
    TREENODE_LINE_HEIGHT: 'var(--mandor-text-xs-line)',
    TREENODE_PADDING_LEFT: 14,
};

/** The props the tree is drawn with; the library types its theme as a name and takes an object. */
const TREE: Record<string, unknown> = { theme: THEME };

type ConsoleValueProps = {
    value: unknown;
};

/**
 * What a section of the console holds: an object as one `name: value` line per field, each one
 * opening like the tree of a browser console; text as it came, wrapped and selectable.
 */
export function ConsoleValue({ value }: ConsoleValueProps) {
    if (typeof value !== 'object' || value === null) {
        return (
            <pre
                className="font-mono text-xs break-all whitespace-pre-wrap text-text-primary select-text"
                data-part="console-value-text"
            >
                {String(value)}
            </pre>
        );
    }

    const fields: [string, unknown][] = Object.entries(value);

    return (
        <ul className="select-text" data-part="console-value-tree">
            {fields.map(([name, field]) => (
                <li className="break-all" key={name}>
                    <ObjectInspector {...TREE} data={field} name={name} />
                </li>
            ))}
        </ul>
    );
}
