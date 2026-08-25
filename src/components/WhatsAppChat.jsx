import { MessageCircle, Phone, X } from 'lucide-react'
import { useState } from 'react'
import '../styles/whatsapp-chat.css'

const whatsappUrl = 'https://wa.me/94707670670?text=Hello%20Trinity%20International%2C%20I%20would%20like%20to%20get%20more%20information.'

function WhatsAppChat() {
  const [open, setOpen] = useState(false)

  return (
    <aside className={`whatsapp-widget${open ? ' whatsapp-widget-open' : ''}`} aria-label="WhatsApp support">
      {open && (
        <div className="whatsapp-panel" role="dialog" aria-label="Chat with Trinity International on WhatsApp">
          <div className="whatsapp-header">
            <span className="whatsapp-avatar"><MessageCircle size={25} /></span>
            <div><strong>Trinity International</strong><small>Typically replies within minutes</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close WhatsApp chat"><X size={21} /></button>
          </div>
          <div className="whatsapp-conversation">
            <div className="whatsapp-message"><small>Trinity International</small><p>Hi there! 👋<br />How can we help you with your study or migration journey?</p></div>
          </div>
          <div className="whatsapp-footer">
            <a href={whatsappUrl} target="_blank" rel="noreferrer"><Phone size={19} /> Start WhatsApp Chat</a>
            <small>+94 707670670</small>
          </div>
        </div>
      )}
      <button className="whatsapp-fab" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Close WhatsApp chat' : 'Open WhatsApp chat'}>
        {open ? <X size={27} /> : <MessageCircle size={30} />}
        {!open && <span>Chat with us</span>}
      </button>
    </aside>
  )
}

export default WhatsAppChat
