export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status === 'published' ? <span className="status-dot" /> : <span className="status-draft-icon">◷</span>}{status || 'draft'}</span>;
}
