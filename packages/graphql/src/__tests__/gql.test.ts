import { describe, it, expect } from 'vitest';
import { gql } from '../gql';

describe('gql', () => {
  it('returns plain query strings', () => {
    // The tag is a passthrough — whatever shows up in the literal flows
    // through verbatim. We use a regex so prettier reformatting the test
    // source can't break the assertion.
    const out = gql`query Foo { id }`;
    expect(typeof out).toBe('string');
    expect(out).toMatch(/query\s+Foo\s*{\s*id\s*}/);
  });

  it('concatenates string interpolations (fragment composition)', () => {
    const fragment = `fragment UserFields on User { id name }`;
    const query = gql`
      query Foo {
        user {
          ...UserFields
        }
      }
      ${fragment}
    `;
    expect(query).toContain('fragment UserFields on User');
    expect(query).toContain('query Foo');
  });

  it('drops non-string interpolations', () => {
    const variable = 42;
    const query = gql`query Foo(${variable}) { id }`;
    expect(query).toBe('query Foo() { id }');
  });
});
