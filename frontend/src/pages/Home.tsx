import React, { useEffect, useState } from 'react';
import { Typography, List, ListItem, ListItemText } from '@mui/material';
import stockService from '../services/stock.service';
import { BlueChipStock } from '../types/stock';

const Home: React.FC = () => {
  const [blueChipStocks, setBlueChipStocks] = useState<BlueChipStock[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchBlueChipStocks = async () => {
      try {
        const data = await stockService.getBlueChipStocks();
        setBlueChipStocks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch blue-chip stocks');
      }
    };

    fetchBlueChipStocks();
  }, []);

  return (
    <div>
      <Typography variant="h4" component="h1" className="mb-4">
        Welcome to Stockit
      </Typography>
      <Typography variant="body1" className="mb-4">
        Your personal stock market assistant
      </Typography>

      {error && (
        <Typography color="error" variant="body1">
          {error}
        </Typography>
      )}

      <Typography variant="h5" component="h2" className="mt-4">
        Blue-Chip Stocks
      </Typography>
      <List>
        {blueChipStocks.map((stock) => (
          <ListItem
            key={stock.symbol}
            button
            component="a"
            href={`/stocks/${stock.symbol}`}
          >
            <ListItemText
              primary={`${stock.name} (${stock.symbol})`}
              secondary={`Market Cap: $${(stock.market_cap / 1e9).toFixed(2)}B`}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default Home;
