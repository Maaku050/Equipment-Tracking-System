// app/admin/index.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import TransactionAccordion from "@/components/TransactionAccordion";
import AddTransactionModal from "@/_modals/addTransactionModal";
import {
  TransactionStatus,
  approveTransaction,
  completeTransaction,
  deleteTransaction,
  denyTransaction,
} from "@/_helpers/firebaseHelpers";
import { useTransaction } from "@/context/TransactionContext";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Plus } from "lucide-react-native";
import { useOverdueChecker } from "@/hooks/useOverdueChecker";

export default function AdminDashboard() {
  const params = useLocalSearchParams();
  const statusParam = (params.status as TransactionStatus) || "All";

  // Use the transaction context
  const { transactions, stats, loading, error, getTransactionsByStatus } =
    useTransaction();

  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Automatically check for overdue transactions every 30 minutes
  const { checkOverdue } = useOverdueChecker(1, true);

  const filterButtons: (TransactionStatus | "All")[] = [
    "All",
    "Request",
    "Ongoing",
    "Incomplete",
    "Overdue",
    "Incomplete and Overdue",
  ];

  const handleOverdueCheck = async () => {
    await checkOverdue(); // Manually trigger overdue check
  };

  useEffect(() => {
    handleOverdueCheck();
  }, []);

  // Filter transactions whenever status or transactions change
  useEffect(() => {
    const filtered = getTransactionsByStatus(statusParam);
    setFilteredTransactions(filtered);
    console.log(
      `🔍 Filtering by status: ${statusParam}, Count: ${filtered.length}`,
    );
  }, [statusParam, transactions]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const handleFilterChange = (status: TransactionStatus | "All") => {
    if (status === "All") {
      router.push("/admin");
    } else {
      router.push(`/admin?status=${status}`);
    }
  };

  const handleCompleteTransaction = async (
    transactionId: string,
    itemReturnStates: { [key: string]: { checked: boolean; quantity: number } },
  ) => {
    try {
      console.log("Completing transaction:", transactionId);
      await completeTransaction(transactionId, itemReturnStates);
      Alert.alert("Success", "Transaction completed successfully");
    } catch (error) {
      console.error("Error completing transaction:", error);
      Alert.alert("Error", "Failed to complete transaction");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await deleteTransaction(transactionId);
              Alert.alert("Success", "Transaction deleted");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", "Failed to delete transaction");
    }
  };

  const handleTransactionSuccess = () => {
    // Modal will close automatically, context will auto-update via snapshot
    console.log("✅ Transaction created successfully");
  };

  return (
    <ScrollView style={styles.container} showsHorizontalScrollIndicator={false}>
      {/* Stats Cards */}
      <HStack space="md" style={styles.statsContainer}>
        <Box style={styles.statCard}>
          <Text style={styles.statNumberRequest}>{stats.request}</Text>
          <Text style={styles.statLabel}>Request</Text>
        </Box>
        <Box style={styles.statCard}>
          <Text style={styles.statNumberOngoing}>{stats.ongoing}</Text>
          <Text style={styles.statLabel}>Ongoing</Text>
        </Box>
        <Box style={styles.statCard}>
          <Text style={styles.statNumberIncomplete}>{stats.incomplete}</Text>
          <Text style={styles.statLabel}>Incomplete</Text>
        </Box>
        <Box style={styles.statCard}>
          <Text style={styles.statNumberOverdue}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </Box>
      </HStack>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              statusParam === filter && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusParam === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Transaction Button */}
      <Box style={styles.searchAndAddButtonContainer}>
        <Button size="sm" onPress={() => setShowAddModal(true)}>
          <ButtonIcon as={Plus} />
          <ButtonText>Add transaction</ButtonText>
        </Button>
      </Box>

      {/* Transactions List */}
      <Box style={styles.transactionsContainer}>
        <TransactionAccordion
          transactions={filteredTransactions}
          onComplete={handleCompleteTransaction}
          onDelete={handleDeleteTransaction}
          loading={loading}
        />
      </Box>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleTransactionSuccess}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchAndAddButtonContainer: {
    borderWidth: 0,
    borderColor: "red",
    paddingRight: 16,
    alignItems: "flex-end",
  },
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statNumberRequest: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  statNumberOngoing: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
  },
  statNumberIncomplete: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f97316",
  },
  statNumberOverdue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f63b3b",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#1f2937",
    borderColor: "#1f2937",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  transactionsContainer: {
    padding: 16,
  },
});
