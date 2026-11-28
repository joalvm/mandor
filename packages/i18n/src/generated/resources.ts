import type { ErrorCode } from '@mandor/ipc';

import enAsync from '../lang/en/async.json';
import enAuth from '../lang/en/auth.json';
import enChoice from '../lang/en/choice.json';
import enCollections from '../lang/en/collections.json';
import enCommands from '../lang/en/commands.json';
import enConflicts from '../lang/en/conflicts.json';
import enConnections from '../lang/en/connections.json';
import enCookies from '../lang/en/cookies.json';
import enDocs from '../lang/en/docs.json';
import enEditor from '../lang/en/editor.json';
import enEnvironment from '../lang/en/environment.json';
import enErrors from '../lang/en/errors.json';
import enExport from '../lang/en/export.json';
import enFaults from '../lang/en/faults.json';
import enHistory from '../lang/en/history.json';
import enImport from '../lang/en/import.json';
import enMenu from '../lang/en/menu.json';
import enMessages from '../lang/en/messages.json';
import enNotices from '../lang/en/notices.json';
import enOrigins from '../lang/en/origins.json';
import enPreferences from '../lang/en/preferences.json';
import enRequests from '../lang/en/requests.json';
import enScripts from '../lang/en/scripts.json';
import enShell from '../lang/en/shell.json';
import enSync from '../lang/en/sync.json';
import enUpdates from '../lang/en/updates.json';
import enWorkspace from '../lang/en/workspace.json';
import esAsync from '../lang/es/async.json';
import esAuth from '../lang/es/auth.json';
import esChoice from '../lang/es/choice.json';
import esCollections from '../lang/es/collections.json';
import esCommands from '../lang/es/commands.json';
import esConflicts from '../lang/es/conflicts.json';
import esConnections from '../lang/es/connections.json';
import esCookies from '../lang/es/cookies.json';
import esDocs from '../lang/es/docs.json';
import esEditor from '../lang/es/editor.json';
import esEnvironment from '../lang/es/environment.json';
import esErrors from '../lang/es/errors.json';
import esExport from '../lang/es/export.json';
import esFaults from '../lang/es/faults.json';
import esHistory from '../lang/es/history.json';
import esImport from '../lang/es/import.json';
import esMenu from '../lang/es/menu.json';
import esMessages from '../lang/es/messages.json';
import esNotices from '../lang/es/notices.json';
import esOrigins from '../lang/es/origins.json';
import esPreferences from '../lang/es/preferences.json';
import esRequests from '../lang/es/requests.json';
import esScripts from '../lang/es/scripts.json';
import esShell from '../lang/es/shell.json';
import esSync from '../lang/es/sync.json';
import esUpdates from '../lang/es/updates.json';
import esWorkspace from '../lang/es/workspace.json';

type PluralCategory = 'few' | 'many' | 'one' | 'other' | 'two' | 'zero';

/** Every English key; the plural forms are each language's own, checked when generating. */
type LocaleMessages<Value> = Value extends string
    ? string
    : {
          [
              Key in keyof Value as Key extends `${string}_${PluralCategory}` ? never : Key
          ]: LocaleMessages<Value[Key]>;
      };

const EN_ERRORS = enErrors satisfies Record<ErrorCode, string>;

export const EN_RESOURCE = {
    async: enAsync,
    auth: enAuth,
    choice: enChoice,
    collections: enCollections,
    commands: enCommands,
    conflicts: enConflicts,
    connections: enConnections,
    cookies: enCookies,
    docs: enDocs,
    editor: enEditor,
    environment: enEnvironment,
    errors: EN_ERRORS,
    export: enExport,
    faults: enFaults,
    history: enHistory,
    import: enImport,
    menu: enMenu,
    messages: enMessages,
    notices: enNotices,
    origins: enOrigins,
    preferences: enPreferences,
    requests: enRequests,
    scripts: enScripts,
    shell: enShell,
    sync: enSync,
    updates: enUpdates,
    workspace: enWorkspace,
};

const ES_RESOURCE = {
    async: esAsync,
    auth: esAuth,
    choice: esChoice,
    collections: esCollections,
    commands: esCommands,
    conflicts: esConflicts,
    connections: esConnections,
    cookies: esCookies,
    docs: esDocs,
    editor: esEditor,
    environment: esEnvironment,
    errors: esErrors,
    export: esExport,
    faults: esFaults,
    history: esHistory,
    import: esImport,
    menu: esMenu,
    messages: esMessages,
    notices: esNotices,
    origins: esOrigins,
    preferences: esPreferences,
    requests: esRequests,
    scripts: esScripts,
    shell: esShell,
    sync: esSync,
    updates: esUpdates,
    workspace: esWorkspace,
} satisfies LocaleMessages<typeof EN_RESOURCE>;

export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_NAMESPACE = 'shell';
export const LANGUAGE_CODES = ['en', 'es'] as const;
export const NAMESPACES = [
    'async',
    'auth',
    'choice',
    'collections',
    'commands',
    'conflicts',
    'connections',
    'cookies',
    'docs',
    'editor',
    'environment',
    'errors',
    'export',
    'faults',
    'history',
    'import',
    'menu',
    'messages',
    'notices',
    'origins',
    'preferences',
    'requests',
    'scripts',
    'shell',
    'sync',
    'updates',
    'workspace',
] as const;
export const RESOURCES = {
    en: EN_RESOURCE,
    es: ES_RESOURCE,
};

export type Language = (typeof LANGUAGE_CODES)[number];
export type MessageNamespace = (typeof NAMESPACES)[number];
