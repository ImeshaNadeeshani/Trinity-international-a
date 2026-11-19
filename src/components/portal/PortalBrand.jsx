import logo from '../../assets/logo/trinity-official-logo.jpeg'
export default function PortalBrand({ light = false }) {
  return <span className={`portal-official-brand ${light?'light':''}`}><img src={logo} alt="Trinity International"/><span>TRINITY<small>INTERNATIONAL</small></span></span>
}
