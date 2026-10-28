/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// Runs every test in a ProxyZone, as zone.js does for Jasmine (needed by fakeAsync / waitForAsync).
import 'zone.js/plugins/vitest-patch';
import {customMatchers} from './custom-matchers';

expect.extend(customMatchers);
