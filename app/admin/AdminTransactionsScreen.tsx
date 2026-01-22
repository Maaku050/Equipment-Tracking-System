// screens/AdminTransactionsScreen.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import TransactionAccordion from "@/components/TransactionAccordion";
import AddTransactionModal from "@/_modals/addTransactionModal";
import { useOverdueChecker } from "@/hooks/useOverdueChecker";
import {
  getTransactionsByStatus,
  completeTransaction,
  deleteTransaction,
  approveTransaction,
  denyTransaction,
  updateOverdueTransactions,
} from "@/_helpers/firebaseHelpers";

type TabType = "Request" | "Ongoing" | "Overdue" | "Incomplete" | "All";

export default function AdminTransactionsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("Ongoing");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Automatically check for overdue transactions every 30 minutes
  const { checkOverdue } = useOverdueChecker(30, true);

  useEffect(() => {
    loadTransactions();
  }, [activeTab]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      // First, update any overdue transactions
      await updateOverdueTransactions();

      // Then load transactions for the current tab
      const data = await getTransactionsByStatus(activeTab);

      // Convert Firestore timestamps to Date objects
      const formattedData = data.map((transaction: any) => ({
        ...transaction,
        dueDate: transaction.dueDate.toDate(),
        borrowedDate: transaction.borrowedDate.toDate(),
      }));

      setTransactions(formattedData);
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkOverdue(); // Manually trigger overdue check
    await loadTransactions();
    setRefreshing(false);
  };

  const handleComplete = async (
    transactionId: string,
    itemReturnStates: { [key: string]: { checked: boolean; quantity: number } },
  ) => {
    try {
      const newStatus = await completeTransaction(
        transactionId,
        itemReturnStates,
      );

      Alert.alert("Success", `Transaction marked as ${newStatus}`, [
        { text: "OK", onPress: () => loadTransactions() },
      ]);
    } catch (error) {
      console.error("Error completing transaction:", error);
      Alert.alert("Error", "Failed to complete transaction");
    }
  };

  const handleDelete = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId);
      Alert.alert("Success", "Transaction deleted");
      loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", "Failed to delete transaction");
    }
  };

  const handleApprove = async (transactionId: string) => {
    try {
      await approveTransaction(transactionId);
      Alert.alert(
        "Success",
        "Transaction approved and status changed to Ongoing",
      );
      loadTransactions();
    } catch (error) {
      console.error("Error approving transaction:", error);
      Alert.alert("Error", "Failed to approve transaction");
    }
  };

  const handleDeny = async (transactionId: string) => {
    try {
      await denyTransaction(transactionId);
      Alert.alert("Success", "Transaction denied and equipment released");
      loadTransactions();
    } catch (error) {
      console.error("Error denying transaction:", error);
      Alert.alert("Error", "Failed to deny transaction");
    }
  };

  const tabs: TabType[] = [
    "Request",
    "Ongoing",
    "Overdue",
    "Incomplete",
    "All",
  ];

  return (
    <Box style={styles.container}>
      <VStack style={styles.content}>
        {/* Header */}
        <HStack style={styles.header}>
          <Heading size="xl">Transactions</Heading>
          <Button onPress={() => setShowAddModal(true)}>
            <ButtonText>+ New Transaction</ButtonText>
          </Button>
        </HStack>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsContainer}
        >
          <HStack style={styles.tabs}>
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "solid" : "outline"}
                onPress={() => setActiveTab(tab)}
                style={styles.tab}
              >
                <ButtonText>{tab}</ButtonText>
              </Button>
            ))}
          </HStack>
        </ScrollView>

        {/* Transactions List */}
        <ScrollView
          style={styles.transactionsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <TransactionAccordion
            transactions={transactions}
            onComplete={activeTab !== "Request" ? handleComplete : undefined}
            onDelete={handleDelete}
            onApprove={activeTab === "Request" ? handleApprove : undefined}
            onDeny={activeTab === "Request" ? handleDeny : undefined}
            loading={loading}
          />
        </ScrollView>
      </VStack>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadTransactions}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabs: {
    gap: 8,
  },
  tab: {
    minWidth: 100,
  },
  transactionsList: {
    flex: 1,
  },
});
