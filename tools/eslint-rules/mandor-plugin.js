import { componentFileHoldsComponents } from './component-file-holds-components.js';
import { hookFileName } from './hook-file-name.js';
import { noAppKindBranch } from './no-app-kind-branch.js';
import { noForeignIconSource } from './no-foreign-icon-source.js';
import { dialogNeedsPolicy } from './dialog-needs-policy.js';
import { noComponentProp } from './no-component-prop.js';
import { noComponentTernary } from './no-component-ternary.js';
import { noDoubleAssertion } from './no-double-assertion.js';
import { noInlineNotice } from './no-inline-notice.js';
import { noInnerBarrel } from './no-inner-barrel.js';
import { noKindBranch } from './no-kind-branch.js';
import { noLooseComponent } from './no-loose-component.js';
import { noNativeControl } from './no-native-control.js';
import { noPendingWorkComment } from './no-pending-work-comment.js';
import { noRoleDirectory } from './no-role-directory.js';
import { noVagueFileName } from './no-vague-file-name.js';
import { noVendorPrimitive } from './no-vendor-primitive.js';
import { oneErrorPerFile } from './one-error-per-file.js';
import { propsTypeName } from './props-type-name.js';
import { requireComponentIdentity } from './require-component-identity.js';

// House rules that no published plugin covers. Some guard the shape of a file:
// how many ideas it holds and whether its name says which one. Others guard the
// interface: which package may draw a control and where a notice may appear.
// Neither cohesion nor taste can be linted; this is the part a parser decides.
export const mandorPlugin = {
    rules: {
        'component-file-holds-components': componentFileHoldsComponents,
        'dialog-needs-policy': dialogNeedsPolicy,
        'hook-file-name': hookFileName,
        'no-app-kind-branch': noAppKindBranch,
        'no-component-prop': noComponentProp,
        'no-component-ternary': noComponentTernary,
        'no-double-assertion': noDoubleAssertion,
        'no-foreign-icon-source': noForeignIconSource,
        'no-inline-notice': noInlineNotice,
        'no-inner-barrel': noInnerBarrel,
        'no-kind-branch': noKindBranch,
        'no-loose-component': noLooseComponent,
        'no-native-control': noNativeControl,
        'no-pending-work-comment': noPendingWorkComment,
        'no-role-directory': noRoleDirectory,
        'no-vague-file-name': noVagueFileName,
        'no-vendor-primitive': noVendorPrimitive,
        'one-error-per-file': oneErrorPerFile,
        'props-type-name': propsTypeName,
        'require-component-identity': requireComponentIdentity,
    },
};
