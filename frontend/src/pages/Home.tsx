import React from 'react';
import { Typography } from '@mui/material';

const Home: React.FC = () => {
  return (
    <div>
      <Typography variant="h4" component="h1" className="mb-4">
        Welcome to Stockit
      </Typography>
      <Typography variant="body1">
        Your personal stock market assistant
      </Typography>
    </div>
  );
};

export default Home;