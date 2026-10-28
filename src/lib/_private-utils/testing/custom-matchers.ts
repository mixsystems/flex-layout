/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import type {Assertion} from 'vitest';
import {StyleUtils} from '../../core/style-utils/style-utils';

declare var global: any;
const _global = <any>(typeof window === 'undefined' ? global : window);

import {_dom as _} from './dom-tools';

import {applyCssPrefixes} from '../auto-prefixer';
import {extendObject} from '../object-extend';

export const expect: (actual: any) => NgMatchers = <any> _global.expect;

export interface NgMatchers extends Assertion<any> {
  toHaveText(expected: string): void;

  toHaveMap(expected: { [k: string]: string }): void;

  toHaveCssClass(expected: string): void;

  toHaveAttributes(expected: { [k: string]: string }): void;

  toHaveStyle(expected: { [k: string]: string } | string, styler?: StyleUtils): void;

  toHaveCSS(expected: { [k: string]: string } | string, styler?: StyleUtils): void;

  not: NgMatchers;
}

/**
 * NOTE: These custom Vitest matchers are used only
 *       in the testing for the Layout Directives
 *       in `src/lib/flex/api`. They are registered once in `setup.ts`.
 */
export const customMatchers = {

  toHaveText(actual: any, expectedText: string) {
    const actualText = elementText(actual);
    return {
      pass: actualText == expectedText,
      message: () => 'Expected ' + actualText + ' to be equal to ' + expectedText
    };
  },

  toHaveCssClass(this: {isNot: boolean}, actual: any, className: string) {
    return {
      pass: _.hasClass(actual, className),
      message: () => `
              Expected ${actual.outerHTML} ${this.isNot ? 'not ' : ''}
              to contain the CSS class '${className}'
            `
    };
  },

  toHaveMap(actual: { [k: string]: string }, map: { [k: string]: string }) {
    let allPassed: boolean;
    allPassed = Object.keys(map).length !== 0;
    Object.keys(map).forEach(key => {
      allPassed = allPassed && (actual[key] === map[key]);
    });

    return {
      pass: allPassed,
      message: () => `
              Expected ${JSON.stringify(actual)} ${!allPassed ? ' ' : 'not '} to contain the
              '${JSON.stringify(map)}'
            `
    };
  },

  toHaveAttributes(actual: any, map: { [k: string]: string }) {
    let allPassed: boolean;
    let attributeNames = Object.keys(map);
    allPassed = attributeNames.length !== 0;
    attributeNames.forEach(name => {
      allPassed = allPassed && _.hasAttribute(actual, name)
          && _.getAttribute(actual, name) === map[name];
    });
    return {
      pass: allPassed,
      message: () => `
              Expected ${actual.outerHTML} ${allPassed ? 'not ' : ''} attributes to contain
              '${JSON.stringify(map)}'
            `
    };
  },

  /**
   * Check element's inline styles only
   */
  toHaveStyle: buildCompareStyleFunction(true),

  /**
   * Check element's css stylesheet only (if not present inline)
   */
  toHaveCSS: buildCompareStyleFunction(false)

};

/**
 * Curried value to function to check styles that are inline or in a stylesheet for the
 * specified DOM element.
 */
function buildCompareStyleFunction(inlineOnly = true) {
  return function (actual: any, styles: { [k: string]: string } | string, styler: StyleUtils) {
    const found = {};
    const styleMap: {[k: string]: string} = {};

    if (typeof styles === 'string') {
      styleMap[styles] = '';
    } else {
      Object.assign(styleMap, styles);
    }

    let allPassed = Object.keys(styleMap).length !== 0;
    Object.keys(styleMap).forEach(prop => {
      let {elHasStyle, current} = hasPrefixedStyles(actual, prop, styleMap[prop], inlineOnly,
        styler);
      allPassed = allPassed && elHasStyle;
      if (!elHasStyle) {
        extendObject(found, current);
      }
    });

    return {
      pass: allPassed,
      message: () => {
        const expectedValueStr = (typeof styles === 'string') ? styleMap :
            JSON.stringify(styleMap, null, 2);
        const foundValueStr = inlineOnly ? actual.outerHTML : JSON.stringify(found);
        return `
          Expected ${foundValueStr}${!allPassed ? '' : ' not'} to contain the
          CSS ${typeof styles === 'string' ? 'property' : 'styles'} '${expectedValueStr}'
        `;
      }
    };
  };
}

/**
 * Validate presence of requested style or use fallback
 * to possible `prefixed` styles. Useful when some browsers
 * (Safari, IE, etc) will use prefixed style instead of defaults.
 */
function hasPrefixedStyles(actual: HTMLElement,
                           key: string,
                           value: string,
                           inlineOnly: boolean,
                           styler: StyleUtils) {
  const current = {};

  if (value === '*') {
    return {elHasStyle: styler.lookupStyle(actual, key, inlineOnly) !== '', current};
  }

  value = value.trim();
  const found = styler.lookupStyle(actual, key, inlineOnly);
  let elHasStyle = found === value || found === browserSerialized(key, value);
  if (!elHasStyle) {
    let prefixedStyles = applyCssPrefixes({[key]: value});
    Object.keys(prefixedStyles).forEach(prop => {
      // Search for optional prefixed values
      elHasStyle = elHasStyle ||
        styler.lookupStyle(actual, prop, inlineOnly) === prefixedStyles[prop];
    });
  }
  // Return BOTH confirmation and current computed key values (if confirmation == false)
  return {elHasStyle, current};
}

/**
 * Value as this browser serializes it inline; modern engines canonicalize
 * some values (e.g. `calc(30vw - 10px)` -> `calc(-10px + 30vw)`).
 */
function browserSerialized(key: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(key, value);
  return probe.style.getPropertyValue(key) || value;
}

function elementText(n: any): string {
  const hasNodes = (m: any) => {
    const children = _.childNodes(m);
    return children && children['length'];
  };

  if (n instanceof Array) {
    return n.map(elementText).join('');
  }

  if (_.isCommentNode(n)) {
    return '';
  }

  if (_.isElementNode(n) && _.tagName(n) == 'CONTENT') {
    return elementText(Array.prototype.slice.apply(_.getDistributedNodes(n)));
  }

  if (_.hasShadowRoot(n)) {
    return elementText(_.childNodesAsList(_.getShadowRoot(n)));
  }

  if (hasNodes(n)) {
    return elementText(_.childNodesAsList(n));
  }

  return _.getText(n);
}

