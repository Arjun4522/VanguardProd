import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  alerts: [],
};

export const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action) => {
      state.alerts = action.payload;
    },
    addAlerts: (state, action) => {
      const incomingAlerts = Array.isArray(action.payload) ? action.payload : [action.payload];
      state.alerts = [...incomingAlerts, ...state.alerts].slice(0, 100);
    },
    clearAlert: (state, action) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
    },
    clearAllAlerts: (state) => {
      state.alerts = [];
    },
  },
});

export const { setAlerts, addAlerts, clearAlert, clearAllAlerts } = alertsSlice.actions;

export const selectAlerts = (state) => state.alerts.alerts;

export default alertsSlice.reducer;