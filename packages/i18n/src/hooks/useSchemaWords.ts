import { useMemo } from 'react';

import { useEditorIssueMessage } from './useEditorIssueMessage.js';
import { useMessages } from './useMessages.js';

/** One rule a value broke, as the checker hands it: where, which rule, and with what. */
type BrokenRule = {
    keyword: string;
    message: string;
    params: Readonly<Record<string, string>>;
    path: string;
    schemaPath: string;
};

/** The broken rules of one value as the list of the schema shows them, under their band. */
type SchemaIssueList = {
    /** What a rule asked, set before what the value had. */
    expected: string;
    /** Says the line of the schema a rule is written on. */
    line: (line: number) => string;
    /** What the value had, set after what the rule asked. */
    received: string;
    /** The name of the line between the schema and the dock of its problems. */
    resize: string;
    /** The rules as the checker handed them, with the message in the language of the interface. */
    rows: BrokenRule[];
    title: string;
};

type SchemaWords = {
    /** The rules a value broke, each in the language of the interface, and the band over them. */
    issues: (subject: string, broken: readonly BrokenRule[]) => SchemaIssueList;
    /** The words every pane that edits a schema says alike. */
    pane: {
        /** The words of the options of a schema. */
        settings: SchemaSettingsWords;
        /** Said over a pattern of a schema that no check reads. */
        uncheckedPattern: string;
    };
};

/** The words of the options of a schema. */
type SchemaSettingsWords = {
    button: string;
    close: string;
    closed: string;
    closedHelp: string;
    partly: string;
    required: string;
    requiredHelp: string;
    title: string;
    unreadable: string;
};

/**
 * The words around a schema that both apps say alike: its options, and the problems one value
 * has with it. The band names its subject — the answer received, the payload about to leave —
 * and counts the problems; every rule is said by what it asked and what it got.
 */
export function useSchemaWords(): SchemaWords {
    const words = useMessages('editor');
    const say = useEditorIssueMessage();

    return useMemo(
        () => ({
            issues: (subject, broken) => ({
                expected: words('schemaIssueExpected'),
                line: (line) => words('schemaIssueLine', { line: String(line) }),
                received: words('schemaIssueReceived'),
                resize: words('schemaIssuesResize'),
                rows: broken.map((rule) => ({
                    keyword: rule.keyword,
                    message: say(rule.message, rule),
                    params: rule.params,
                    path: rule.path,
                    schemaPath: rule.schemaPath,
                })),
                title: words('schemaIssues', { count: broken.length, subject }),
            }),
            pane: {
                settings: {
                    button: words('schemaSettingsButton'),
                    close: words('schemaSettingsClose'),
                    closed: words('schemaSettingsClosed'),
                    closedHelp: words('schemaSettingsClosedHelp'),
                    partly: words('schemaSettingsPartly'),
                    required: words('schemaSettingsRequired'),
                    requiredHelp: words('schemaSettingsRequiredHelp'),
                    title: words('schemaSettingsTitle'),
                    unreadable: words('schemaSettingsUnreadable'),
                },
                uncheckedPattern: words('schemaPatternUnchecked'),
            },
        }),
        [say, words],
    );
}
