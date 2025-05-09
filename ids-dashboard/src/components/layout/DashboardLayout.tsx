import React from 'react';
import { styled } from '@mui/material/styles';
import { Box } from '@mui/material';

const StyledGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  height: '100vh',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: 'auto 1fr 1fr',
  gridTemplateAreas: `
    "stats stats"
    "map alerts"
    "flows flows"
  `,
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'auto auto auto auto',
    gridTemplateAreas: `
      "stats"
      "map"
      "alerts"
      "flows"
    `,
  },
}));

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StyledGrid>
      {children}
    </StyledGrid>
  );
};
