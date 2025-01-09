import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from .model_service import StockPredictionModel

class EnhancedPredictionService:
    def __init__(self):
        self.base_model = StockPredictionModel()
        self.confidence_threshold = 0.75  # Minimum confidence level for signals

    def analyze_wall_street_ratings(self, analyst_ratings: List[Dict]) -> Dict:
        """
        Analyze Wall Street analyst ratings and recommendations
        
        Args:
            analyst_ratings: List of dictionaries containing analyst ratings
                [{ 'firm': str, 'rating': str, 'target_price': float, 'date': datetime }]
        
        Returns:
            Dictionary containing analyzed metrics
        """
        if not analyst_ratings:
            return {
                'consensus': 'NEUTRAL',
                'average_target': None,
                'confidence': 0.0
            }

        # Calculate consensus metrics
        ratings_map = {'BUY': 1, 'HOLD': 0, 'SELL': -1}
        valid_ratings = [r for r in analyst_ratings if r['rating'] in ratings_map]
        
        if not valid_ratings:
            return {
                'consensus': 'NEUTRAL',
                'average_target': None,
                'confidence': 0.0
            }

        # Get recent ratings (last 30 days)
        recent_cutoff = datetime.now() - timedelta(days=30)
        recent_ratings = [r for r in valid_ratings if r['date'] >= recent_cutoff]
        
        if recent_ratings:
            # Calculate weighted consensus based on recency
            total_weight = 0
            weighted_sum = 0
            target_prices = []

            for rating in recent_ratings:
                # More recent ratings get higher weight
                days_old = (datetime.now() - rating['date']).days
                weight = 1 / (days_old + 1)  # Avoid division by zero
                
                weighted_sum += ratings_map[rating['rating']] * weight
                total_weight += weight
                
                if rating['target_price']:
                    target_prices.append(rating['target_price'])

            consensus_score = weighted_sum / total_weight
            
            # Determine consensus rating
            if consensus_score >= 0.5:
                consensus = 'BUY'
            elif consensus_score <= -0.5:
                consensus = 'SELL'
            else:
                consensus = 'HOLD'

            # Calculate confidence based on agreement among analysts
            unique_ratings = len(set(r['rating'] for r in recent_ratings))
            confidence = 1 - (unique_ratings - 1) / 2  # 1.0 if all agree, 0.0 if equal split

            return {
                'consensus': consensus,
                'average_target': np.mean(target_prices) if target_prices else None,
                'confidence': confidence
            }
        
        return {
            'consensus': 'NEUTRAL',
            'average_target': None,
            'confidence': 0.0
        }

    def analyze_insider_trading(self, insider_trades: List[Dict]) -> Dict:
        """
        Analyze insider trading patterns
        
        Args:
            insider_trades: List of dictionaries containing insider trading data
                [{ 'type': str, 'shares': int, 'price': float, 'date': datetime }]
        
        Returns:
            Dictionary containing analyzed metrics
        """
        if not insider_trades:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0.0,
                'net_shares': 0
            }

        # Focus on recent trades (last 90 days)
        recent_cutoff = datetime.now() - timedelta(days=90)
        recent_trades = [t for t in insider_trades if t['date'] >= recent_cutoff]

        if recent_trades:
            buy_volume = sum(t['shares'] for t in recent_trades if t['type'] == 'BUY')
            sell_volume = sum(t['shares'] for t in recent_trades if t['type'] == 'SELL')
            net_shares = buy_volume - sell_volume

            # Calculate buy/sell ratio
            total_volume = buy_volume + sell_volume
            if total_volume > 0:
                buy_ratio = buy_volume / total_volume
                
                # Determine signal based on buy ratio
                if buy_ratio >= 0.7:  # Strong buying
                    signal = 'BUY'
                    confidence = min(1.0, buy_ratio)
                elif buy_ratio <= 0.3:  # Strong selling
                    signal = 'SELL'
                    confidence = min(1.0, 1 - buy_ratio)
                else:
                    signal = 'NEUTRAL'
                    confidence = 0.5
            else:
                signal = 'NEUTRAL'
                confidence = 0.0

            return {
                'signal': signal,
                'confidence': confidence,
                'net_shares': net_shares
            }

        return {
            'signal': 'NEUTRAL',
            'confidence': 0.0,
            'net_shares': 0
        }

    def analyze_historical_performance(
        self, 
        historical_prices: List[float],
        historical_volume: List[float],
        market_prices: List[float]  # e.g., S&P 500 for same period
    ) -> Dict:
        """
        Analyze historical stock performance relative to market
        
        Args:
            historical_prices: List of historical stock prices
            historical_volume: List of historical trading volumes
            market_prices: List of market index prices for the same period
        
        Returns:
            Dictionary containing analyzed metrics
        """
        if len(historical_prices) < 2:
            return {
                'trend': 'NEUTRAL',
                'strength': 0.0,
                'volatility': 0.0,
                'market_correlation': 0.0
            }

        # Calculate returns
        stock_returns = np.diff(historical_prices) / historical_prices[:-1]
        market_returns = np.diff(market_prices) / market_prices[:-1]

        # Calculate metrics
        volatility = np.std(stock_returns)
        market_correlation = np.corrcoef(stock_returns, market_returns)[0, 1]

        # Calculate trend strength using volume-weighted price change
        price_changes = np.diff(historical_prices)
        volume_weights = historical_volume[1:] / np.mean(historical_volume[1:])
        weighted_changes = price_changes * volume_weights
        trend_strength = np.sum(weighted_changes) / len(weighted_changes)

        # Determine trend
        if trend_strength > volatility:
            trend = 'BULLISH'
            strength = min(1.0, abs(trend_strength / volatility))
        elif trend_strength < -volatility:
            trend = 'BEARISH'
            strength = min(1.0, abs(trend_strength / volatility))
        else:
            trend = 'NEUTRAL'
            strength = 0.0

        return {
            'trend': trend,
            'strength': strength,
            'volatility': volatility,
            'market_correlation': market_correlation
        }

    def generate_enhanced_prediction(
        self,
        historical_data: Dict[str, List],
        analyst_ratings: List[Dict],
        insider_trades: List[Dict],
        prediction_days: int
    ) -> Dict:
        """
        Generate enhanced prediction combining all analysis factors
        """
        # Get base model prediction
        base_predictions = self.base_model.predict(
            historical_data['prices'], 
            prediction_days
        )

        # Get analysis results
        wall_street = self.analyze_wall_street_ratings(analyst_ratings)
        insider = self.analyze_insider_trading(insider_trades)
        historical = self.analyze_historical_performance(
            historical_data['prices'],
            historical_data['volume'],
            historical_data['market_prices']
        )

        # Combine signals
        signals = []
        confidences = []

        # Wall Street signal
        if wall_street['confidence'] >= self.confidence_threshold:
            signals.append(wall_street['consensus'])
            confidences.append(wall_street['confidence'])

        # Insider trading signal
        if insider['confidence'] >= self.confidence_threshold:
            signals.append(insider['signal'])
            confidences.append(insider['confidence'])

        # Historical trend signal
        if historical['strength'] >= self.confidence_threshold:
            signals.append('BUY' if historical['trend'] == 'BULLISH' else 'SELL')
            confidences.append(historical['strength'])

        # Determine final signal
        if signals:
            # Weight signals by confidence
            buy_weight = sum(conf for sig, conf in zip(signals, confidences) if sig == 'BUY')
            sell_weight = sum(conf for sig, conf in zip(signals, confidences) if sig == 'SELL')
            
            if buy_weight > sell_weight:
                final_signal = 'BUY'
                confidence = buy_weight / sum(confidences)
            elif sell_weight > buy_weight:
                final_signal = 'SELL'
                confidence = sell_weight / sum(confidences)
            else:
                final_signal = 'NEUTRAL'
                confidence = 0.5
        else:
            final_signal = 'NEUTRAL'
            confidence = 0.0

        return {
            'predictions': base_predictions,
            'signal': final_signal,
            'confidence': confidence,
            'analysis': {
                'wall_street': wall_street,
                'insider_trading': insider,
                'historical': historical
            }
        }