function LeadershipCard({ name, role, description }) {
  return (
    <article className="card leadership-card">
      <h3>{name}</h3>
      <p className="role">{role}</p>
      <p>{description}</p>
    </article>
  )
}

export default LeadershipCard
