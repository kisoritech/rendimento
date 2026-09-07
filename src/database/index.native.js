import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finance.db');

export function initDB() {
  db.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL CHECK (target_amount > 0),
      period TEXT CHECK (period IN ('daily', 'weekly', 'monthly')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE
    );
  `);
}

export function createGoal(title, targetAmount, period = 'monthly') {
  const result = db.runSync(
    'INSERT INTO goals (title, target_amount, period) VALUES (?, ?, ?);',
    [title, targetAmount, period]
  );

  return result.lastInsertRowId;
}

export function updateGoal(goalId, targetAmount) {
  db.runSync(
    'UPDATE goals SET target_amount = ? WHERE id = ?;',
    [targetAmount, goalId]
  );
}

export function addTransaction(goalId, amount, onGoalReached) {
  db.runSync(
    'INSERT INTO transactions (goal_id, amount) VALUES (?, ?);',
    [goalId, amount]
  );

  const goal = db.getFirstSync(
    'SELECT target_amount, title FROM goals WHERE id = ?;',
    [goalId]
  );
  const totalResult = db.getFirstSync(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE goal_id = ?;',
    [goalId]
  );
  const total = totalResult?.total ?? 0;

  if (goal && total >= goal.target_amount) {
    onGoalReached?.(goal.title, total, goal.target_amount);
  }

  return { total, target: goal?.target_amount ?? 0 };
}

export function getGoals() {
  return db.getAllSync(`
    SELECT
      goals.*,
      COALESCE(SUM(transactions.amount), 0) AS current_amount
    FROM goals
    LEFT JOIN transactions ON transactions.goal_id = goals.id
    GROUP BY goals.id
    ORDER BY goals.created_at DESC;
  `);
}

export function getTransactions(goalId) {
  return db.getAllSync(
    `
      SELECT
        id,
        goal_id,
        amount,
        date,
        SUM(amount) OVER (
          PARTITION BY goal_id
          ORDER BY date, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS balance_after
      FROM transactions
      WHERE goal_id = ?
      ORDER BY date DESC, id DESC;
    `,
    [goalId]
  );
}
