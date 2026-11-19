type HorizontalBrandProps = {
  light?: boolean
  compact?: boolean
}

export default function HorizontalBrand({ light = false, compact = false }: HorizontalBrandProps) {
  return (
    <span className={`horizontal-brand${light ? ' light-brand' : ''}${compact ? ' compact' : ''}`}>
      <img className="horizontal-brand-symbol" src="/images/pazuri-fish-symbol.png" alt="" aria-hidden="true" />
      <span className="horizontal-brand-copy">
        <strong>Pazuri Fish</strong>
        <small>Fresh Delivery Every Day</small>
      </span>
    </span>
  )
}
