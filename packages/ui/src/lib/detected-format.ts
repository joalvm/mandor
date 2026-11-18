/** What a payload turned out to be, read off the payload itself and never off what was promised. */
export type PayloadFormat = 'binary' | 'html' | 'json' | 'text' | 'xml';

const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;
const FIRST_PRINTABLE = 32;

/** A page says so in its first tag: a doctype, or the element every page opens with. */
const HTML_PAGE = /^(?:<!doctype html|<html[\s>])/i;

/** The elements of HTML. Markup that opens with one is a piece of a page. */
const HTML_ELEMENTS: ReadonlySet<string> = new Set(
    [
        'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas',
        'caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed',
        'fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i',
        'iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript',
        'object ol optgroup option output p picture pre progress q rp rt ruby s samp script search',
        'section select slot small source span strong style sub summary sup table tbody td',
        'template textarea tfoot th thead time title tr track u ul var video wbr',
    ]
        .join(' ')
        .split(' '),
);

/** XML says what it is with a namespace, whatever its first element is called. */
const NAMESPACE = /\sxmlns[\s:=]/;

/** A byte no text frame carries: a C0 control that is not one of the three whitespace ones. */
function isControl(code: number): boolean {
    return code < FIRST_PRINTABLE && code !== TAB && code !== LINE_FEED && code !== CARRIAGE_RETURN;
}

function hasControlBytes(data: string): boolean {
    for (let index = 0; index < data.length; index += 1) {
        if (isControl(data.charCodeAt(index))) {
            return true;
        }
    }

    return false;
}

/**
 * Markup read with the rules of HTML: a page that says it is one, or a piece of a page, which
 * opens with an element of HTML and names no namespace. Its void tags are closed by the rules of
 * HTML, and XML would read every `<br>` as left open.
 */
function isHtml(markup: string): boolean {
    const root = /^<([a-z][\w:.-]*)/i.exec(markup)?.[1]?.toLowerCase();

    if (HTML_PAGE.test(markup)) {
        return true;
    }

    return root !== undefined && HTML_ELEMENTS.has(root) && !NAMESPACE.test(markup);
}

function isJson(data: string): boolean {
    try {
        JSON.parse(data);

        return true;
    } catch {
        return false;
    }
}

/**
 * A frame says nothing about its own shape, and what the connection announced it would send is
 * a promise, not evidence. So the payload is read: control bytes make it binary, what parses as
 * JSON is JSON however it was labelled, and markup is HTML when it is a page or a piece of one.
 */
export function detectedFormat(data: string): PayloadFormat {
    const trimmed = data.trim();

    if (hasControlBytes(data)) {
        return 'binary';
    }

    if (/^[[{]/.test(trimmed) && isJson(trimmed)) {
        return 'json';
    }

    if (isHtml(trimmed)) {
        return 'html';
    }

    return /^<[^>]/.test(trimmed) && trimmed.endsWith('>') ? 'xml' : 'text';
}
