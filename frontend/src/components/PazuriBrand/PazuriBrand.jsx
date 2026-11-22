import './PazuriBrand.css'

export function PazuriFishIcon({ size = 64, className = '' }) {
  return (
    <img
      className={`pazuri-fish-icon site-logo ${className}`.trim()}
      src="/images/Modern Blue and Orange Fish Logo.png"
      alt="Pazuri Fish"
      style={{ objectFit: 'contain' }}
    />
  )
}

export default function PazuriBrand({ iconSize = 64, className = '', light = false }) {
  return (
    <span
      className={`pazuri-brand${light ? ' pazuri-brand-light' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      aria-label="Pazuri Fish - Fresh Delivery Everyday"
    >
      <PazuriFishIcon size={iconSize} />
      <span className="pazuri-brand-copy" aria-hidden="true">
        <strong>Pazuri Fish</strong>
        <small>Fresh Delivery Everyday</small>
      </span>
    </span>
  )
}
