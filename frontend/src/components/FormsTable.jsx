import { useMemo, useState } from 'react';
import Icon from './Icon';
import StatusBadge from './StatusBadge';

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function FormsTable({ forms, onEdit, onView, onDelete, compact = false, publicView = false }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => forms.filter((form) => form.name.toLowerCase().includes(query.toLowerCase())), [forms, query]);

  return (
    <section className="list-card">
      {!compact && <div className="list-toolbar">
        <div><h2>All forms <span className="count-pill">{forms.length}</span></h2><p>Manage your forms and keep everything organized.</p></div>
        <label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search forms..." aria-label="Search forms" /></label>
      </div>}
      <div className="table-scroll">
        <table className="forms-table">
          <thead><tr><th>FORM NAME</th><th>STATUS</th><th>FIELDS</th><th>CREATED</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {filtered.map((form) => (
              <tr key={form._id}>
                <td><button className="form-name-button" onClick={() => onEdit(form._id)}><span className="form-mini-icon"><Icon name="file" size={17} /></span><span><strong>{form.name}</strong><small>{form.description || 'No description'}</small></span></button></td>
                <td><StatusBadge status={form.status} /></td>
                <td><span className="field-count">{form.fields?.length || 0} fields</span></td>
                <td><span className="date-cell">{formatDate(form.createdAt)}</span></td>
                <td><div className="row-actions">
                  {publicView
                    ? form.status === 'published'
                      ? <a title="Open public form in a new tab" aria-label={`Open public form ${form.name} in a new tab`} href={`/forms/${encodeURIComponent(form._id)}`} target="_blank" rel="noopener noreferrer"><Icon name="eye" size={16} /></a>
                      : <button type="button" title="Publish this form to open it publicly" aria-label={`${form.name} is a draft and cannot be opened publicly`} disabled><Icon name="eye" size={16} /></button>
                    : <button type="button" title="Preview form" aria-label={`Preview ${form.name}`} onClick={() => onView(form._id)}><Icon name="eye" size={16} /></button>}
                  <button title="Edit form" aria-label={`Edit ${form.name}`} onClick={() => onEdit(form._id)}><Icon name="edit" size={16} /></button>
                  <button title="Delete form" aria-label={`Delete ${form.name}`} className="delete-action" onClick={() => onDelete(form)}><Icon name="trash" size={16} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="table-empty"><div className="empty-icon"><Icon name={query ? 'search' : 'file'} size={21} /></div><strong>{query ? 'No matching forms' : 'Your forms will show up here'}</strong><span>{query ? 'Try a different search.' : 'Create your first form to get started.'}</span></div>}
      </div>
    </section>
  );
}
