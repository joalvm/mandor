import { z } from 'zod';

/** Everything a format can say it lost on the way in. The window has the words for each. */
export const DEGRADATION_CODES = [
    'audienceNotKept',
    'authNoEquivalentCollection',
    'authNoEquivalentFolder',
    'authNoEquivalentRequest',
    'authNoEquivalentWorkspace',
    'authRefusedCollection',
    'authRefusedFolder',
    'authRefusedRequest',
    'authRefusedWorkspace',
    'bodyModeUnsupported',
    'bodyNotRendered',
    'bodySparqlAsText',
    'bodyTypeAsText',
    'bodyTypeEmpty',
    'certificateNotImported',
    'circularSchema',
    'collectionKeepsNoAuth',
    'collectionKeepsNoDescription',
    'collectionKeepsNoHeaders',
    'collectionKeepsNoVariables',
    'collectionKeyNotImported',
    'contentTypeAsText',
    'convertedOpenapi30',
    'convertedSwagger',
    'cookiesOneWay',
    'descriptionsNotKept',
    'disabledBody',
    'documentWarning',
    'dynamicVariableUnsupported',
    'fieldContentTypeNotKept',
    'fileBodyWithoutFile',
    'fileFieldNoName',
    'fileFieldToCopy',
    'fileFieldWithoutFile',
    'fileToCopy',
    'folderKeepsNoAuth',
    'folderKeepsNoDescription',
    'folderKeepsNoHeaders',
    'folderKeepsNoVariables',
    'folderSettingsNotImported',
    'folderVariablesWin',
    'globalsKept',
    'harBodyBinary',
    'harEntriesCombined',
    'harEntryBadMethod',
    'harEntryBadUrl',
    'harExtrasNotImported',
    'harResponseBinary',
    'harResponsesCapped',
    'kindLeftOut',
    'leftOutConnections',
    'leftOutMessages',
    'leftOutRequests',
    'multipartNoFields',
    'noPlaceCollection',
    'noPlaceFolder',
    'noPlaceRequest',
    'noServer',
    'pathNotNormalized',
    'pkceAlways',
    'postmanKeyNotImported',
    'protocolAsWebsocket',
    'proxyNotImported',
    'redirectNotUsed',
    'requestVariablesNotImported',
    'secretCollectionVariableNotImported',
    'secretEntersEmptyEnvironment',
    'secretEntersEmptyGlobals',
    'secretFolderVariableNotImported',
    'sectionKept',
    'securityApiKeyPlace',
    'securityApiKeyUnplaced',
    'securityFlowNoAuthorizationUrl',
    'securityFlowNoTokenUrl',
    'securityFlowsUnsupported',
    'securityHttpUnsupported',
    'securityNotDeclared',
    'securityTypeUnsupported',
    'settingNoEquivalent',
    'templateUnsupported',
    'urlFragmentNotKept',
    'urlNotEncodedBruno',
    'urlNotEncodedInsomnia',
    'urlNotWebsocket',
    'variableIsObject',
    'variableNameUnusable',
] as const;

export type DegradationCode = (typeof DEGRADATION_CODES)[number];

/**
 * What a document could not carry whole, without words: the code says what happened and the values
 * fill it in, so it reads in the language of the person who imports.
 */
export type Degradation = {
    code: DegradationCode;
    values: Readonly<Record<string, string>>;
};

export const degradationSchema = z
    .object({
        code: z.enum(DEGRADATION_CODES),
        values: z.record(z.string(), z.string()),
    })
    .strict();

/** One thing lost. A loss with nothing to fill in takes no values. */
export function degradation(
    code: DegradationCode,
    values: Readonly<Record<string, string>> = {},
): Degradation {
    return { code, values };
}
