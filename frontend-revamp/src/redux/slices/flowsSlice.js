import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  flows: [],
  isLoading: true,
};

export const flowsSlice = createSlice({
  name: 'flows',
  initialState,
  reducers: {
    setFlows: (state, action) => {
      state.flows = action.payload;
    },
    addFlow: (state, action) => {
      // Add new flow at the beginning and keep maximum 1000 flows
      state.flows = [action.payload, ...state.flows].slice(0, 1000);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setFlows, addFlow, setLoading } = flowsSlice.actions;

export const selectFlows = (state) => state.flows.flows;
export const selectIsLoading = (state) => state.flows.isLoading;

export default flowsSlice.reducer;
