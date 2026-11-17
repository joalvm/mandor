import { ChevronRightIcon } from '@mandor/icons';
import { useMemo, useState, type PropsWithChildren } from 'react';

import { issueFactsIn, type IssueFacts, type IssuePair } from '../../editor/issue-facts.js';
import { valuePathOf } from '../../editor/value-path.js';
import { Badge } from '../indicator/Badge.js';
import { ListRow } from '../row/ListRow.js';
import { RowList } from '../row/RowList.js';
import { RowLabel } from '../row/RowLabel.js';
import { SplitHalf } from '../split/SplitHalf.js';
import { SplitPane } from '../split/SplitPane.js';

/** One rule a value broke, as the list shows it: already said in the words of the mounter. */
export type SchemaIssueRow = {
    /** The rule of JSON Schema that refused the value: `type`, `required`, `minimum`… */
    keyword: string;
    message: string;
    /** What the rule was given to judge with: its limit, the type it wanted, what it got. */
    params: Readonly<Record<string, string>>;
    /** Where the value broke the rule, as a JSON Pointer; the root is `''`. */
    path: string;
    /** Where the rule sits in the text of the schema, as a JSON Pointer. */
    schemaPath: string;
};

/** The broken rules of one value and the words the dock says around them. */
export type SchemaIssueList = {
    /** Set before what the rule asked. */
    expected: string;
    /** Says the line of the schema a rule is written on. */
    line: (line: number) => string;
    /** Set before what the value had. */
    received: string;
    /** Names the line between the region and the dock, for whoever moves it from the keyboard. */
    resize: string;
    rows: readonly SchemaIssueRow[];
    /** What the list judges and how much it found, as the band over it says. */
    title: string;
};

/** The region over the dock keeps three quarters of the height to begin with. */
const REGION_SHARE = 75;

/**
 * The share the user last set, for as long as the window lives: every schema that docks its
 * problems stands the dock at the same height, the way the dock of the activity does.
 */
let regionShare = REGION_SHARE;

type SchemaIssuesProps = PropsWithChildren<{
    /** What the value breaks; with nothing broken, or nothing judged, the dock is closed. */
    issues: SchemaIssueList | undefined;
    /** The text of the value the schema judged, read for what came where a rule broke. */
    judged: string | undefined;
    /** Picks the rule behind a row, which the mounter shows in the editor of the schema. */
    onPick: (issue: SchemaIssueRow) => void;
    /** The text of the schema, read for the line each rule is written on. */
    schema: string;
}>;

/**
 * The region it is written around, with the rules of a schema one value breaks docked under it.
 * The dock is a panel of its own: its band says whose value it is and how many problems there
 * are, and the line over it moves. Each row reads where in the value and which rule, and under
 * that what the rule asked against what came, with the value as it came; a rule with no such
 * pair says itself in words. Taking a row shows the rule in the schema. A value that keeps every
 * rule docks nothing, and the region takes the whole height without being drawn anew.
 */
export function SchemaIssues({ children, issues, judged, onPick, schema }: SchemaIssuesProps) {
    const [share, setShare] = useState(regionShare);

    return (
        <SplitPane
            className="min-h-0 flex-1"
            collapsed={issues === undefined || issues.rows.length === 0}
            direction="column"
            label={issues?.resize ?? ''}
            max={85}
            onValueChange={(next) => {
                regionShare = next;
                setShare(next);
            }}
            value={share}
        >
            <SplitHalf>{children}</SplitHalf>
            <IssuesHalf issues={issues} judged={judged} onPick={onPick} schema={schema} />
        </SplitPane>
    );
}

type IssuesHalfProps = Omit<SchemaIssuesProps, 'children'>;

/** The half of the dock exists only while the value breaks something. */
function IssuesHalf({ issues, judged, onPick, schema }: IssuesHalfProps) {
    if (issues === undefined || issues.rows.length === 0) {
        return null;
    }

    return (
        <SplitHalf>
            <section
                aria-label={issues.title}
                className="flex h-full min-h-0 flex-col"
                data-part="schema-issues"
            >
                <h3 className="flex h-section shrink-0 items-center gap-gap-icon-text px-pad-panel text-sm font-semibold text-text-primary">
                    <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full bg-solid-warning"
                        data-part="schema-issues-dot"
                    />
                    {issues.title}
                </h3>
                <IssueList issues={issues} judged={judged} onPick={onPick} schema={schema} />
            </section>
        </SplitHalf>
    );
}

type IssueListProps = Omit<IssuesHalfProps, 'issues'> & { issues: SchemaIssueList };

/** The rows of the dock; the one taken last stays marked, so the reader knows which rule shows. */
function IssueList({ issues, judged, onPick, schema }: IssueListProps) {
    const [picked, setPicked] = useState<string | null>(null);
    const factsOf = useMemo(() => issueFactsIn(schema, judged), [judged, schema]);

    return (
        <RowList
            className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-gap-tight"
            data-part="schema-issues-list"
            label={issues.title}
        >
            {issues.rows.map((issue) => {
                const key = `${issue.path} ${issue.schemaPath} ${issue.message}`;
                const facts = factsOf(issue);

                return (
                    <ListRow
                        density="pair"
                        key={key}
                        onSelect={() => {
                            setPicked(key);
                            onPick(issue);
                        }}
                        selected={picked === key}
                    >
                        <span
                            className="flex min-w-0 flex-1 flex-col gap-gap-tight"
                            data-part="schema-issue"
                        >
                            <span className="flex min-w-0 items-center gap-gap-control">
                                <IssuePath pointer={issue.path} />
                                <Badge className="ms-auto shrink-0 font-mono">
                                    {issue.keyword}
                                </Badge>
                                <IssueLine facts={facts} issues={issues} />
                            </span>
                            <IssueVerdict
                                issues={issues}
                                message={issue.message}
                                pair={facts.pair}
                            />
                        </span>
                    </ListRow>
                );
            })}
        </RowList>
    );
}

type IssuePathProps = { pointer: string };

/**
 * Where in the value, the way code reaches it: the way there in the quiet ink and the step that
 * broke in the strong one, so `$.data.expire` reads as `expire`, inside `data`.
 */
function IssuePath({ pointer }: IssuePathProps) {
    const path = valuePathOf(pointer);

    return (
        <span className="min-w-0 truncate font-mono text-xs" data-part="schema-issue-path">
            <span className="text-text-secondary">{path.trail}</span>
            <span className="font-semibold text-text-primary">{path.leaf}</span>
        </span>
    );
}

type IssueLineProps = { facts: IssueFacts; issues: SchemaIssueList };

/** The line of the schema the rule is on, for a reader who looks for it by number. */
function IssueLine({ facts, issues }: IssueLineProps) {
    if (facts.line === undefined) {
        return null;
    }

    return (
        <span
            className="shrink-0 font-mono text-2xs tabular-nums text-text-tertiary"
            data-part="schema-issue-line"
        >
            {issues.line(facts.line)}
        </span>
    );
}

type IssueVerdictProps = {
    issues: SchemaIssueList;
    message: string;
    pair: IssuePair | undefined;
};

/**
 * The second line of a row: what the rule asked against what came, or the message where there
 * is no such pair. The message names the row either way, so a reader hears it in words.
 */
function IssueVerdict({ issues, message, pair }: IssueVerdictProps) {
    if (pair === undefined) {
        return <RowLabel className="text-xs text-text-secondary">{message}</RowLabel>;
    }

    return (
        <span
            className="flex min-w-0 items-center gap-gap-icon-text text-xs"
            data-part="schema-issue-verdict"
        >
            <RowLabel className="sr-only">{message}</RowLabel>
            <span className="shrink-0 text-text-tertiary">{issues.expected}</span>
            <Badge className="min-w-0 max-w-1/3 font-mono" tone="success">
                <span className="min-w-0 truncate">{pair.expected}</span>
            </Badge>
            <ChevronRightIcon className="shrink-0 text-text-tertiary" size="sm" />
            <span className="shrink-0 text-text-tertiary">{issues.received}</span>
            <Badge className="min-w-0 max-w-1/3 font-mono" tone="warning">
                <span className="min-w-0 truncate">{pair.received}</span>
            </Badge>
            <IssueValue value={pair.value} />
        </span>
    );
}

/** The value as it came, when it says more than what came: `1735689600` after `integer`. */
function IssueValue({ value }: { value: string | undefined }) {
    if (value === undefined) {
        return null;
    }

    return (
        <span
            className="min-w-0 truncate font-mono text-text-secondary"
            data-part="schema-issue-value"
        >
            {value}
        </span>
    );
}
