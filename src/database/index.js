const goals = [];
const transactions = [];
let nextGoalId = 1;
let nextTransactionId = 1;

export function initDB() {
  return undefined;
}

export function createGoal(title, targetAmount, period = 'monthly') {
  const goal = { id: nextGoalId++, title, target_amount: targetAmount, period, created_at: new Date().toISOString() };
  goals.unshift(goal);
  return goal.id;
}

export function updateGoal(goalId, targetAmount) {
  const goal = goals.find((item) => item.id === goalId);
  if (goal) goal.target_amount = targetAmount;
}

export function addTransaction(goalId, amount, onGoalReached) {
  transactions.push({ id: nextTransactionId++, goal_id: goalId, amount, date: new Date().toISOString() });
  const goal = goals.find((item) => item.id === goalId);
  const total = transactions.filter((item) => item.goal_id === goalId).reduce((sum, item) => sum + item.amount, 0);
  if (goal && total >= goal.target_amount) onGoalReached?.(goal.title, total, goal.target_amount);
  return { total, target: goal?.target_amount ?? 0 };
}

export function getGoals() {
  return goals
    .slice()
    .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
    .map((goal) => ({
      ...goal,
      current_amount: transactions.filter((item) => item.goal_id === goal.id).reduce((sum, item) => sum + item.amount, 0),
    }));
}

export function getTransactions(goalId) {
  let balance = 0;
  return transactions
    .filter((item) => item.goal_id === goalId)
    .sort((first, second) => new Date(first.date) - new Date(second.date) || first.id - second.id)
    .map((item) => {
      balance += item.amount;
      return { ...item, balance_after: balance };
    })
    .reverse();
}
