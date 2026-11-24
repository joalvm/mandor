// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { authHeaderLines } from './auth/auth-header-lines.js';
export { authParts, type AuthParts, type AuthSigning } from './auth/auth-parts.js';
export { authTemplates } from './auth/auth-templates.js';
export { effectiveAuth } from './auth/effective-auth.js';

export { computeDynamicValues } from './dynamic/compute-dynamic-values.js';
export { DYNAMIC_NAMES } from './dynamic/dynamic-names.js';
export { openVariable } from './display/open-variable.js';
export { templateStretches, type TemplateTone } from './display/template-stretches.js';
export { chainValues, type ChainLevelValues } from './resolution/chain-values.js';
export { composeScope, type ScopeValues } from './resolution/compose-scope.js';
export { resolveText, type ResolveOptions } from './resolution/resolve-text.js';
export { resolveTemplates } from './resolution/resolve-templates.js';
export { scanTemplate, type TemplateSegment } from './resolution/scan-template.js';
export { assertSafeAuthority } from './resolution/assert-safe-authority.js';
export { sameDestination } from './resolution/same-destination.js';
export { trimHeaderValue } from './resolution/trim-header-value.js';
export { withDefaultScheme } from './resolution/with-default-scheme.js';
export {
    scriptGuard,
    type ScriptGuardInput,
    type ScriptGuardVerdict,
} from './resolution/script-guard.js';
export { UnsafeAuthorityError } from './resolution/unsafe-authority-error.js';
export type { ScopeLevelName, VariableScope } from './resolution/variable-scope.js';
export {
    traceVariable,
    type TracedLevel,
    type VariableTrace,
} from './resolution/trace-variable.js';

export { mapPathPlaceholders, pathPlaceholdersOf } from './path/path-placeholders.js';

export { globalsSecretKey, secretKey } from './secret/secret-key.js';

export { answerSpellings } from './redaction/answer-spellings.js';
export { redact, REDACTED, redactSpellings, spellingsToHide } from './redaction/redact.js';
