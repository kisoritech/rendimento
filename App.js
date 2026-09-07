import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addTransaction, createGoal, getGoals, getTransactions, initDB, updateGoal } from './src/database';

const tabs = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'charts', label: 'Gráficos' },
  { key: 'table', label: 'Histórico' },
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value, withTime = false) {
  const date = new Date(value);
  return date.toLocaleString('pt-BR', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseAmount(value) {
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function Card({ children, wide = false, style }) {
  return <View style={[styles.card, wide && styles.cardWide, style]}>{children}</View>;
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export default function App() {
  const [goals, setGoals] = useState([]);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [amountInput, setAmountInput] = useState('50');
  const [targetInput, setTargetInput] = useState('200');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('200');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const goal = goals.find((item) => item.id === activeGoalId) || goals[0] || null;

  const refreshGoals = (preferredGoalId = activeGoalId) => {
    const storedGoals = getGoals();
    const selectedGoal = storedGoals.find((item) => item.id === preferredGoalId) || storedGoals[0] || null;
    setGoals(storedGoals);
    setActiveGoalId(selectedGoal?.id ?? null);
  };

  useEffect(() => {
    initDB();
    let storedGoals = getGoals();
    if (storedGoals.length === 0) {
      createGoal('Reserva mensal', 200, 'monthly');
      storedGoals = getGoals();
    }
    setGoals(storedGoals);
    setActiveGoalId(storedGoals[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!goal) {
      setHistory([]);
      return;
    }
    setTargetInput(String(goal.target_amount));
    setHistory(getTransactions(goal.id));
  }, [activeGoalId, goals]);

  const progress = goal ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const remaining = goal ? Math.max(goal.target_amount - goal.current_amount, 0) : 0;
  const lastTransaction = history[0];
  const weeklyTotals = useMemo(() => {
    const totals = [0, 0, 0, 0];
    history.forEach((item) => {
      const day = new Date(item.date).getDate();
      totals[Math.min(Math.floor((day - 1) / 7), 3)] += Number(item.amount);
    });
    return totals;
  }, [history]);

  const handleAddMoney = () => {
    const parsedAmount = parseAmount(amountInput);
    if (!goal || parsedAmount <= 0) {
      Alert.alert('Valor inválido', 'Digite um aporte maior que zero.');
      return;
    }
    if (remaining <= 0) {
      Alert.alert('Meta atingida', 'Essa meta já foi concluída.');
      return;
    }
    const amount = Math.min(parsedAmount, remaining);
    addTransaction(goal.id, amount, (title, current, target) => {
      Alert.alert(
        'Parabéns! Meta alcançada!',
        'Você atingiu "' + title + '"!\nValor acumulado: ' + formatCurrency(current) + ' / ' + formatCurrency(target),
      );
    });
    refreshGoals(goal.id);
  };

  const handleUpdateGoal = () => {
    const target = parseAmount(targetInput);
    if (!goal || target <= 0) {
      Alert.alert('Meta inválida', 'Digite um valor maior que zero.');
      return;
    }
    updateGoal(goal.id, target);
    refreshGoals(goal.id);
  };

  const handleCreateGoal = () => {
    const title = newGoalTitle.trim();
    const target = parseAmount(newGoalTarget);
    if (!title) {
      Alert.alert('Nome obrigatório', 'Informe um nome para a nova meta.');
      return;
    }
    if (target <= 0) {
      Alert.alert('Meta inválida', 'Digite um valor maior que zero.');
      return;
    }
    const newGoalId = createGoal(title, target, 'monthly');
    setNewGoalTitle('');
    setNewGoalTarget('200');
    setIsAddingGoal(false);
    refreshGoals(newGoalId);
    setActiveTab('overview');
  };

  if (!goal) {
    return <View style={styles.loading}><Text>Inicializando banco de dados...</Text></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.appEyebrow}>REGISTRO FINANCEIRO</Text>
            <Text style={styles.title}>{goal.title}</Text>
            <Text style={styles.subtitle}>Acompanhe suas metas e aportes com clareza</Text>
          </View>
          <Text style={styles.dateBadge}>{formatDate(new Date())}</Text>
        </View>

        <View style={styles.goalToolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalList}>
            {goals.map((item) => (
              <Pressable key={item.id} onPress={() => setActiveGoalId(item.id)} style={[styles.goalChip, item.id === goal.id && styles.activeGoalChip]}>
                <Text style={[styles.goalChipText, item.id === goal.id && styles.activeGoalChipText]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.goalChipAmount, item.id === goal.id && styles.activeGoalChipText]}>{formatCurrency(item.current_amount)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.outlineButton} onPress={() => setIsAddingGoal((current) => !current)}>
            <Text style={styles.outlineButtonText}>{isAddingGoal ? 'Fechar' : '+ Nova meta'}</Text>
          </Pressable>
        </View>

        {isAddingGoal && (
          <Card wide style={styles.newGoalCard}>
            <Label>Criar nova meta</Label>
            <View style={styles.newGoalFields}>
              <View style={styles.fieldGrow}>
                <Text style={styles.inputLabel}>Nome da meta</Text>
                <TextInput value={newGoalTitle} onChangeText={setNewGoalTitle} placeholder="Ex: Viagem, emergência..." placeholderTextColor="#94a3b8" style={styles.input} />
              </View>
              <View style={styles.targetField}>
                <Text style={styles.inputLabel}>Valor alvo (R$)</Text>
                <TextInput value={newGoalTarget} onChangeText={setNewGoalTarget} keyboardType="decimal-pad" style={styles.input} />
              </View>
              <Pressable style={styles.primaryButton} onPress={handleCreateGoal}><Text style={styles.primaryButtonText}>Criar meta</Text></Pressable>
            </View>
          </Card>
        )}

        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'overview' && (
          <View style={styles.grid}>
            <Card>
              <Label>Valor atual</Label>
              <Text style={styles.bigValue}>{formatCurrency(goal.current_amount)} <Text style={styles.targetValue}>/ {formatCurrency(goal.target_amount)}</Text></Text>
              <Text style={styles.muted}>{progress >= 100 ? 'Meta atingida!' : 'Faltam ' + formatCurrency(remaining)}</Text>
              <View style={styles.progressHeader}><Text>Progresso</Text><Text>{Math.round(progress)}%</Text></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progress + '%' }]} /></View>
              <View style={styles.editBox}>
                <Text style={styles.inputLabel}>Valor do aporte (R$)</Text>
                <TextInput value={amountInput} onChangeText={setAmountInput} keyboardType="decimal-pad" placeholder="Ex: 50" style={styles.input} />
                <Pressable style={[styles.primaryButton, remaining <= 0 && styles.disabledButton]} onPress={handleAddMoney} disabled={remaining <= 0}><Text style={styles.primaryButtonText}>+ Adicionar aporte</Text></Pressable>
              </View>
            </Card>
            <Card>
              <Label>Resumo da meta</Label>
              <View style={styles.summaryList}>
                <SummaryRow label="Valor alvo" value={formatCurrency(goal.target_amount)} />
                <SummaryRow label="Total aportado" value={formatCurrency(goal.current_amount)} />
                <SummaryRow label="Quantidade de aportes" value={String(history.length)} />
                <SummaryRow label="Último aporte" value={lastTransaction ? formatDate(lastTransaction.date, true) : '-'} />
              </View>
              <View style={styles.editBox}>
                <Text style={styles.inputLabel}>Definir novo valor alvo (R$)</Text>
                <View style={styles.inlineInput}>
                  <TextInput value={targetInput} onChangeText={setTargetInput} keyboardType="decimal-pad" style={[styles.input, styles.flexInput]} />
                  <Pressable style={styles.primaryButton} onPress={handleUpdateGoal}><Text style={styles.primaryButtonText}>Salvar</Text></Pressable>
                </View>
              </View>
            </Card>
          </View>
        )}
        {activeTab === 'charts' && <Charts goal={goal} history={history} weeklyTotals={weeklyTotals} progress={progress} />}
        {activeTab === 'table' && <HistoryTable history={history} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }) {
  return <View style={styles.summaryRow}><Text style={styles.muted}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function Charts({ goal, history, weeklyTotals, progress }) {
  const maxWeek = Math.max(...weeklyTotals, 1);
  return (
    <View style={styles.grid}>
      <Card wide>
        <Label>Evolução da reserva</Label>
        <View style={styles.chartArea}>
          {history.length === 0 ? <Text style={styles.muted}>Adicione um aporte para visualizar a evolução.</Text> : history.slice().reverse().map((item) => (
            <View key={item.id} style={styles.chartColumn}>
              <View style={[styles.chartBar, { height: Math.max((item.balance_after / goal.target_amount) * 160, 8) }]} />
              <Text style={styles.chartCaption}>{formatDate(item.date).slice(0, 5)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Label>Distribuição por semana</Label>
        <View style={styles.weekChart}>{weeklyTotals.map((value, index) => (
          <View key={index} style={styles.weekColumn}><View style={[styles.weekBar, { height: Math.max((value / maxWeek) * 130, 6) }]} /><Text style={styles.chartCaption}>Sem {index + 1}</Text></View>
        ))}</View>
      </Card>
      <Card>
        <Label>Status da meta</Label>
        <View style={styles.statusChart}>
          <View style={[styles.statusRing, { borderColor: progress >= 100 ? '#16a34a' : '#2563eb' }]}><Text style={styles.statusNumber}>{Math.round(progress)}%</Text></View>
          <Text style={styles.muted}>{formatCurrency(Math.max(goal.target_amount - goal.current_amount, 0))} restantes</Text>
        </View>
      </Card>
    </View>
  );
}

function HistoryTable({ history }) {
  return (
    <Card wide>
      <View style={styles.tableHeader}><Label>Histórico de aportes</Label><Text style={styles.muted}>{formatDate(new Date())}</Text></View>
      {history.length === 0 ? <View style={styles.emptyState}><Text style={styles.emptyIcon}>—</Text><Text style={styles.muted}>Nenhum aporte registrado ainda.</Text></View> : history.map((item, index) => (
        <View key={item.id} style={styles.tableRow}>
          <View style={styles.tableDate}><Text style={styles.badgeDate}>{formatDate(item.date)}</Text><Text style={styles.muted}>Aporte #{history.length - index}</Text></View>
          <Text style={styles.positive}>+ {formatCurrency(item.amount)}</Text>
          <Text style={styles.summaryValue}>{formatCurrency(item.balance_after)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  container: { maxWidth: 1100, padding: 24, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, gap: 16 },
  headerCopy: { flex: 1 },
  appEyebrow: { color: '#2563eb', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  dateBadge: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 10, borderWidth: 1, color: '#475569', fontSize: 12, padding: 10 },
  goalToolbar: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 18 },
  goalList: { gap: 8 },
  goalChip: { backgroundColor: '#e2e8f0', borderRadius: 10, minWidth: 126, paddingHorizontal: 12, paddingVertical: 9 },
  activeGoalChip: { backgroundColor: '#dbeafe' },
  goalChipText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  goalChipAmount: { color: '#64748b', fontSize: 11, marginTop: 3 },
  activeGoalChipText: { color: '#1d4ed8' },
  outlineButton: { borderColor: '#2563eb', borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  outlineButtonText: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  newGoalCard: { marginBottom: 18 },
  newGoalFields: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 },
  fieldGrow: { flex: 1 },
  targetField: { width: 150 },
  tabs: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', borderRadius: 12, flexDirection: 'row', gap: 4, marginBottom: 20, padding: 4 },
  tab: { borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  activeTab: { backgroundColor: '#fff' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#0f172a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 16, borderWidth: 1, flexBasis: 360, flexGrow: 1, padding: 22 },
  cardWide: { flexBasis: '100%' },
  label: { color: '#64748b', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  bigValue: { color: '#0f172a', fontSize: 28, fontWeight: '700' },
  targetValue: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },
  muted: { color: '#64748b', fontSize: 13 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 26 },
  progressTrack: { backgroundColor: '#e2e8f0', borderRadius: 20, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: '#2563eb', borderRadius: 20, height: '100%' },
  editBox: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 10, borderWidth: 1, marginTop: 20, padding: 14 },
  inputLabel: { color: '#475569', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 9, borderWidth: 1, color: '#0f172a', fontSize: 15, padding: 11 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 9, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabledButton: { backgroundColor: '#94a3b8' },
  summaryList: { gap: 16, marginTop: 10 },
  summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryValue: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  inlineInput: { flexDirection: 'row', gap: 8 },
  flexInput: { flex: 1 },
  chartArea: { alignItems: 'flex-end', borderBottomColor: '#e2e8f0', borderBottomWidth: 1, flexDirection: 'row', gap: 8, height: 210, justifyContent: 'center', padding: 12 },
  chartColumn: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  chartBar: { backgroundColor: '#2563eb', borderRadius: 5, minWidth: 12, width: '65%' },
  chartCaption: { color: '#64748b', fontSize: 10, marginTop: 6 },
  weekChart: { alignItems: 'flex-end', flexDirection: 'row', height: 170, justifyContent: 'space-around' },
  weekColumn: { alignItems: 'center', justifyContent: 'flex-end' },
  weekBar: { backgroundColor: '#3b82f6', borderRadius: 5, width: 28 },
  statusChart: { alignItems: 'center', justifyContent: 'center', minHeight: 170, gap: 12 },
  statusRing: { alignItems: 'center', borderRadius: 70, borderWidth: 14, height: 130, justifyContent: 'center', width: 130 },
  statusNumber: { color: '#0f172a', fontSize: 24, fontWeight: '700' },
  tableHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tableRow: { alignItems: 'center', borderBottomColor: '#f1f5f9', borderBottomWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 14 },
  tableDate: { flex: 1, gap: 5 },
  badgeDate: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderRadius: 6, color: '#475569', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
  positive: { color: '#16a34a', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { color: '#94a3b8', fontSize: 32, marginBottom: 8 },
});
