/** The options of the markup layout this app sets, and no other: js-beautify ships no types. */
type MarkupLayout = {
    content_unformatted?: string[];
    end_with_newline?: boolean;
    extra_liners?: string[];
    indent_inner_html?: boolean;
    indent_size?: number;
    inline?: string[];
    max_preserve_newlines?: number;
    preserve_newlines?: boolean;
    unformatted?: string[];
    void_elements?: string[];
    wrap_line_length?: number;
};

/** The markup laid out: HTML by its own rules, or XML once the options name no special tag. */
export function beautifyMarkup(source: string, options?: MarkupLayout): string;
