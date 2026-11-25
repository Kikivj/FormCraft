import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { formsApi } from '../services/formsApi';

const blankForm = () => ({ name: 'Untitled form', description: '', fields: [], status: 'draft' });

export const loadBuilderForm = createAsyncThunk('builder/load', async (id, { rejectWithValue }) => {
  try {
    return (await formsApi.get(id)).form;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const saveBuilderForm = createAsyncThunk('builder/save', async ({ form, status }, { rejectWithValue }) => {
  try {
    const payload = { ...form, status };
    const formId = form.id || form._id;
    const result = formId
      ? await formsApi.update(formId, payload)
      : await formsApi.create(payload);
    return result.form;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const builderSlice = createSlice({
  name: 'builder',
  initialState: { current: blankForm(), loadStatus: 'idle', saveStatus: 'idle', error: null, savedAt: null },
  reducers: {
    startNewForm(state) {
      state.current = blankForm(); state.loadStatus = 'idle'; state.saveStatus = 'idle'; state.error = null; state.savedAt = null;
    },
    setMetadata(state, action) { Object.assign(state.current, action.payload); state.error = null; },
    addField(state, action) { state.current.fields.push(action.payload); state.error = null; },
    updateField(state, action) {
      const { index, changes } = action.payload;
      if (state.current.fields[index]) Object.assign(state.current.fields[index], changes);
      state.error = null;
    },
    removeField(state, action) { state.current.fields.splice(action.payload, 1); state.error = null; },
    reorderFields(state, action) {
      const { from, to } = action.payload;
      if (from === to || !state.current.fields[from] || to < 0 || to >= state.current.fields.length) return;
      const [moved] = state.current.fields.splice(from, 1);
      state.current.fields.splice(to, 0, moved);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadBuilderForm.pending, (state) => { state.loadStatus = 'loading'; state.error = null; })
      .addCase(loadBuilderForm.fulfilled, (state, action) => { state.loadStatus = 'succeeded'; state.current = action.payload; })
      .addCase(loadBuilderForm.rejected, (state, action) => { state.loadStatus = 'failed'; state.error = action.payload || action.error.message; })
      .addCase(saveBuilderForm.pending, (state) => { state.saveStatus = 'loading'; state.error = null; })
      .addCase(saveBuilderForm.fulfilled, (state, action) => { state.saveStatus = 'succeeded'; state.current = action.payload; state.savedAt = Date.now(); })
      .addCase(saveBuilderForm.rejected, (state, action) => { state.saveStatus = 'failed'; state.error = action.payload || action.error.message; });
  },
});

export const { startNewForm, setMetadata, addField, updateField, removeField, reorderFields } = builderSlice.actions;
export default builderSlice.reducer;
