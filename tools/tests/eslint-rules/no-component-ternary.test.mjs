import { describe, it } from 'vitest';

import { noComponentTernary } from '../../eslint-rules/no-component-ternary.js';
import { CountedRuleTester } from './support/counted-rule-tester.mjs';

const ruleTester = new CountedRuleTester({
    languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

const ERROR = [{ messageId: 'ternary' }];

describe('the component ternary rule', () => {
    it('leaves the choice of what to draw to a component of its own', () => {
        ruleTester.run('no-component-ternary', noComponentTernary, {
            valid: [
                'const row = <Row><Language language={language} /></Row>;',
                'function Language({ language }) { if (language === undefined) { return null; } return <span>{language}</span>; }',
                'const label = <span>{busy ? saving : save}</span>;',
                "const row = <li className={selected ? 'on' : 'off'} />;",
                'const shown = open && ready;',
                'const name = given ?? fallback;',
            ],
            invalid: [
                {
                    code: 'const row = <li>{language === undefined ? null : <span>{language}</span>}</li>;',
                    errors: ERROR,
                },
                { code: 'const row = <li>{open ? <Open /> : <Closed />}</li>;', errors: ERROR },
                { code: 'const row = <li>{open ? <><Open /></> : null}</li>;', errors: ERROR },
                {
                    code: 'function Row({ open }) { return open ? <Open /> : <Closed />; }',
                    errors: ERROR,
                },
                { code: 'const glyph = open ? <ChevronDown /> : <ChevronRight />;', errors: ERROR },
                { code: 'const row = <li>{open && <Open />}</li>;', errors: ERROR },
                { code: 'const row = <li>{icon ?? <Fallback />}</li>;', errors: ERROR },
            ],
        });
    });
});
