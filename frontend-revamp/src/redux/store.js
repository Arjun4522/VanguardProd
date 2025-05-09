import { configureStore } from '@reduxjs/toolkit';
import flowsReducer from './slices/flowsSlice';
import alertsReducer from './slices/alertsSlice';

const rootReducer = {
  flows: flowsReducer,
  alerts: alertsReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  devTools: import.meta.env?.MODE !== 'production',  // if using Vite
});
