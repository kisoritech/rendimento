-- Registro Financeiro: schema SQLite
-- Relacionamento: goals (1) -> transactions (N)

PRAGMA foreign_keys = ON;

-- Metas financeiras
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  target_amount REAL NOT NULL CHECK (target_amount > 0),
  period TEXT NOT NULL DEFAULT 'daily'
    CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Lançamentos de valores associados a uma meta
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE
);

-- Dicionário de dados
--
-- goals
--   id: identificador único da meta.
--   title: nome da meta, por exemplo "Viagem".
--   target_amount: valor total que deve ser alcançado.
--   period: ciclo da meta: daily, weekly ou monthly.
--   created_at: data e hora de criação.
--
-- transactions
--   id: identificador único do lançamento.
--   goal_id: referência obrigatória a goals.id.
--   amount: valor individual aportado.
--   date: data e hora do lançamento.
--
-- Ao excluir uma meta, seus lançamentos são removidos automaticamente.
