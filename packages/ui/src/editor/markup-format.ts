import { codePreferences } from './code-preferences.js';
import { xmlDiagnostics } from './xml-diagnostics.js';

/** The markup the layout knows: HTML by its own rules, XML with no element treated specially. */
type Markup = 'html' | 'xml';

/** One level per nesting, no wrapping and no blank lines of the formatter's own. */
const LAYOUT = {
    end_with_newline: false,
    extra_liners: [],
    indent_inner_html: true,
    max_preserve_newlines: 1,
    preserve_newlines: true,
    wrap_line_length: 0,
};

/** In XML no tag is inline, void or kept as written: those are HTML's names, not the document's. */
const XML_LAYOUT = {
    ...LAYOUT,
    content_unformatted: [],
    inline: [],
    unformatted: [],
    void_elements: [],
};

/** The layout of each markup. */
const LAYOUT_OF_MARKUP = { html: LAYOUT, xml: XML_LAYOUT } as const satisfies Record<
    Markup,
    unknown
>;

/**
 * The markup laid out level by level. The formatter loads the first time something is formatted,
 * not when the editor opens. XML that does not parse is left alone, as JSON is; HTML is never
 * broken, the way a browser reads it.
 */
export async function formattedMarkup(text: string, markup: Markup): Promise<string | null> {
    if (markup === 'xml' && xmlDiagnostics(text).length > 0) {
        return null;
    }

    const { beautifyMarkup } = await import('./beautify-markup.js');

    // A level steps in as the editors type it.
    const { indentSize, indentWithTabs } = codePreferences();

    return beautifyMarkup(text, {
        ...LAYOUT_OF_MARKUP[markup],
        indent_size: indentSize,
        indent_with_tabs: indentWithTabs,
    });
}
