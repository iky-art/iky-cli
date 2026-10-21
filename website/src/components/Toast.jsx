export function Toast({ message }) {
  return (
    <div
      className={`toast ${message ? "is-visible" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message ?? ""}
    </div>
  );
}
