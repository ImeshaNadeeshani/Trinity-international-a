import { educationOptions } from '../../data/education'
import { destinations } from '../../data/destinations'

const courseOptions = ['Information Technology (IT)', 'Computer Science', 'Software Engineering', 'Data Science and Artificial Intelligence', 'Cybersecurity', 'Business Management', 'Accounting and Finance', 'Marketing', 'Engineering', 'Medicine and Health Sciences', 'Nursing', 'Hospitality and Tourism', 'Education', 'Law', 'Arts and Design', 'Social Sciences', 'English Language', 'Other / Not decided yet']
const countries = destinations.map(country => country.name)

export default function StudyApplicationFields({ form, onChange }) {
  const set = (key, value) => onChange({ ...form, [key]: value })
  const institutions = destinations.find(country => country.name === form.destination)?.universities || []
  const now = new Date()
  const intakes = Array.from({ length: 36 }, (_, index) => new Date(now.getFullYear(), now.getMonth() + index, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
  return <>
    <label>Preferred destination<select required value={form.destination} onChange={event => onChange({ ...form, destination: event.target.value, institution: '' })}><option value="">Choose a destination</option>{countries.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Highest education completed<select required value={form.education_level} onChange={event => set('education_level', event.target.value)}><option value="">Choose your highest qualification</option>{educationOptions.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Course or subject of interest<select required value={form.course_interest} onChange={event => set('course_interest', event.target.value)}><option value="">Choose a subject area</option>{courseOptions.map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Intake<select required value={form.intake} onChange={event => set('intake', event.target.value)}><option value="">Choose month and year</option>{intakes.map(value => <option key={value}>{value}</option>)}<option>Not decided yet</option></select></label>
    <label>University / institution<select name="institution" value={institutions.some(item=>item.name===form.institution)?form.institution:''} disabled={!form.destination} onChange={event => set('institution', event.target.value)}><option value="">{form.destination ? 'Choose a university in '+form.destination : 'Choose a destination first'}</option>{institutions.map(({ name }) => <option key={name}>{name}</option>)}</select></label>
  </>
}
