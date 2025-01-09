import React from 'react';
import { Typography, TextField, InputAdornment, Card } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

const Search: React.FC = () => {
  return (
    <div className="space-y-6">
      <Typography variant="h4" component="h1" className="mb-4">
        Search Stocks
      </Typography>

      <div className="max-w-2xl">
        <TextField
          fullWidth
          placeholder="Search for stocks..."
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon className="text-gray-400" />
              </InputAdornment>
            ),
          }}
          className="bg-white"
        />
      </div>

      <Card className="p-6">
        <Typography variant="body1" color="textSecondary">
          Search results will appear here
        </Typography>
      </Card>
    </div>
  );
};

export default Search;