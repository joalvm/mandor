import { useMessages } from '@mandor/i18n';
import { BracesIcon, ChevronDownIcon } from '@mandor/icons';
import { Button, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';
import { Fragment } from 'react';

import { BYTE_FORMATS, TEXT_FORMATS, type BodyFormat } from './lib/body-formats.js';

type BodyFormatMenuProps = {
    onChange: (format: BodyFormat) => void;
    value: BodyFormat;
};

const LABEL_OF_FORMAT = {
    base64: 'formatBase64',
    hex: 'viewHex',
    html: 'formatHtml',
    javascript: 'formatJavascript',
    json: 'formatJson',
    markdown: 'formatMarkdown',
    raw: 'viewRaw',
    xml: 'formatXml',
} as const satisfies Record<BodyFormat, string>;

/**
 * The format the body is read in: a quiet button that names it, opening the list with it in
 * bold. The languages come first and the ways of reading it as it came after a rule, so the
 * first choice is always what the body is and the second what it is made of.
 */
export function BodyFormatMenu({ onChange, value }: BodyFormatMenuProps) {
    const labels = useMessages('requests');

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    aria-label={labels('bodyFormatChosen', {
                        format: labels(LABEL_OF_FORMAT[value]),
                    })}
                    data-part="response-body-format"
                    size="sm"
                    variant="ghost"
                >
                    <BracesIcon size="sm" />
                    <span>{labels(LABEL_OF_FORMAT[value])}</span>
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent fitTrigger>
                {[TEXT_FORMATS, BYTE_FORMATS].map((group, index) => (
                    <Fragment key={group[0]}>
                        <GroupRule first={index === 0} />
                        {group.map((format) => (
                            <MenuItem
                                checked={format === value}
                                key={format}
                                onSelect={() => {
                                    onChange(format);
                                }}
                            >
                                {labels(LABEL_OF_FORMAT[format])}
                            </MenuItem>
                        ))}
                    </Fragment>
                ))}
            </MenuContent>
        </Menu>
    );
}

function GroupRule({ first }: { first: boolean }) {
    if (first) {
        return null;
    }

    return <MenuSeparator />;
}
