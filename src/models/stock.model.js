const { pool } = require('../config/database');

class Stock {
  static async create({ symbol, name, exchange }) {
    const query = `
      INSERT INTO stocks (symbol, name, exchange)
      VALUES ($1, $2, $3)
      RETURNING id, symbol, name, exchange, created_at
    `;
    const values = [symbol, name, exchange];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async findBySymbol(symbol) {
    const query = 'SELECT * FROM stocks WHERE symbol = $1';
    const { rows } = await pool.query(query, [symbol]);
    return rows[0];
  }

  static async addToFavorites(userId, stockId) {
    const query = `
      INSERT INTO user_stocks (user_id, stock_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [userId, stockId]);
    return rows[0];
  }

  static async removeFromFavorites(userId, stockId) {
    const query = `
      DELETE FROM user_stocks
      WHERE user_id = $1 AND stock_id = $2
    `;
    await pool.query(query, [userId, stockId]);
  }

  static async getFavorites(userId) {
    const query = `
      SELECT s.* FROM stocks s
      JOIN user_stocks us ON s.id = us.stock_id
      WHERE us.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }
}

module.exports = Stock;