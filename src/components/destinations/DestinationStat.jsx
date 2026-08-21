function DestinationStat({ label, value }) {
  return (
    <article className="destination-stat">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>Indicative. Confirm live rates with counsellor.</span>
    </article>
  )
}

export default DestinationStat
