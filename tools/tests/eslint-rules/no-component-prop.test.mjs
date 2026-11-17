import tsParser from '@typescript-eslint/parser';
import { describe, it } from 'vitest';

import { noComponentProp } from '../../eslint-rules/no-component-prop.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module' } },
});

describe('the component prop rule', () => {
    it('lets a container take the hole and refuses the component that fills it', () => {
        ruleTester.run('no-component-prop', noComponentProp, {
            valid: [
                'type PanelProps = PropsWithChildren<{ title: string }>;',
                'type FieldProps = { children: ReactElement<ControlProps>; label: string };',
                'type Props = { icon: IconName; label: string };',
                'type Props = { onSelect: (id: string) => void; selected: boolean };',
                'type TabStripEnd = { render: () => ReactNode };',
                'type Props = { iconSize?: "sm" | undefined };',
            ],
            invalid: [
                {
                    code: 'type PanelProps = { children: ReactNode };',
                    errors: [{ messageId: 'childrenProp' }],
                },
                {
                    code: 'type PanelProps = { children?: ReactNode | undefined; title: string };',
                    errors: [{ messageId: 'childrenProp' }],
                },
                {
                    code: 'type PanelProps = PropsWithChildren<{ sidebar: ReactNode }>;',
                    errors: [{ messageId: 'componentProp' }],
                },
                {
                    code: 'type Props = { content: ReactNode; sidebar: ReactNode };',
                    errors: [{ messageId: 'componentProp' }, { messageId: 'componentProp' }],
                },
                {
                    code: 'type Props = { trigger: ReactElement };',
                    errors: [{ messageId: 'componentProp' }],
                },
                {
                    code: 'type Props = { actions?: (() => ReactNode) | undefined };',
                    errors: [{ messageId: 'componentProp' }],
                },
                {
                    code: 'type Props = { end: JSX.Element };',
                    errors: [{ messageId: 'componentProp' }],
                },
                {
                    code: 'type PanelProps = { Row: ComponentType<RowProps> };',
                    errors: [{ messageId: 'componentProp' }],
                },
                {
                    code: 'type Props = { icon?: IconName | undefined; label: string };',
                    errors: [{ messageId: 'iconProp' }],
                },
                {
                    code: 'type Props = { leadingIcon?: IconName | undefined };',
                    errors: [{ messageId: 'iconProp' }],
                },
            ],
        });
    });
});
