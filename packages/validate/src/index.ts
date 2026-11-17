// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { compileSchema } from './compile-schema/compile-schema.js';
export {
    loadedSchemaChecker,
    loadSchemaChecker,
    onSchemaCheckerLoaded,
    withSchemaChecker,
} from './schema-checker/schema-checker.js';
export { validateValue } from './validate-value/validate-value.js';
export type { SchemaIssue } from './validate-value/schema-issue.js';
export { comparisonOf, type RuleComparison } from './validate-value/rule-comparison.js';
export { schemaFromValue } from './schema-from-value/schema-from-value.js';
export { withSchemaToValue } from './schema-to-value/load-schema-to-value.js';
export { validateTemplateText, type TemplateIssue } from './validate-template/validate-template.js';
export { rangeOfPointer, type TextRange } from './text-range/range-of-pointer.js';
export { uncheckedPatternRanges } from './compile-schema/unchecked-patterns.js';
export { placesIn, type PointerPlace } from './text-range/pointer-places.js';
export {
    schemaStrictnessOf,
    withAllRequired,
    withClosedObjects,
    type SchemaStrictness,
    type StrictnessState,
} from './schema-strictness/schema-strictness.js';
export { keepingStrictness } from './schema-strictness/keeping-strictness.js';
export { applyGeneratedPayload } from './schema-generation/apply-generated-payload.js';
export {
    applyGeneratedSchema,
    type ReplaceAsk,
} from './schema-generation/apply-generated-schema.js';
export { schemaOfDraft } from './schema-generation/schema-of-draft.js';
export { compactJson, trailingCommas, wireJson } from './wire-json/wire-json.js';
