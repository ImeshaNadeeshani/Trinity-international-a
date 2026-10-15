import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fillAgreementTemplate, normalizePdfText, wrapPdfLine } from '../supabase/functions/_shared/agreement-text.mjs'

test('missing fields block generation with actionable field names', () => {
  assert.throws(() => fillAgreementTemplate('[Student Name] / [Payment Instructions]', {'[Student Name]': 'Example Student'}), /Payment Instructions/)
  assert.throws(() => fillAgreementTemplate('[Student Name]', {'[Student Name]': '  '}), /Student Name/)
})
test('student data cannot inject another template substitution', () => {
  assert.equal(fillAgreementTemplate('[Student Name]', {'[Student Name]': '[Insert Number]', '[Insert Number]': 'SECRET'}), '[Insert Number]')
})
test('wide words and long identifiers stay inside the printable area', () => {
  const font = {widthOfTextAtSize: (text, size) => [...text].reduce((sum, char) => sum + (char === 'W' ? 2 : 1) * size, 0)}
  const text = 'WWWWWWWWWWWWWWWWWW abc ' + 'Q'.repeat(250)
  const lines = wrapPdfLine(text, font, 10, 100)
  assert.ok(lines.every(line => font.widthOfTextAtSize(line, 10) <= 100))
  assert.equal(lines.join('').replaceAll(' ', ''), text.replaceAll(' ', ''))
})
test('reference template retains all sections and separates variable payment data', () => {
  const body = readFileSync(new URL('../src/assets/templates/service-agreement-reference.txt', import.meta.url), 'utf8')
  for (const title of ['1. INTERPRETATION CLAUSE', '15. ORIGINAL DOCUMENTS', 'Schedule A', 'LETTER OF CONSENT']) assert.ok(body.includes(title), title)
  for (const field of ['[Student Name]', '[NIC Number]', '[Student Address]', '[Agreement Date]', '[Selected Country]', '[Service and Payment Schedule]', '[Payment Instructions]']) assert.ok(body.includes(field), field)
  assert.doesNotMatch(body, /Final Audit Report|Transaction ID|GMT\+|\b\d{12}\b|@|199 US Dollars|USD 199/)
  const fields = Object.fromEntries([...body.matchAll(/\[[^\]\r\n]+\]/g)].map(([token]) => [token, 'Example value']))
  assert.doesNotMatch(fillAgreementTemplate(body, fields), /\[[^\]]+\]/)
})
test('typographic punctuation remains readable in the standard PDF font', () => {
  assert.equal(normalizePdfText('“Name” — student’s …'), '"Name" - student\'s ...')
})
