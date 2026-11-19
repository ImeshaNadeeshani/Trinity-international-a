import { trinityLogoBase64 } from '../../supabase/functions/_shared/trinity-logo.ts'

export async function createAgreementDemoPdf({ signature = '', completed = false } = {}) {
  const pdfLib = await import('pdf-lib')
  const { renderAgreementPdf } = await import('../../supabase/functions/_shared/agreement-text.mjs')
  const bytes = await renderAgreementPdf(pdfLib, [
    'STUDENT - SERVICE PROVIDER AGREEMENT',
    'SAMPLE ONLY - NOT A CONTRACT - NO REAL APPLICATION OR SIGNING',
    '',
    'Student: Sample Student',
    'Student ID: DEMO-000001',
    'Application: Example study application',
    '',
    '1. DEMONSTRATION PURPOSE',
    'This PDF demonstrates how a student agreement is generated and signed in the portal. It contains no approved contractual terms, agreed fees or actual student records.',
    '',
    '2. REAL AGREEMENT GENERATION',
    'In the live portal, an authorized Trinity officer selects an approved application and approved active template. The system fills verified student details, agreed fees and business details, then stores the generated PDF privately.',
    '',
    '3. STUDENT SIGNATURE',
    signature ? 'A practice signature is shown below. It has not been submitted to Trinity.' : 'The student reads the generated PDF before explicitly submitting a signature.',
    '',
    '4. MANAGEMENT REVIEW',
    completed ? 'SIMULATED approval for demonstration only. No management officer signed this document.' : 'A real student-signed agreement is reviewed and countersigned by an authorized management account.',
    '',
    'No data from this demo is saved to Supabase or sent to management.',
  ].join('\n'), 'DEMO-AGREEMENT-001 | SAMPLE ONLY', trinityLogoBase64)
  if (!signature) return bytes
  const pdf = await pdfLib.PDFDocument.load(bytes)
  const page = pdf.getPages()[0]
  const image = await pdf.embedPng(signature)
  const size = image.scale(Math.min(250 / image.width, 75 / image.height))
  page.drawText('Practice signature (not submitted)', { x:48, y:210, size:10, font:await pdf.embedFont(pdfLib.StandardFonts.Helvetica) })
  page.drawImage(image, {x:48,y:120,width:size.width,height:size.height})
  return pdf.save()
}
