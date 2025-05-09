import React from 'react';
import { FlowProvider } from './context/FlowContext';
import { useWebSocket } from './hooks/useWebSocket';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { NetworkMap } from './components/sections/NetworkMap';
import { FlowInspector } from './components/sections/FlowInspector';
import { AlertFeed } from './components/sections/AlertFeed';
import { QuickStats } from './components/sections/QuickStats';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  GlobalStyles
} from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            margin: 0,
            padding: 0,
            minHeight: '100vh',
          },
          '#root': {
            minHeight: '100vh',
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: '#90caf9 #1e1e1e',
          },
          '*::-webkit-scrollbar': {
            width: '8px',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: '#90caf9',
            borderRadius: '8px',
          },
        }}
      />
      <FlowProvider>
        <DashboardContent />
      </FlowProvider>
    </ThemeProvider>
  );
};

const DashboardContent: React.FC = () => {
  useWebSocket('ws://localhost:8888/flows/ws');

  return (
    <DashboardLayout>
      <Box sx={{ gridArea: 'stats' }}>
        <QuickStats />
      </Box>

      <Box sx={{ gridArea: 'map', overflow: 'hidden' }}>
        <NetworkMap />
      </Box>

      <Box sx={{ gridArea: 'alerts', overflowY: 'auto' }}>
        <AlertFeed />
      </Box>

      <Box
        sx={{
          gridArea: 'flows',
          overflowY: 'auto',
          height: '100%',
          maxHeight: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 2,
        }}
      >
        <FlowInspector />
      </Box>
    </DashboardLayout>
  );
};

export default App;
