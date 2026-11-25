import { useEffect, useState } from 'react';
import { formsApi } from '../services/formsApi';
import ThemeToggle from '../components/ThemeToggle';
import Icon from '../components/Icon';

function optionValue(option) {
  return typeof option === 'string' ? option : String(option.value ?? option.label ?? '');
}

function optionLabel(option) {
  return typeof option === 'string' ? option : String(option.label ?? option.value ?? '');
}

function initialAnswers(fields) {
  return Object.fromEntries(fields.map((field) => {
    const value = field.defaultValue ?? '';
    if (field.type === 'CHECKBOX' && (field.options || []).length) {
      const defaults = Array.isArray(value) ? value.map(String) : value === '' || value == null ? [] : [String(value)];
      return [field.key, defaults];
    }
    if (field.type === 'CHECKBOX') return [field.key, value === true || value === 'true'];
    return [field.key, value];
  }));
}

function validateForm(form, answers) {
  const errors = {};
  form.fields.forEach((field) => {
    const value = answers[field.key];
    const options = field.options || [];
    const allowed = options.map(optionValue);
    const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0) || value === false;
    if (field.required && empty) {
      errors[field.key] = 'This field is required.';
      return;
    }
    if (empty) return;

    if (field.type === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors[field.key] = 'Enter a valid email address.';
    } else if (field.type === 'NUMBER') {
      const number = Number(value);
      if (!Number.isFinite(number)) errors[field.key] = 'Enter a valid number.';
      else if (field.min != null && number < field.min) errors[field.key] = `Enter a number of at least ${field.min}.`;
      else if (field.max != null && number > field.max) errors[field.key] = `Enter a number no greater than ${field.max}.`;
    } else if (field.type === 'PHONE') {
      const phone = String(value).trim();
      const digits = phone.replace(/\D/g, '');
      if (!/^[+\d().\-\s]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        errors[field.key] = 'Enter a valid phone number with 7 to 15 digits.';
      }
    } else if (field.type === 'SELECT' || field.type === 'RADIO') {
      if (!allowed.includes(String(value))) errors[field.key] = 'Choose one of the available options.';
    } else if (field.type === 'CHECKBOX' && options.length) {
      if (!Array.isArray(value) || value.some((choice) => !allowed.includes(String(choice)))) {
        errors[field.key] = 'Select only the available options.';
      }
    }
  });
  return errors;
}

function PublicField({ field, answer, error, onChange }) {
  const id = `public-field-${field.key}`;
  const descriptionId = error ? `${id}-error` : undefined;
  const common = {
    id,
    name: field.key,
    required: !!field.required,
    placeholder: field.placeholder || '',
    'aria-invalid': !!error,
    'aria-describedby': descriptionId,
  };
  let control;

  if (field.type === 'SELECT') {
    control = <select {...common} value={answer ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">{field.placeholder || 'Choose an option'}</option>{(field.options || []).map((option, index) => <option key={`${field.clientId || field.key}-option-${index}`} value={optionValue(option)}>{optionLabel(option)}</option>)}</select>;
  } else if (field.type === 'RADIO') {
    control = <div className="public-choice-list" role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={descriptionId}>{(field.options || []).map((option, index) => <label className="public-choice" key={`${field.clientId || field.key}-option-${index}`}><input type="radio" name={field.key} value={optionValue(option)} checked={String(answer ?? '') === optionValue(option)} required={!!field.required && index === 0} onChange={(event) => onChange(event.target.value)} /><span>{optionLabel(option)}</span></label>)}</div>;
  } else if (field.type === 'CHECKBOX' && (field.options || []).length) {
    const selected = Array.isArray(answer) ? answer.map(String) : [];
    control = <div className="public-choice-list" aria-describedby={descriptionId}>{field.options.map((option, index) => {
      const value = optionValue(option);
      return <label className="public-choice" key={`${field.clientId || field.key}-option-${index}`}><input type="checkbox" name={field.key} value={value} checked={selected.includes(value)} onChange={(event) => onChange(event.target.checked ? [...selected, value] : selected.filter((item) => item !== value))} /><span>{optionLabel(option)}</span></label>;
    })}</div>;
  } else if (field.type === 'CHECKBOX') {
    control = <label className="public-choice public-single-checkbox"><input type="checkbox" id={id} name={field.key} required={!!field.required} checked={!!answer} aria-invalid={!!error} aria-describedby={descriptionId} onChange={(event) => onChange(event.target.checked)} /><span>{field.placeholder || field.label}</span></label>;
  } else if (field.type === 'TEXTAREA') {
    control = <textarea {...common} rows="4" value={answer ?? ''} onChange={(event) => onChange(event.target.value)} minLength={field.minLength} maxLength={field.maxLength} />;
  } else {
    const inputType = { EMAIL: 'email', NUMBER: 'number', PHONE: 'tel', DATE: 'date' }[field.type] || 'text';
    control = <input {...common} type={inputType} value={answer ?? ''} onChange={(event) => onChange(event.target.value)} min={field.type === 'NUMBER' ? field.min : undefined} max={field.type === 'NUMBER' ? field.max : undefined} minLength={field.minLength} maxLength={field.maxLength} />;
  }

  return <div className={`public-field ${error ? 'public-field-invalid' : ''}`}>
    {field.type !== 'CHECKBOX' || !(field.options || []).length ? <label className="public-field-label" id={`${id}-label`} htmlFor={id}>{field.label}{field.required && <span className="required-star" aria-hidden="true"> *</span>}</label> : <div className="public-field-label" id={`${id}-label`}>{field.label}{field.required && <span className="required-star" aria-hidden="true"> *</span>}</div>}
    {control}
    {error && <span className="public-field-error" id={descriptionId} role="alert">{error}</span>}
  </div>;
}

export default function PublicFormPage({ formId, theme, onToggleTheme }) {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitMessageType, setSubmitMessageType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadForm = async () => {
    setStatus('loading');
    setError('');
    try {
      const result = await formsApi.getPublic(formId);
      if (result.form?.status !== 'published') {
        setStatus('unavailable');
        return;
      }
      setForm(result.form);
      setAnswers(initialAnswers(result.form.fields || []));
      setFieldErrors({});
      setStatus('ready');
    } catch (loadError) {
      setError(loadError.message || 'This form could not be loaded.');
      setStatus('failed');
    }
  };

  useEffect(() => { loadForm(); }, [formId]);

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSubmitMessage('');
    setSubmitMessageType('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(form, answers);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSubmitMessage('Check the highlighted fields and try again.');
      setSubmitMessageType('error');
      document.querySelector('.public-field-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    setSubmitMessage('');
    setSubmitMessageType('');
    try {
      const result = await formsApi.submit(formId, answers);
      if (!result.success || !result.submission?.id) throw new Error('The server did not confirm that your submission was saved. Please try again.');
      setSubmitMessage(result.message || 'Your response was submitted successfully.');
      setSubmitMessageType('success');
    } catch (submitError) {
      setFieldErrors(submitError.fieldErrors || {});
      setSubmitMessage(submitError.message || 'Your response could not be submitted. Please try again.');
      setSubmitMessageType('error');
      if (Object.keys(submitError.fieldErrors || {}).length) {
        document.querySelector('.public-field-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="public-form-page">
    <header className="public-form-header"><a className="public-brand" href="/" aria-label="FormCraft home"><span className="brand-mark"><span /><span /><span /><span /></span><span>Form<span className="brand-light">Craft</span></span></a><ThemeToggle theme={theme} onToggle={onToggleTheme} /></header>
    <main className="public-form-main">
      {status === 'loading' && <div className="public-state"><span className="spinner" />Loading form…</div>}
      {status === 'failed' && <section className="public-state public-state-card"><Icon name="file" size={25} /><h1>Form unavailable</h1><p>{error}</p><button className="button button-secondary" onClick={loadForm}>Try again</button></section>}
      {status === 'unavailable' && <section className="public-state public-state-card"><Icon name="file" size={25} /><h1>Form unavailable</h1><p>This form is not published or is no longer available.</p></section>}
      {status === 'ready' && <form className="public-form-card" noValidate onSubmit={handleSubmit}>
        <div className="public-form-mark"><Icon name="file" size={19} /></div>
        <h1>{form.name}</h1>
        {form.description && <p className="public-form-description">{form.description}</p>}
        {form.fields.map((field) => <PublicField key={field.clientId || field.key} field={field} answer={answers[field.key]} error={fieldErrors[field.key]} onChange={(value) => updateAnswer(field.key, value)} />)}
        {submitMessage && <div className={`public-submit-message ${submitMessageType === 'error' ? 'public-submit-error' : ''}`} role={submitMessageType === 'error' ? 'alert' : 'status'}>{submitMessage}</div>}
        <button className="button button-primary public-submit-button" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
        <div className="public-form-powered">Powered by <strong>FormCraft</strong></div>
      </form>}
    </main>
  </div>;
}
