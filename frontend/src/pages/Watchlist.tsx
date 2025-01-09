import React from 'react';
import {
  Typography,
  Card,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon, TrendingUp } from '@mui/icons-material';

const Watchlist: React.FC = () => {
  // Placeholder watchlist data
  const watchlistItems = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: '$150.23', change: '+1.2%' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: '$2,750.50', change: '-0.5%' },
  ];

  return (
    <div className="space-y-6">
      <Typography variant="h4" component="h1" className="mb-4">
        Your Watchlist
      </Typography>

      <Card>
        <List>
          {watchlistItems.length > 0 ? (
            watchlistItems.map((item, index) => (
              <React.Fragment key={item.symbol}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete">
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.symbol}</span>
                        <span className="text-gray-500 text-sm">{item.name}</span>
                      </div>
                    }
                    secondary={
                      <div className="flex items-center space-x-4">
                        <span>{item.price}</span>
                        <span className={item.change.startsWith('+') ? 'text-success' : 'text-danger'}>
                          <TrendingUp className="h-4 w-4 inline mr-1" />
                          {item.change}
                        </span>
                      </div>
                    }
                  />
                </ListItem>
                {index < watchlistItems.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <ListItem>
              <ListItemText
                primary="No stocks in watchlist"
                secondary="Add stocks to track them here"
              />
            </ListItem>
          )}
        </List>
      </Card>
    </div>
  );
};

export default Watchlist;