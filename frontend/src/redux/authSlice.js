import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../services/formsApi';

export const checkSession = createAsyncThunk('auth/checkSession', async (_, { rejectWithValue }) => {
  try { return (await authApi.me()).user; }
  catch (error) { return rejectWithValue(error.message); }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try { return (await authApi.login(credentials)).user; }
  catch (error) { return rejectWithValue(error.message); }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try { return await authApi.logout(); }
  catch (error) { return rejectWithValue(error.message); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { status: 'checking', user: null, error: null },
  reducers: {
    clearAuth(state) { state.status = 'unauthenticated'; state.user = null; state.error = null; },
  },
  extraReducers(builder) {
    builder
      .addCase(checkSession.pending, (state) => { state.status = 'checking'; })
      .addCase(checkSession.fulfilled, (state, action) => { state.status = 'authenticated'; state.user = action.payload; state.error = null; })
      .addCase(checkSession.rejected, (state) => { state.status = 'unauthenticated'; state.user = null; })
      .addCase(login.pending, (state) => { state.status = 'signingIn'; state.error = null; })
      .addCase(login.fulfilled, (state, action) => { state.status = 'authenticated'; state.user = action.payload; state.error = null; })
      .addCase(login.rejected, (state, action) => { state.status = 'unauthenticated'; state.user = null; state.error = action.payload || action.error.message; })
      .addCase(logout.pending, (state) => { state.status = 'signingOut'; })
      .addCase(logout.fulfilled, (state) => { state.status = 'unauthenticated'; state.user = null; state.error = null; })
      .addCase(logout.rejected, (state) => { state.status = 'unauthenticated'; state.user = null; state.error = null; });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;
