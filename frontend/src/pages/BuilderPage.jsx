import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addField, loadBuilderForm, reorderFields, saveBuilderForm, setMetadata, startNewForm, updateField, removeField } from '../redux/builderSlice';
import { fetchForms } from '../redux/formsSlice';
import FieldEditor, { createField, FieldPalettePanel } from '../components/FieldEditor';
import LivePreview from '../components/LivePreview';
import Icon from '../components/Icon';
import StatusBadge from '../components/StatusBadge';
import ThemeToggle from '../components/ThemeToggle';

export default function BuilderPage({ id, previewOnly, onNavigate, theme = 'light', onToggleTheme = () => {}, onLogout = () => {} }) {
  const dispatch = useDispatch();
  const { current: form, loadStatus, saveStatus, error, savedAt } = useSelector((state) => state.builder);
  const [activeTab, setActiveTab] = useState(previewOnly ? 'preview' : 'build');
  const [notice, setNotice] = useState('');
  const isNew = !id || id === 'new';
  const isSaving = saveStatus === 'loading';

  useEffect(() => {
    setActiveTab(previewOnly ? 'preview' : 'build');
    if (isNew) dispatch(startNewForm());
    else dispatch(loadBuilderForm(id));
  }, [dispatch, id, isNew, previewOnly]);

  useEffect(() => {
    if (!savedAt) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const update = useCallback((index, changes) => dispatch(updateField({ index, changes })), [dispatch]);
  const remove = useCallback((index) => dispatch(removeField(index)), [dispatch]);
  const move = useCallback((from, to) => dispatch(reorderFields({ from, to })), [dispatch]);
  const add = (type) => dispatch(addField(createField(type, form.fields || [])));
  const save = async (status) => {
    setNotice('');
    try {
      const saved = await dispatch(saveBuilderForm({ form, status })).unwrap();
      await dispatch(fetchForms());
      setNotice(status === 'published' ? 'Form published successfully.' : (!form.id && !form._id ? 'Form created successfully and saved as a draft.' : 'Form saved as draft.'));
      if (!form.id && !form._id) onNavigate(`/builder/${saved.id || saved._id}`);
    } catch {
      // The Redux error message is displayed inline below.
    }
  };

  const validationErrors = useMemo(() => {
    const errors = [];
    const fields = form.fields || [];
    if (!form.name?.trim()) errors.push('Enter a form name before saving.');
    const keys = fields.map((field) => (field.key || '').trim().toLowerCase());
    fields.forEach((field, index) => {
      if (!field.label?.trim()) errors.push(`Field ${index + 1} needs a label.`);
      if (!field.key?.trim()) errors.push(`Field ${index + 1} needs a key.`);
      else if (keys.indexOf(keys[index]) !== index) errors.push(`Field key “${field.key}” is duplicated. Each field key must be unique.`);
      if (['SELECT', 'RADIO', 'CHECKBOX'].includes(field.type) && !(field.options || []).some((option) => String(typeof option === 'string' ? option : option.label || option.value || '').trim())) {
        errors.push(`${field.label || `Field ${index + 1}`} needs at least one non-empty option.`);
      }
    });
    return errors;
  }, [form]);
  const canSave = validationErrors.length === 0;

  if (loadStatus === 'loading' && !isNew) return <div className="builder-loading"><span className="spinner" />Loading form…</div>;
  if (loadStatus === 'failed') return <div className="builder-load-error"><Icon name="file" size={26} /><h2>Couldn’t open this form</h2><p>{error}</p><button className="button button-primary" onClick={() => onNavigate('/forms')}>Back to forms</button></div>;

  return (
    <div className="builder-app">
      <header className="builder-topbar">
        <div className="builder-top-left"><button className="builder-back" onClick={() => onNavigate('/forms')}><Icon name="back" size={17} /><span>All forms</span></button><span className="builder-divider" /><span className="builder-form-name">{form.name || 'Untitled form'}</span><StatusBadge status={form.status} /></div>
        <div className="builder-top-actions"><span className="save-feedback">{isSaving ? <><span className="spinner spinner-small" />Saving…</> : notice || (savedAt ? 'All changes saved' : 'Unsaved changes')}</span><ThemeToggle theme={theme} onToggle={onToggleTheme} /><button className="logout-button" onClick={onLogout}>Log out</button>{!previewOnly && <><button className="button button-secondary builder-save" disabled={isSaving || !canSave} onClick={() => save('draft')}>Save draft</button><button className="button button-primary" disabled={isSaving || !canSave} onClick={() => save('published')}><Icon name="check" size={16} />Publish</button></>}</div>
      </header>
      {notice && <div className="builder-toast" role="status"><Icon name="check" size={16} />{notice}</div>}

      <div className="builder-subbar"><div className="builder-sub-title"><span className="builder-sub-icon"><Icon name="edit" size={16} /></span><span><strong>Form builder</strong><small>Design your form and preview it live</small></span></div><div className="builder-tabs"><button className={activeTab === 'build' ? 'builder-tab-active' : ''} onClick={() => setActiveTab('build')}><Icon name="settings" size={15} />Build</button><button className={activeTab === 'preview' ? 'builder-tab-active' : ''} onClick={() => setActiveTab('preview')}><Icon name="eye" size={15} />Preview</button></div></div>

      {!previewOnly && activeTab === 'build' ? <main className="builder-workspace">
        <FieldPalettePanel onAdd={add} />
        <section className="builder-canvas-wrap"><div className="canvas-heading"><div><div className="eyebrow">DESIGN YOUR FORM</div><h1>Build your form</h1><p>Start with the basics, then add the questions you need.</p></div><span className="canvas-count">{form.fields?.length || 0} fields</span></div>
          <div className="form-meta-card"><div className="meta-card-accent" /><label className="meta-label">FORM NAME<input value={form.name || ''} onChange={(event) => dispatch(setMetadata({ name: event.target.value }))} placeholder="Give your form a name" /></label><label className="meta-label">DESCRIPTION <span className="optional-label">OPTIONAL</span><textarea rows="2" value={form.description || ''} onChange={(event) => dispatch(setMetadata({ description: event.target.value }))} placeholder="Tell people what this form is for" /></label></div>
          {form.fields?.length ? <div className="field-list">{form.fields.map((field, index) => <FieldEditor key={field.clientId || field.id || field._id || `field-${index}`} field={field} index={index} count={form.fields.length} onChange={update} onRemove={remove} onMove={move} />)}</div> : <div className="canvas-empty"><div className="canvas-empty-icon"><Icon name="plus" size={20} /></div><strong>Your form starts here</strong><span>Choose a field from the left panel to add your first question.</span></div>}
          {validationErrors.length > 0 && <div className="builder-error" role="alert"><Icon name="close" size={16} /><span>{validationErrors[0]}{validationErrors.length > 1 ? ` (+${validationErrors.length - 1} more)` : ''}</span></div>}
          {error && <div className="builder-error" role="alert"><Icon name="close" size={16} />{error}</div>}
          <div className="canvas-endnote"><Icon name="sparkle" size={14} /> Your changes are saved when you choose Save draft or Publish.</div>
        </section>
        <aside className="builder-preview-column"><LivePreview form={form} /></aside>
      </main> : <main className={`preview-page ${previewOnly ? 'preview-page-standalone' : ''}`}><div className="preview-page-heading"><div><div className="eyebrow">{previewOnly ? 'FORM VIEW' : 'CHECK YOUR DESIGN'}</div><h1>{previewOnly ? 'Form preview' : 'Preview your form'}</h1><p>See how your form will look to the people filling it out.</p></div>{previewOnly && <span className="preview-only-chip"><Icon name="eye" size={14} /> Preview only</span>}</div><div className="preview-page-card"><LivePreview form={form} standalone /></div><p className="preview-disclaimer">This is a preview. Form responses aren’t submitted or stored yet.</p></main>}
      <footer className="builder-footer"><span><span className="footer-status"><i /> All systems operational</span></span><span>{form.fields?.length || 0} questions</span></footer>
    </div>
  );
}
