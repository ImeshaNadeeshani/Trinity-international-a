import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutUrl } from '../src/lib/checkoutUrl.mjs'

test('checkout preserves the provider HTTPS URL and token', () => {
  assert.equal(checkoutUrl('https://pay.example/checkout?token=abc'), 'https://pay.example/checkout?token=abc')
})

test('invalid, insecure and credential-bearing checkout links are rejected', () => {
  for (const value of [undefined, null, '', '/checkout', 'invalid', 'http://pay.example', 'javascript:alert(1)', 'https://user:secret@pay.example']) {
    assert.throws(() => checkoutUrl(value), /invalid checkout link/)
  }
})
