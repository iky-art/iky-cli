export function SectionHead({ index, id, title, lede }) {
  return (
    <div className="section-head">
      <p className="section-index" aria-hidden="true">
        {index}
      </p>
      <div>
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {lede ? <p className="section-lede">{lede}</p> : null}
      </div>
    </div>
  );
}
