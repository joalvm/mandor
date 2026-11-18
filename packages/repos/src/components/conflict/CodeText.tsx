import { tokenizeCode, type CodeTokenKind } from '../../lib/tokenize-code.js';

type CodeTextProps = {
    /** The text lives in a block of its own, laid out, instead of in one line. */
    block: boolean;
    text: string;
};

const KINDS: Record<CodeTokenKind, string> = {
    key: 'text-text-info',
    literal: 'text-text-iris',
    number: 'text-text-warning',
    plain: 'text-text-primary',
    punctuation: 'text-text-secondary',
    string: 'text-text-success',
};

/**
 * The words of a side in the code font and in colour: names, strings, numbers and punctuation
 * each with their own, so a header or a body reads the way it does in the editor. A laid-out
 * structure keeps its shape in a block of its own; a short value reads inline.
 */
export function CodeText({ block, text }: CodeTextProps) {
    const tokens = tokenizeCode(text, block).map((token, index) => (
        <span className={KINDS[token.kind]} key={index}>
            {token.text}
        </span>
    ));

    if (block) {
        return (
            <pre
                className="max-h-48 min-w-0 overflow-auto font-mono text-sm whitespace-pre-wrap"
                data-part="code-text"
            >
                {tokens}
            </pre>
        );
    }

    return (
        <span className="min-w-0 font-mono text-sm break-words" data-part="code-text">
            {tokens}
        </span>
    );
}
