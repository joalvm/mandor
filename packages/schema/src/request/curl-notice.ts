import { z } from 'zod';

/** What a pasted curl said that the request could not keep, one code per kind of loss. */
export const CURL_NOTICE_CODES = [
    'dataFile',
    'dataFileCopy',
    'formFilePath',
    'formFileCopy',
    'formFileContent',
    'cookieFile',
    'headerFile',
    'unsupportedOption',
    'unknownOption',
    'extraUrl',
    'moreCommands',
    'comment',
    'mixedBody',
    'settingOutOfRange',
] as const;

/** Why a paste is not read at all. */
export const CURL_INVALID_REASONS = ['notCurl', 'noUrl', 'syntax', 'missingArgument'] as const;
export type CurlInvalidReason = (typeof CURL_INVALID_REASONS)[number];

/** `subject` is what the text names: a header, a path, an option. Never the value of a credential. */
export const curlNoticeSchema = z
    .object({ code: z.enum(CURL_NOTICE_CODES), subject: z.string().optional() })
    .strict();
export type CurlNotice = z.infer<typeof curlNoticeSchema>;
