import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { formsApi } from '../services/formsApi';

export const fetchSubmissions = createAsyncThunk('submissions/fetchPage', async ({ formId, page = 1, limit = 10 }, { rejectWithValue }) => {
  try { return await formsApi.listSubmissions(formId, page, limit); }
  catch (error) { return rejectWithValue(error.message); }
});

export const fetchSubmission = createAsyncThunk('submissions/fetchOne', async ({ formId, submissionId }, { rejectWithValue }) => {
  try { return { formId, ...(await formsApi.getSubmission(formId, submissionId)) }; }
  catch (error) { return rejectWithValue(error.message); }
});

export const deleteSubmission = createAsyncThunk('submissions/delete', async ({ formId, submissionId }, { rejectWithValue }) => {
  try {
    await formsApi.deleteSubmission(formId, submissionId);
    return { formId, submissionId };
  } catch (error) { return rejectWithValue(error.message); }
});

const submissionsSlice = createSlice({
  name: 'submissions',
  initialState: {
    items: [], total: 0, page: 1, limit: 10, totalPages: 0, form: null,
    status: 'idle', error: null, selected: null, detailStatus: 'idle', detailError: null,
    deleteStatus: 'idle', deleteError: null,
  },
  reducers: {
    clearSelectedSubmission(state) { state.selected = null; state.detailStatus = 'idle'; state.detailError = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchSubmissions.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchSubmissions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.submissions;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
        state.form = action.payload.form;
      })
      .addCase(fetchSubmissions.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || action.error.message; })
      .addCase(fetchSubmission.pending, (state) => { state.detailStatus = 'loading'; state.detailError = null; state.selected = null; })
      .addCase(fetchSubmission.fulfilled, (state, action) => { state.detailStatus = 'succeeded'; state.selected = action.payload.submission; })
      .addCase(fetchSubmission.rejected, (state, action) => { state.detailStatus = 'failed'; state.detailError = action.payload || action.error.message; })
      .addCase(deleteSubmission.pending, (state) => { state.deleteStatus = 'loading'; state.deleteError = null; })
      .addCase(deleteSubmission.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.items = state.items.filter((item) => item._id !== action.payload.submissionId);
        state.total = Math.max(0, state.total - 1);
        if (state.selected?._id === action.payload.submissionId) state.selected = null;
      })
      .addCase(deleteSubmission.rejected, (state, action) => { state.deleteStatus = 'failed'; state.deleteError = action.payload || action.error.message; });
  },
});

export const { clearSelectedSubmission } = submissionsSlice.actions;
export default submissionsSlice.reducer;
