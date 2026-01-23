// app/user/index.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  Alert,
} from "react-native";
import { auth } from "@/firebase/firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Fab, FabIcon } from "@/components/ui/fab";
import TransactionAccordion from "@/components/TransactionAccordion";
import { TransactionStatus } from "@/_helpers/firebaseHelpers";
import { useTransaction } from "@/context/TransactionContext";
import { Plus, Edit } from "lucide-react-native";
import { useOverdueChecker } from "@/hooks/useOverdueChecker";
import { useUsers } from "@/context/UsersContext";

export default function StudentDashboard() {
  const params = useLocalSearchParams();
  const statusParam = (params.status as TransactionStatus) || "All";

  const currentUser = auth.currentUser;
  const { getUserByUid } = useUsers();
  const studentData = currentUser ? getUserByUid(currentUser.uid) : null;

  // Use the transaction context
  const { transactions, loading, error, getTransactionsByStatus } =
    useTransaction();

  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  // Automatically check for overdue transactions
  const { checkOverdue } = useOverdueChecker(30, true);

  const filterButtons: (TransactionStatus | "All")[] = [
    "All",
    "Request",
    "Ongoing",
    "Overdue",
  ];

  useEffect(() => {
    checkOverdue();
  }, []);

  // Filter transactions by status and current user
  useEffect(() => {
    if (!currentUser) return;

    const allTransactions = getTransactionsByStatus(statusParam);

    // Filter to show only current user's transactions
    const userTransactions = allTransactions.filter(
      (transaction) => transaction.studentId === currentUser.uid,
    );

    setFilteredTransactions(userTransactions);
    console.log(
      `🔍 Student ${currentUser.uid} - Filtering by status: ${statusParam}, Count: ${userTransactions.length}`,
    );
  }, [statusParam, transactions, currentUser]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  const handleFilterChange = (status: TransactionStatus | "All") => {
    if (status === "All") {
      router.push("/user");
    } else {
      router.push(`/user?status=${status}`);
    }
  };

  const handleCreateTransaction = () => {
    router.push("/user/create-transaction");
  };

  const handleEditProfile = () => {
    router.push("/user/edit-profile");
  };

  if (!currentUser) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to continue</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Profile Header */}
        <Box style={styles.profileHeader}>
          <HStack style={styles.profileContent}>
            <Image
              source={{
                uri:
                  studentData?.imageUrl ||
                  "https://via.placeholder.com/150/cccccc/ffffff?text=No+Image",
              }}
              style={styles.profileImage}
            />
            <VStack style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {studentData?.name || "Student Name"}
              </Text>
              <Text style={styles.profileEmail}>
                {studentData?.email || currentUser.email}
              </Text>
            </VStack>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
            >
              <Edit size={20} color="#2563eb" />
            </TouchableOpacity>
          </HStack>
        </Box>

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

        {/* Transactions List */}
        <Box style={styles.transactionsContainer}>
          <TransactionAccordion
            transactions={filteredTransactions}
            onDelete={undefined}
            loading={loading}
          />
        </Box>
      </ScrollView>

      {/* Floating Action Button */}
      <Fab
        size="lg"
        placement="bottom right"
        onPress={handleCreateTransaction}
        style={styles.fab}
      >
        <FabIcon as={Plus} />
      </Fab>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#991b1b",
    textAlign: "center",
  },
  profileHeader: {
    backgroundColor: "#2563eb",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  profileContent: {
    alignItems: "center",
    gap: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  profileEmail: {
    fontSize: 14,
    color: "#dbeafe",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
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
  fab: {
    backgroundColor: "#2563eb",
    marginBottom: 16,
    marginRight: 16,
  },
});
