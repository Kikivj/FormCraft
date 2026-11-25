import { configureStore } from '@reduxjs/toolkit';
import formsReducer from './formsSlice';
import builderReducer from './builderSlice';
import submissionsReducer from './submissionsSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    forms: formsReducer,
    builder: builderReducer,
    submissions: submissionsReducer,
    auth: authReducer,
  },
});
