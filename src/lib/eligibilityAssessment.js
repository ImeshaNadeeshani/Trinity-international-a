const band = (score) => {
  if (score >= 80) return { label: 'Strong – Proceed', tone: 'strong', icon: '🟢' }
  if (score >= 70) return { label: 'Good – Proceed with targeted selection', tone: 'good', icon: '🟢' }
  if (score >= 60) return { label: 'Moderate – Further assessment required', tone: 'moderate', icon: '🟡' }
  if (score >= 50) return { label: 'Higher Risk – Counsellor review required', tone: 'risk', icon: '🟠' }
  return { label: 'Weak – Not recommended at present', tone: 'weak', icon: '🔴' }
}

const optionScore = (value, scores, fallback = 0) => scores[value] ?? fallback
const addFinding = (list, condition, text) => { if (condition) list.push(text) }

export function assessEligibility(data) {
  const gpa = Number(data.get('gpa'))
  const completionYear = Number(data.get('completion_year'))
  const currentYear = new Date().getFullYear()
  const gap = Math.max(0, currentYear - completionYear)
  const workYears = Number(data.get('work_experience_years') || 0)
  const testType = data.get('test_type')
  const englishScore = Number(data.get('test_score') || 0)

  const gpaPoints = gpa >= 3.5 ? 15 : gpa >= 3 ? 13 : gpa >= 2.5 ? 10 : gpa >= 2 ? 7 : 3
  const relevancePoints = optionScore(data.get('academic_relevance'), { 'Unrelated field': 2, 'Some related modules': 5, 'Related degree': 8, 'Directly related degree + specialization': 10 })
  const gapPoints = gap <= 1 ? 5 : gap <= 3 ? 4 : gap <= 5 ? 2 : data.get('gap_explained') === 'Yes' ? 2 : 0
  const academic = gpaPoints + relevancePoints + gapPoints

  const progressionPoints = 6
  const experiencePoints = workYears >= 2 ? 5 : workYears >= 1 ? 4 : workYears > 0 ? 3 : 2
  const researchPoints = 3
  const courseCareer = progressionPoints + experiencePoints + researchPoints

  let english = 3
  if (testType === 'IELTS') english = englishScore >= 7 ? 10 : englishScore >= 6.5 ? 8 : englishScore >= 6 ? 5 : 2
  else if (data.get('english_test_status') === 'Planning to Take One') english = 4
  else if (data.get('english_test_status') === 'No') english = 2
  else if (englishScore) english = englishScore >= 7 ? 9 : englishScore >= 6.5 ? 7 : 4

  const liquidLkr = Number(data.get('liquid_funds_lkr') || 0)
  const coveragePoints = liquidLkr > 20000000 ? 15 : liquidLkr >= 15000000 ? 13 : liquidLkr >= 10000000 ? 10 : liquidLkr >= 8000000 ? 6 : 2
  const sourcePoints = optionScore(data.get('funding_strength'), { 'Unclear / borrowed temporarily': 2, 'Third-party sponsor': 5, 'Parent / spouse with explainable income': 8, 'Self / parent / spouse + strong documented income / assets': 10 })
  const sustainabilityPoints = 3
  const financial = coveragePoints + sourcePoints + sustainabilityPoints

  const refusalPoints = data.get('visa_refusal') === 'No' ? 10 : 5
  const total = Math.min(100, academic + courseCareer + english + financial + refusalPoints)
  const result = band(total)
  const strengths = []
  const concerns = []
  addFinding(strengths, gpa >= 3, `GPA of ${gpa.toFixed(2)}/4.0 is in the ${gpa >= 3.5 ? 'excellent' : 'good'} internal band.`)
  addFinding(strengths, relevancePoints >= 8, 'Previous studies are relevant to the intended course.')
  addFinding(strengths, experiencePoints >= 4, 'Relevant work experience strengthens the profile.')
  addFinding(strengths, english >= 8, 'English-language results meet a strong internal screening band.')
  addFinding(strengths, liquidLkr >= 15000000, 'Available liquid funds fall within a strong internal screening band.')
  addFinding(concerns, gpa < 2.5, 'Academic results may limit suitable institutions or programs.')
  addFinding(concerns, gap > 3, `A ${gap}-year study gap needs clear supporting evidence and explanation.`)
  addFinding(concerns, relevancePoints <= 5, 'Course relevance needs stronger justification.')
  addFinding(concerns, english < 5, 'An acceptable English-language result is still required.')
  addFinding(concerns, liquidLkr < 10000000, 'Available liquid funds need further financial assessment.')
  addFinding(concerns, data.get('visa_refusal') === 'Yes', 'Visa refusal history requires detailed counsellor review.')
  addFinding(concerns, data.get('family_situation') !== 'Student alone' && liquidLkr < 15000000, 'Dependants increase the funding requirement and financial risk.')

  return {
    total, ...result,
    categories: [
      { label: 'Academic', score: academic, max: 30 },
      { label: 'Course & Career', score: courseCareer, max: 20 },
      { label: 'English', score: english, max: 10 },
      { label: 'Financial', score: financial, max: 30 },
      { label: 'Visa / Profile', score: refusalPoints, max: 10 },
    ],
    strengths,
    concerns,
  }
}
