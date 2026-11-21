import { useMessages } from '@mandor/i18n';
import { ChevronDownIcon } from '@mandor/icons';
import { Button, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@mandor/ui';
import { Fragment } from 'react';

import { BYTE_VIEWS, TEXT_VIEWS, type FrameView } from '../../lib/frame-views.js';

type FrameViewMenuProps = {
    onChange: (view: FrameView) => void;
    value: FrameView;
};

const LABEL_OF_VIEW = {
    hex: 'viewHex',
    html: 'formatHtml',
    json: 'formatJson',
    raw: 'viewRaw',
    xml: 'formatXml',
} as const satisfies Record<FrameView, string>;

/**
 * The view the frame is read in: a quiet button that names it, opening the list with it in bold.
 * The languages come first and the ways of reading it as it came after a rule, as the body of a
 * response is read: the first choice is what the frame is, the second what it is made of.
 */
export function FrameViewMenu({ onChange, value }: FrameViewMenuProps) {
    const messages = useMessages('connections');

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    aria-label={messages('payloadFormatChosen', {
                        format: messages(LABEL_OF_VIEW[value]),
                    })}
                    data-part="frame-view-menu"
                    size="sm"
                    variant="ghost"
                >
                    <span>{messages(LABEL_OF_VIEW[value])}</span>
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent fitTrigger>
                {[TEXT_VIEWS, BYTE_VIEWS].map((group, index) => (
                    <Fragment key={group[0]}>
                        <GroupRule first={index === 0} />
                        {group.map((view) => (
                            <MenuItem
                                checked={view === value}
                                key={view}
                                onSelect={() => {
                                    onChange(view);
                                }}
                            >
                                {messages(LABEL_OF_VIEW[view])}
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
