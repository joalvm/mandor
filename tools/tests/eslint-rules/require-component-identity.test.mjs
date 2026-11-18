import { describe, it } from 'vitest';

import { requireComponentIdentity } from '../../eslint-rules/require-component-identity.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
});

const panel = 'apps/async/src/renderer/features/connections/components/ConnectionPanel.tsx';
const row = 'packages/collections/src/components/CollectionRow.tsx';

describe('the component identity rule', () => {
    it('asks a dom root for its data-part', () => {
        ruleTester.run('require-component-identity', requireComponentIdentity, {
            valid: [
                {
                    code: 'export function ConnectionPanel() { return <div data-part="connection-panel" />; }',
                    filename: panel,
                },
                {
                    code: 'export function ConnectionPanel({ open }) { if (!open) { return null; } return <section data-part="connection-panel" />; }',
                    filename: panel,
                },
            ],
            invalid: [
                {
                    code: 'export function ConnectionPanel() { return <div className="p-2" />; }',
                    filename: panel,
                    errors: [{ messageId: 'missingPart' }],
                },
                {
                    code: 'export function ConnectionPanel() { return <div><span data-part="connection-panel" /></div>; }',
                    filename: panel,
                    errors: [{ messageId: 'missingPart' }],
                },
            ],
        });
    });

    it('asks the value to be a kebab-case literal', () => {
        ruleTester.run('require-component-identity', requireComponentIdentity, {
            valid: [
                {
                    code: 'export function Titlebar() { return <header data-part="titlebar" />; }',
                    filename: 'packages/shell/src/components/Titlebar.tsx',
                },
            ],
            invalid: [
                {
                    code: 'export function ConnectionPanel() { return <div data-part="connectionPanel" />; }',
                    filename: panel,
                    errors: [{ messageId: 'notKebab' }],
                },
                {
                    code: 'export function ConnectionPanel({ part }) { return <div data-part={part} />; }',
                    filename: panel,
                    errors: [{ messageId: 'notKebab' }],
                },
            ],
        });
    });

    it('demands nothing where there is no node of ours to mark', () => {
        ruleTester.run('require-component-identity', requireComponentIdentity, {
            valid: [
                {
                    code: 'export function StatusBar() { return <Panel className="p-2" />; }',
                    filename: 'packages/shell/src/components/StatusBar.tsx',
                },
                {
                    code: 'export function StatusBar() { return <Panel data-part="status-bar" />; }',
                    filename: 'packages/shell/src/components/StatusBar.tsx',
                },
                {
                    code: 'export function MessagesProvider({ children }) { return <I18nextProvider>{children}</I18nextProvider>; }',
                    filename: 'packages/i18n/src/components/MessagesProvider.tsx',
                },
                {
                    code: 'export function GroupTabContent({ params }) { return <>{render(params)}</>; }',
                    filename: 'packages/shell/src/components/GroupTabContent.tsx',
                },
            ],
            invalid: [],
        });
    });

    it('asks an anonymous wrapped function for its displayName', () => {
        ruleTester.run('require-component-identity', requireComponentIdentity, {
            valid: [
                {
                    code: 'export const CollectionRow = memo(function CollectionRow() { return <li data-part="collection-row" />; });',
                    filename: row,
                },
                {
                    code: 'export const CollectionRow = forwardRef(function CollectionRow(props, ref) { return <li data-part="collection-row" ref={ref} />; });',
                    filename: row,
                },
                {
                    code: 'export const CollectionRow = memo(() => <li data-part="collection-row" />);\nCollectionRow.displayName = "CollectionRow";',
                    filename: row,
                },
            ],
            invalid: [
                {
                    code: 'export const CollectionRow = memo(() => <li data-part="collection-row" />);',
                    filename: row,
                    errors: [{ messageId: 'missingDisplayName' }],
                },
                {
                    code: 'export const CollectionRow = forwardRef(function (props, ref) { return <li data-part="collection-row" ref={ref} />; });',
                    filename: row,
                    errors: [{ messageId: 'missingDisplayName' }],
                },
            ],
        });
    });

    it('leaves alone what is not a component of ours', () => {
        ruleTester.run('require-component-identity', requireComponentIdentity, {
            valid: [
                {
                    code: 'export function IconPlay() { return <svg viewBox="0 0 16 16" />; }',
                    filename: 'packages/icons/src/play.tsx',
                },
                {
                    code: 'export function Harness() { return <div />; }',
                    filename: 'packages/ui/tests/components/Button.test.tsx',
                },
                { code: 'export function useConnection() { return <div />; }', filename: panel },
                {
                    code: 'function Row() { return <li />; }\nexport function CollectionRow() { return <ul data-part="collection-row"><Row /></ul>; }',
                    filename: row,
                },
                { code: 'export const EMPTY_ROWS = [];', filename: row },
            ],
            invalid: [],
        });
    });
});
