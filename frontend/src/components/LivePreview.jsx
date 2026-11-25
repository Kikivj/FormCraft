import { useState } from 'react';
import Icon from './Icon';

function choiceValue(option) {
  return typeof option === 'string' ? option : option.value ?? option.label ?? '';
}

function choiceLabel(option) {
  return typeof option === 'string' ? option : option.label ?? option.value ?? '';
}

function PreviewField({ field }) {
  const options = field.options || [];
  const common = { required: !!field.required, defaultValue: field.defaultValue ?? undefined, placeholder: field.placeholder || '' };
  let control;
  if (field.type === 'TEXTAREA') control = <textarea {...common} rows="3" />;
  else if (field.type === 'SELECT') control = <select required={!!field.required} defaultValue={field.defaultValue ?? ''}><option value="" disabled>{field.placeholder || 'Choose an option'}</option>{options.map((option, index) => <option key={index} value={choiceValue(option)}>{choiceLabel(option)}</option>)}</select>;
  else if (field.type === 'RADIO') control = <div className="preview-choices">{options.map((option, index) => <label key={index}><input type="radio" name={`preview-${field.key}`} value={choiceValue(option)} required={!!field.required && index === 0} /><span>{choiceLabel(option)}</span></label>)}</div>;
  else if (field.type === 'CHECKBOX' && options.length) control = <div className="preview-choices">{options.map((option, index) => <label key={index}><input type="checkbox" value={choiceValue(option)} /><span>{choiceLabel(option)}</span></label>)}</div>;
  else if (field.type === 'CHECKBOX') control = <div className="preview-choices"><label><input type="checkbox" required={!!field.required} defaultChecked={field.defaultValue === true || field.defaultValue === 'true'} /><span>{field.placeholder || field.label}</span></label></div>;
  else {
    const inputType = { EMAIL: 'email', NUMBER: 'number', PHONE: 'tel', DATE: 'date' }[field.type] || 'text';
    control = <input type={inputType} {...common} min={field.min} max={field.max} minLength={field.minLength} maxLength={field.maxLength} />;
  }
  return <div className="preview-field"><label className="preview-label">{field.label || 'Untitled question'}{field.required && <span className="required-star"> *</span>}</label>{control}</div>;
}

export default function LivePreview({ form, standalone = false }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className={`preview-shell ${standalone ? 'preview-standalone' : ''}`}>
      <div className="preview-toolbar"><span><i className="preview-pulse" /> LIVE PREVIEW</span><span>FORM VIEW</span></div>
      <form className="preview-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
        <div className="preview-brandline"><span className="preview-mini-mark"><i /><i /><i /><i /></span> FormCraft form</div>
        <h2>{form.name || 'Untitled form'}</h2>
        {form.description && <p className="preview-description">{form.description}</p>}
        {form.fields?.length ? form.fields.map((field, index) => <PreviewField key={`${field.key}-${index}`} field={field} />) : <div className="preview-empty"><span><Icon name="plus" size={16} /></span>Your questions will appear here as you add them.</div>}
        {form.fields?.length > 0 && <button className="preview-submit" type="submit">Preview validation</button>}
        {submitted && <div className="preview-note">Preview only. Responses are not sent or stored.</div>}
        <div className="preview-powered">Powered by <strong>FormCraft</strong></div>
      </form>
    </div>
  );
}
