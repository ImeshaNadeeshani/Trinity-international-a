// Substitute only tokens in the template, never tokens inside supplied student data.
export function fillAgreementTemplate(body, replacements) {
  const missing = new Set()
  const result = body.replace(/\[[^\]\r\n]+\]/g, token => {
    const value = replacements[token]
    if (value === undefined || value === null || String(value).trim() === '') {
      missing.add(token)
      return token
    }
    return String(value)
  })
  if (missing.size) throw new Error(`Complete the agreement fields before generating: ${[...missing].join(', ')}`)
  return result
}

export function normalizePdfText(value) {
  return value.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2022/g, '-').replace(/\u2026/g, '...').replace(/\u00a0/g, ' ')
}

// Font measurements prevent wide text or long IDs from being clipped.
export function wrapPdfLine(value, font, size, width) {
  const lines = []
  let line = ''
  for (const word of value.trim().split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue }
    if (line) { lines.push(line); line = '' }
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > width && line) { lines.push(line); line = '' }
      line += character
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

export async function renderAgreementPdf(pdfLib, text, reference) {
  const { PDFDocument, StandardFonts, rgb } = pdfLib
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(0.08, 0.15, 0.22)
  let page, y
  const addPage = () => { page = pdf.addPage([595.28, 841.89]); y = 779 }
  addPage()
  const normalized = normalizePdfText(text)
  // Fail clearly rather than silently dropping characters from names or clauses.
  try { font.encodeText(normalized.replace(/[\r\n\t]/g, ' ')) }
  catch { throw new Error('The agreement contains characters unsupported by the PDF font. Use an English transliteration for profile fields or update the template font before generating.') }
  for (const raw of normalized.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) { y -= 7; continue }
    const heading = /^(?:\d+\.\s+[A-Z][A-Z -]+$|Schedule A$|SIGNATURES$|LETTER OF CONSENT$|STUDENT - SERVICE PROVIDER AGREEMENT$)/.test(line)
    const face = heading ? bold : font, size = heading ? 11 : 9.5
    const wrapped = wrapPdfLine(line, face, size, 499)
    if (heading && y < 110) addPage()
    if (heading) y -= 9
    for (const fragment of wrapped) {
      if (y < 65) addPage()
      page.drawText(fragment, { x: 48, y, size, font: face, color: ink })
      y -= heading ? 16 : 13
    }
  }
  const pages = pdf.getPages()
  pages.forEach((sheet, index) => {
    sheet.drawText('TRINITY INTERNATIONAL | STUDENT SERVICE AGREEMENT', { x: 48, y: 810, size: 8, font: bold, color: ink })
    sheet.drawLine({ start: { x: 48, y: 798 }, end: { x: 547, y: 798 }, thickness: 0.5, color: ink })
    sheet.drawText(normalizePdfText(reference), { x: 48, y: 35, size: 8, font })
    sheet.drawText(`Page ${index + 1} of ${pages.length}`, { x: 480, y: 35, size: 8, font })
  })
  return pdf.save()
}
