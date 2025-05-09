import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { NetworkMap } from './NetworkMap';
import { FlowInspector } from './FlowInspector';
import { AlertFeed } from './AlertFeed';
import { QuickStats } from './QuickStats';

export const OverviewTab: React.FC = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Quick Stats</Typography>
            <QuickStats />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Network Map</Typography>
            <NetworkMap />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Flow Inspector</Typography>
            <FlowInspector />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Alerts</Typography>
            <AlertFeed />
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};
