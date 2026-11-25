import { memo, useState } from 'react';
import Icon from './Icon';
import { createClientId } from '../utils/clientIds';

export const fieldTypes = [
  { type: 'TEXT', label: 'Short text', icon: 'text' },
  { type: 'EMAIL', label: 'Email', icon: 'mail' },
  { type: 'NUMBER', label: 'Number', icon: 'number' },
  { type: 'PHONE', label: 'Phone', icon: 'phone' },
  { type: 'TEXTAREA', label: 'Long text', icon: 'text' },
  { type: 'DATE', label: 'Date', icon: 'calendar' },
  { type: 'SELECT', label: 'Dropdown', icon: 'down' },
  { type: 'RADIO', label: 'Single choice', icon: 'circle' },
  { type: 'CHECKBOX', label: 'Checkboxes', icon: 'checkbox' },
];

function FieldPalette({ onAdd }) {
  return <aside className="field-palette"><div className="palette-heading">ADD A FIELD<span>Choose a field type</span></div><div className="palette-grid">{fieldTypes.map((field) => <button key={field.type} className="palette-option" onClick={() => onAdd(field.type)}><span><Icon name={field.icon} size={17} /></span>{field.label}<Icon name="plus" size={14} className="palette-plus" /></button>)}</div><div className="palette-tip"><span>✦</span><p><strong>Pro tip</strong>Drag fields on the canvas to change their order.</p></div></aside>;
}

export function FieldPalettePanel(props) { return <FieldPalette {...props} />; }

function fieldKey(label, fields) {
  const base = (label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'question').slice(0, 56);
  let key = base;
  let suffix = 2;
  while (fields.some((field) => field.key === key)) key = `${base}_${suffix++}`;
  return key;
}

export function createField(type, fields) {
  const config = fieldTypes.find((item) => item.type === type) || fieldTypes[0];
  const label = `Untitled ${config.label.toLowerCase()}`;
  return { clientId: createClientId(), optionIds: [createClientId(), createClientId()], key: fieldKey(label, fields), label, type, placeholder: '', defaultValue: '', required: false, options: ['Option 1', 'Option 2'] };
}

function FieldEditor({ field, index, count, onChange, onRemove, onMove }) {
  const [dragging, setDragging] = useState(false);
  const hasOptions = ['SELECT', 'RADIO', 'CHECKBOX'].includes(field.type);
  const options = (field.options || []).map((option) => typeof option === 'string' ? option : option.label || option.value || '');
  const optionIds = field.optionIds || options.map((_, optionIndex) => `${field.clientId || 'field'}-option-${optionIndex}`);
  const updateOption = (optionIndex, value) => onChange(index, { options: options.map((option, at) => at === optionIndex ? value : option) });

  return (
    <article className={`field-editor ${dragging ? 'field-dragging' : ''}`} draggable onDragStart={(event) => { setDragging(true); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }} onDragEnd={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (Number.isInteger(from)) onMove(from, index); }}>
      <div className="field-editor-top"><span className="drag-handle" title="Drag to reorder"><Icon name="drag" size={17} /></span><span className="field-number">{String(index + 1).padStart(2, '0')}</span><select className="field-type-select" aria-label="Field type" value={field.type} onChange={(event) => onChange(index, { type: event.target.value })}>{fieldTypes.map((item) => <option key={item.type} value={item.type}>{item.type}</option>)}</select><button className="icon-button field-remove" onClick={() => onRemove(index)} aria-label={`Delete field ${field.label}`} title="Delete field"><Icon name="trash" size={16} /></button></div>
      <div className="field-edit-grid">
        <label className="editor-label">Question label<input value={field.label} onChange={(event) => onChange(index, { label: event.target.value })} placeholder="e.g. What's your name?" /></label>
        <label className="editor-label">Field key<input value={field.key} onChange={(event) => onChange(index, { key: event.target.value.replace(/\s/g, '_') })} placeholder="e.g. full_name" /></label>
        <label className="editor-label">Placeholder<input value={field.placeholder || ''} onChange={(event) => onChange(index, { placeholder: event.target.value })} placeholder="Add a hint for people" /></label>
        <label className="editor-label">Default value<input value={field.defaultValue ?? ''} onChange={(event) => onChange(index, { defaultValue: event.target.value })} placeholder="Optional" /></label>
        {hasOptions && <div className="editor-label editor-full option-editor"><span>Options</span>{options.map((option, optionIndex) => <div className="option-row" key={optionIds[optionIndex]}><input aria-label={`Option ${optionIndex + 1}`} value={option} onChange={(event) => updateOption(optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} /><button type="button" className="icon-button" aria-label={`Remove option ${optionIndex + 1}`} onClick={() => onChange(index, { options: options.filter((_, at) => at !== optionIndex), optionIds: optionIds.filter((_, at) => at !== optionIndex) })} disabled={options.length <= 1}>×</button></div>)}<button type="button" className="add-option-button" onClick={() => onChange(index, { options: [...options, `Option ${options.length + 1}`], optionIds: [...optionIds, createClientId()] })}>+ Add option</button></div>}
        {field.type === 'NUMBER' && <><label className="editor-label">Minimum<input type="number" value={field.min ?? ''} onChange={(event) => onChange(index, { min: event.target.value === '' ? undefined : Number(event.target.value) })} /></label><label className="editor-label">Maximum<input type="number" value={field.max ?? ''} onChange={(event) => onChange(index, { max: event.target.value === '' ? undefined : Number(event.target.value) })} /></label></>}
        {(field.type === 'TEXT' || field.type === 'TEXTAREA') && <><label className="editor-label">Min length<input type="number" min="0" value={field.minLength ?? ''} onChange={(event) => onChange(index, { minLength: event.target.value === '' ? undefined : Number(event.target.value) })} /></label><label className="editor-label">Max length<input type="number" min="0" value={field.maxLength ?? ''} onChange={(event) => onChange(index, { maxLength: event.target.value === '' ? undefined : Number(event.target.value) })} /></label></>}
      </div>
      <div className="field-editor-bottom"><button type="button" role="switch" aria-checked={!!field.required} className="required-toggle" onClick={(event) => { event.stopPropagation(); onChange(index, { required: !field.required }); }}><span className="toggle-track" /><span>Required field</span></button><span className="field-index-note">Field {index + 1} of {count}</span></div>
    </article>
  );
}

export default memo(FieldEditor);
