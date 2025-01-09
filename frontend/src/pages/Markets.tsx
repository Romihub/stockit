import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Tabs, 
  Tab, 
  Paper
} from '@mui/material';
import {
  TrendingUp,
  ShowChart,
  Assessment,
  Timeline
} from '@mui/icons-material';
import { BlueChipScanner } from '../components/stock';
import { EnhancedPrediction } from '../components/stock';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`market-tabpanel-${index}`}
      aria-labelledby={`market-tab-${index}`}
      className="py-4"
      {...other}
    >
      {value === index && children}
    </div>
  );
};

const Markets: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white py-4 border-b shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4">
          <Typography variant="h4" component="h1" className="text-2xl sm:text-3xl font-bold">
            Markets Overview
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" className="mt-2">
            Your personal stock market assistant
          </Typography>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <Paper className="overflow-hidden">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="border-b border-gray-200"
          >
            <Tab 
              icon={<TrendingUp />} 
              label="Blue-Chip Scanner" 
              iconPosition="start"
            />
            <Tab 
              icon={<Assessment />} 
              label="Enhanced Predictions" 
              iconPosition="start"
            />
            <Tab 
              icon={<ShowChart />} 
              label="Market Trends" 
              iconPosition="start"
            />
            <Tab 
              icon={<Timeline />} 
              label="Sector Analysis" 
              iconPosition="start"
            />
          </Tabs>

          <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
            <TabPanel value={activeTab} index={0}>
              <BlueChipScanner />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <div className="space-y-4">
                <Typography variant="h6" component="h2">
                  Enhanced Stock Analysis
                </Typography>
                {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'].map((symbol) => (
                  <div key={symbol} className="mb-6">
                    <EnhancedPrediction
                      data={{
                        symbol,
                        predictions: Array(7).fill(0).map(() => Math.random() * 100 + 100),
                        signal: Math.random() > 0.5 ? "BUY" : "SELL",
                        confidence: Math.random() * 0.3 + 0.7,
                        analysis: {
                          wall_street: {
                            consensus: Math.random() > 0.5 ? "BUY" : "SELL",
                            average_target: Math.random() * 50 + 100,
                            confidence: Math.random() * 0.3 + 0.7
                          },
                          insider_trading: {
                            signal: Math.random() > 0.5 ? "BUY" : "SELL",
                            confidence: Math.random() * 0.3 + 0.7,
                            net_shares: Math.floor(Math.random() * 10000) - 5000
                          },
                          historical: {
                            trend: Math.random() > 0.5 ? "BULLISH" : "BEARISH",
                            strength: Math.random() * 0.3 + 0.7,
                            volatility: Math.random() * 0.3,
                            market_correlation: Math.random() * 0.5 + 0.5
                          }
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Card className="p-6">
                <Typography variant="body1">
                  Market trends analysis coming soon...
                </Typography>
              </Card>
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <Card className="p-6">
                <Typography variant="body1">
                  Sector analysis coming soon...
                </Typography>
              </Card>
            </TabPanel>
          </div>
        </Paper>
      </div>
    </div>
  );
};

export default Markets;