import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Flow, Anomaly } from '../types/flows';
import { detectAnomalies } from '../utils/anomalyDetection';

type State = {
  flows: Flow[];
  anomalies: Anomaly[];
  stats: {
    totalBytes: number;
    totalPackets: number;
    topSources: string[];
    threatsByType: Record<string, number>;
  };
};

type Action =
  | { type: 'ADD_FLOWS'; payload: Flow[] }
  | { type: 'ADD_ANOMALY'; payload: Anomaly }
  | { type: 'UPDATE_STATS'; payload: Partial<State['stats']> }
  | { type: 'RESET_STATE' };

const initialState: State = {
  flows: [],
  anomalies: [],
  stats: {
    totalBytes: 0,
    totalPackets: 0,
    topSources: [],
    threatsByType: {}
  }
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_FLOWS':
      const newFlows = [...action.payload, ...state.flows].slice(0, 1000);
      
      // Calculate top sources
      const sourceCounts = newFlows.reduce((acc, flow) => {
        acc[flow.src_ip] = (acc[flow.src_ip] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip]) => ip);

      return {
        ...state,
        flows: newFlows,
        stats: {
          ...state.stats,
          totalBytes: newFlows.reduce((sum, f) => sum + f.total_bytes, 0),
          totalPackets: newFlows.reduce((sum, f) => sum + f.total_packets, 0),
          topSources
        }
      };

    case 'ADD_ANOMALY':
      const newAnomalies = [action.payload, ...state.anomalies].slice(0, 200);
      const threatsByType = newAnomalies.reduce((acc, anomaly) => {
        acc[anomaly.type] = (acc[anomaly.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        ...state,
        anomalies: newAnomalies,
        stats: {
          ...state.stats,
          threatsByType
        }
      };

    case 'UPDATE_STATS':
      return {
        ...state,
        stats: { ...state.stats, ...action.payload }
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
};

const FlowContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  resetState: () => void;
}>({
  state: initialState,
  dispatch: () => null,
  resetState: () => {}
});

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  return (
    <FlowContext.Provider value={{ state, dispatch, resetState }}>
      {children}
    </FlowContext.Provider>
  );
};

export const useFlows = () => {
  const context = useContext(FlowContext);
  if (!context) {
    throw new Error('useFlows must be used within a FlowProvider');
  }
  return context;
};