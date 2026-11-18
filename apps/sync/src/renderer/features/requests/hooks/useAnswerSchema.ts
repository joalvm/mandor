import { exampleResource, itemPartsOf } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { exampleKeys, type HttpResponse, type RequestItem } from '@mandor/schema';
import { originName, useKeepTab, useResourceSection } from '@mandor/shell';
import { useSchemaChecker, useToast } from '@mandor/ui';
import { keepingStrictness } from '@mandor/validate';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import type { AnswerSchema } from '../../../response/ResponseSchema.js';
import { answerVerdict } from '../lib/compare/answer-verdict.js';
import { answeringExamples, type AnsweringExample } from '../lib/compare/answering-examples.js';
import { editExampleSchema } from '../lib/example-draft-write.js';
import { textOfResponse } from '../lib/example-of.js';
import { generatedSchema } from '../lib/example-schema.js';
import { requestsStore } from '../requests-store.js';
import type { SendEntry } from '../responses.slice.js';

/** An example the answer may stand for, with the resource its draft is filed under. */
type Answer = AnsweringExample & { resource: string };

type Drafts = ReturnType<typeof requestsStore.getState>['exampleDrafts'];

/** The examples of a request as the window has them: each its draft, else what the file holds. */
function shownAnswers(itemResource: string, request: RequestItem, drafts: Drafts): Answer[] {
    const parts = itemPartsOf(itemResource);

    if (parts === null) {
        return [];
    }

    const keys = exampleKeys(request.examples);

    return request.examples.map((saved, at) => {
        const key = keys[at] ?? '';
        const resource = exampleResource(originName(), parts.workspaceId, parts.path, key);

        return { example: drafts[resource]?.example ?? saved, key, resource };
    });
}

/** The answer of the last send, once it came. */
function answerOf(entry: SendEntry): HttpResponse | undefined {
    if (entry.state !== 'done') {
        return undefined;
    }

    return entry.response;
}

/** The examples the answer of the last send may stand for, best fit first; none before it came. */
function useAnswers(
    resource: string,
    request: RequestItem | undefined,
    entry: SendEntry,
): Answer[] {
    const drafts = useStore(requestsStore, (state) => state.exampleDrafts);

    return useMemo(() => {
        if (request === undefined || entry.state !== 'done') {
            return [];
        }

        return answeringExamples(
            shownAnswers(resource, request, drafts),
            entry.response.status,
            entry.query,
        );
    }, [drafts, entry, request, resource]);
}

/**
 * The Schema section of the answer of a request: the schema of the example the answer stands
 * for, found by its status and the params sent, or the one the person chose among those of the
 * status. Typing writes the draft of that example, and Ctrl+S on the request puts it on the file.
 * A request with no example of the status that came has no section.
 */
export function useAnswerSchema(
    resource: string,
    request: RequestItem | undefined,
    entry: SendEntry,
): AnswerSchema | undefined {
    const labels = useMessages('requests');
    const { notify } = useToast();
    const keep = useKeepTab();
    const [picked, pick] = useResourceSection(resource, '', 'response-example');
    const answers = useAnswers(resource, request, entry);
    const chosen = answers.find((answer) => answer.key === picked) ?? answers[0];
    const response = answerOf(entry);
    const text = chosen?.example.schema ?? '';
    const checked = useSchemaChecker();
    const issues = useMemo(
        () =>
            response === undefined || !checked ? [] : (answerVerdict(text, response)?.issues ?? []),
        [checked, response, text],
    );

    if (chosen === undefined || response === undefined) {
        return undefined;
    }

    const target = chosen.resource;
    const judged = textOfResponse(response);

    function change(next: string): void {
        // A schema typed is no longer a look the next click replaces.
        keep();
        editExampleSchema(target, next);
    }

    return {
        chosen: chosen.key,
        examples: answers.map(({ example, key }) => ({ key, name: example.name })),
        issues,
        judged,
        modelKey: `${target}#schema`,
        onChange: change,
        onChoose: pick,
        onGenerate: () => {
            const generated = generatedSchema(judged);

            if (generated === null) {
                notify({ title: labels('responseSchemaNotJson'), tone: 'warning' });

                return;
            }

            change(keepingStrictness(text, generated));
        },
        text,
    };
}
