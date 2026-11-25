import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { formsApi } from '../services/formsApi';

export const fetchForms = createAsyncThunk('forms/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return (await formsApi.list()).forms;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const deleteForm = createAsyncThunk('forms/delete', async (id, { rejectWithValue }) => {
  try {
    await formsApi.remove(id);
    return id;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const formsSlice = createSlice({
  name: 'forms',
  initialState: { items: [], status: 'idle', error: null, deleteStatus: 'idle' },
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchForms.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchForms.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchForms.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || action.error.message; })
      .addCase(deleteForm.pending, (state) => { state.deleteStatus = 'loading'; state.error = null; })
      .addCase(deleteForm.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.items = state.items.filter((form) => form._id !== action.payload);
      })
      .addCase(deleteForm.rejected, (state, action) => { state.deleteStatus = 'failed'; state.error = action.payload || action.error.message; });
  },
});

export default formsSlice.reducer;
