// app/admin/index.tsx | Admin Interface
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  View,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
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
import { Plus, Search, X } from "lucide-react-native";
import AdminGuard from "@/components/AdminGuard";
import Pagination from "@/components/customPagination";

export default function AdminDashboard() {
  const params = useLocalSearchParams();
  const statusParam = (params.status as TransactionStatus) || "All";

  // Use the transaction context
  const { transactions, stats, loading, error, getTransactionsByStatus } =
    useTransaction();

  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Search states
  const [searchTransactionId, setSearchTransactionId] = useState("");
  const [searchUserName, setSearchUserName] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 15;

  const filterButtons: (TransactionStatus | "All")[] = [
    "All",
    "Request",
    "Ongoing",
    "Ondue",
    "Incomplete",
    "Overdue",
    "Incomplete and Overdue",
  ];

  // Filter transactions whenever status, transactions, or search terms change
  useEffect(() => {
    let filtered = getTransactionsByStatus(statusParam);

    // Apply transaction ID search
    if (searchTransactionId.trim()) {
      filtered = filtered.filter((t) =>
        t.transactionId
          .toLowerCase()
          .includes(searchTransactionId.toLowerCase()),
      );
    }

    // Apply user name search
    if (searchUserName.trim()) {
      filtered = filtered.filter((t) =>
        t.studentName.toLowerCase().includes(searchUserName.toLowerCase()),
      );
    }

    setFilteredTransactions(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [statusParam, transactions, searchTransactionId, searchUserName]);

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
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate pagination
  const totalPages = Math.ceil(
    filteredTransactions.length / transactionsPerPage,
  );
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction,
  );

  if (error) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </Box>
    );
  }

  return (
    <AdminGuard>
      <ScrollView
        style={styles.container}
        showsHorizontalScrollIndicator={false}
      >
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
            <Text style={styles.statNumberOndue}>{stats.ondue}</Text>
            <Text style={styles.statLabel}>Ondue</Text>
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

        {/* Search Bars and Add Transaction Button */}
        <View style={styles.searchAndAddContainer}>
          {/* Transaction ID Search */}
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6b7280" style={styles.searchIcon} />
            <Input style={styles.searchInput}>
              <InputField
                value={searchTransactionId}
                onChangeText={setSearchTransactionId}
                placeholder="Search Transaction ID..."
                placeholderTextColor="#9ca3af"
              />
            </Input>
            {searchTransactionId !== "" && (
              <TouchableOpacity
                onPress={() => setSearchTransactionId("")}
                style={styles.clearButton}
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* User Name Search */}
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6b7280" style={styles.searchIcon} />
            <Input style={styles.searchInput}>
              <InputField
                value={searchUserName}
                onChangeText={setSearchUserName}
                placeholder="Search User Name..."
                placeholderTextColor="#9ca3af"
              />
            </Input>
            {searchUserName !== "" && (
              <TouchableOpacity
                onPress={() => setSearchUserName("")}
                style={styles.clearButton}
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Add Transaction Button */}
          <Button
            size="sm"
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <ButtonIcon as={Plus} />
            <ButtonText>Add Transaction</ButtonText>
          </Button>
        </View>

        {/* Transactions List */}
        <Box style={styles.transactionsContainer}>
          {(searchTransactionId || searchUserName) && (
            <Text style={styles.searchResultsText}>
              {filteredTransactions.length} result
              {filteredTransactions.length !== 1 ? "s" : ""} found
            </Text>
          )}
          <TransactionAccordion
            transactions={currentTransactions}
            onComplete={handleCompleteTransaction}
            onDelete={handleDeleteTransaction}
            loading={loading}
          />

          {/* Pagination Component */}
          {filteredTransactions.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </Box>

        {/* Add Transaction Modal */}
        <AddTransactionModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleTransactionSuccess}
        />
      </ScrollView>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  searchAndAddContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 0,
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    marginTop: -10,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 40,
    paddingRight: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -9,
  },
  addButton: {
    flexShrink: 0,
  },
  searchResultsText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    fontStyle: "italic",
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
    color: "#f59e0b",
  },
  statNumberOngoing: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  statNumberOndue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f59e0b",
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
});
