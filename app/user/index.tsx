// app/user/index.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  RefreshControl,
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
import { useRecords } from "@/context/RecordsContext";
import {
  Plus,
  Edit,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react-native";
import { useOverdueChecker } from "@/hooks/useOverdueChecker";
import { useUsers } from "@/context/UsersContext";
import { signOut } from "firebase/auth";

// Extended status type to include "Complete" from records
type ExtendedStatus =
  | TransactionStatus
  | "Complete"
  | "Incomplete"
  | "Incomplete and Overdue";

export default function StudentDashboard() {
  const params = useLocalSearchParams();
  const statusParam = (params.status as ExtendedStatus) || "All";

  const currentUser = auth.currentUser;
  const { getUserByUid } = useUsers();
  const studentData = currentUser ? getUserByUid(currentUser.uid) : null;

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    getTransactionsByStatus,
  } = useTransaction();
  const {
    records,
    loading: recordsLoading,
    error: recordsError,
  } = useRecords();

  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { checkOverdue } = useOverdueChecker(30, true);

  const filterButtons: {
    status: ExtendedStatus | "All";
    label: string;
    icon: any;
    color: string;
  }[] = [
    { status: "All", label: "All", icon: Package, color: "#6b7280" },
    { status: "Request", label: "Pending", icon: Clock, color: "#f59e0b" },
    { status: "Ongoing", label: "Active", icon: AlertCircle, color: "#3b82f6" },
    {
      status: "Incomplete",
      label: "Incomplete",
      icon: AlertTriangle,
      color: "#f97316",
    },
    {
      status: "Incomplete and Overdue",
      label: "Inc. Overdue",
      icon: XCircle,
      color: "#dc2626",
    },
    {
      status: "Complete",
      label: "Completed",
      icon: CheckCircle,
      color: "#10b981",
    },
    {
      status: "Overdue",
      label: "Overdue",
      icon: AlertCircle,
      color: "#ef4444",
    },
  ];

  const STAT_COLORS = {
    total: "#0400ff",
    pending: "#f59e0b",
    active: "#00aaff",
    incomplete: "#ea580c",
    overdue: "#dc2626",
    completed: "#059669",
  };

  useEffect(() => {
    checkOverdue();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let filtered: any[] = [];

    // Handle "Complete" status - fetch from records collection
    if (statusParam === "Complete") {
      const userRecords = records.filter(
        (record) =>
          record.studentId === currentUser.uid &&
          (record.finalStatus === "Complete" ||
            record.finalStatus === "Complete and Overdue"),
      );
      filtered = userRecords;
    }
    // Handle "Incomplete" status
    else if (statusParam === "Incomplete") {
      const userTransactions = transactions.filter(
        (transaction) =>
          transaction.studentId === currentUser.uid &&
          transaction.status === "Incomplete",
      );
      filtered = userTransactions;
    }
    // Handle "Incomplete and Overdue" status
    else if (statusParam === "Incomplete and Overdue") {
      const userTransactions = transactions.filter(
        (transaction) =>
          transaction.studentId === currentUser.uid &&
          transaction.status === "Incomplete and Overdue",
      );
      filtered = userTransactions;
    }
    // Handle "All" - combine active transactions and completed records
    else if (statusParam === "All") {
      const userTransactions = transactions.filter(
        (transaction) => transaction.studentId === currentUser.uid,
      );
      const userRecords = records.filter(
        (record) => record.studentId === currentUser.uid,
      );
      filtered = [...userTransactions, ...userRecords];
    }
    // Handle other transaction statuses (Request, Ongoing, Overdue)
    else {
      const allTransactions = getTransactionsByStatus(statusParam);
      const userTransactions = allTransactions.filter(
        (transaction) => transaction.studentId === currentUser.uid,
      );
      filtered = userTransactions;
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.borrowedDate || a.createdAt;
      const dateB = b.borrowedDate || b.createdAt;
      return dateB - dateA;
    });

    setFilteredItems(filtered);
  }, [statusParam, transactions, records, currentUser]);

  useEffect(() => {
    if (transactionsError) {
      Alert.alert("Error", transactionsError);
    }
    if (recordsError) {
      Alert.alert("Error", recordsError);
    }
  }, [transactionsError, recordsError]);

  const handleFilterChange = (status: ExtendedStatus | "All") => {
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("./");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await checkOverdue();
    setRefreshing(false);
  }, []);

  // Calculate quick stats (including records)
  const stats = {
    total:
      transactions.filter((t) => t.studentId === currentUser?.uid).length +
      records.filter((r) => r.studentId === currentUser?.uid).length,
    pending: transactions.filter(
      (t) => t.studentId === currentUser?.uid && t.status === "Request",
    ).length,
    active: transactions.filter(
      (t) => t.studentId === currentUser?.uid && t.status === "Ongoing",
    ).length,
    overdue: transactions.filter(
      (t) =>
        t.studentId === currentUser?.uid &&
        (t.status === "Overdue" || t.status === "Incomplete and Overdue"),
    ).length,
    incomplete: transactions.filter(
      (t) =>
        t.studentId === currentUser?.uid &&
        (t.status === "Incomplete" || t.status === "Incomplete and Overdue"),
    ).length,
    completed: records.filter(
      (r) => r.studentId === currentUser?.uid && r.finalStatus === "Complete",
    ).length,
  };

  const loading = transactionsLoading || recordsLoading;

  if (!currentUser) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to continue</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Profile Header */}
        <Box style={styles.profileHeader}>
          <HStack style={styles.profileTopRow} space="md">
            <VStack style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.profileImageContainer}
                onPress={handleEditProfile}
              >
                <Image
                  source={{
                    uri:
                      studentData?.imageUrl ||
                      "https://via.placeholder.com/150/cccccc/ffffff?text=No+Image",
                  }}
                  style={styles.profileImage}
                />
                <Box style={styles.editBadge}>
                  <Edit size={12} color="#ffffff" />
                </Box>
              </TouchableOpacity>
            </VStack>
            <VStack style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.profileName}>
                {studentData?.name || "Student"}
              </Text>
              <Text style={styles.profileEmail}>
                {studentData?.email || currentUser.email}
              </Text>
              {studentData?.course && (
                <Text style={styles.profileCourse}>{studentData.course}</Text>
              )}
            </VStack>
          </HStack>

          {/* Quick Stats */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsScrollView}
          >
            <HStack style={styles.statsContainer} space="sm">
              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.total,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.total,
                  }}
                >
                  {stats.total}
                </Text>
                <Text style={styles.statLabel}>Total</Text>
              </Box>

              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.pending,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.pending,
                  }}
                >
                  {stats.pending}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </Box>

              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.active,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.active,
                  }}
                >
                  {stats.active}
                </Text>
                <Text style={styles.statLabel}>Active</Text>
              </Box>

              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.incomplete,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.incomplete,
                  }}
                >
                  {stats.incomplete}
                </Text>
                <Text style={styles.statLabel}>Incomplete</Text>
              </Box>

              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.overdue,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.overdue,
                  }}
                >
                  {stats.overdue}
                </Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </Box>

              <Box
                style={{
                  ...styles.statCard,
                  borderLeftColor: STAT_COLORS.completed,
                }}
              >
                <Text
                  style={{
                    ...styles.statNumber,
                    color: STAT_COLORS.completed,
                  }}
                >
                  {stats.completed}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </Box>
            </HStack>
          </ScrollView>
        </Box>

        {/* Filter Buttons with Icons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filterButtons.map((filter) => {
            const Icon = filter.icon;
            const isActive = statusParam === filter.status;

            return (
              <TouchableOpacity
                key={filter.status}
                style={[
                  styles.filterButton,
                  isActive
                    ? {
                        backgroundColor: filter.color,
                        borderColor: filter.color,
                      }
                    : null,
                ]}
                onPress={() => handleFilterChange(filter.status)}
              >
                <Icon size={16} color={isActive ? "#ffffff" : filter.color} />
                <Text
                  style={[
                    styles.filterButtonText,
                    isActive ? styles.filterButtonTextActive : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Transactions/Records List */}
        <Box style={styles.transactionsContainer}>
          <HStack style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {statusParam === "All"
                ? "All Transactions"
                : `${filterButtons.find((f) => f.status === statusParam)?.label} Transactions`}
            </Text>
            <Text style={styles.sectionCount}>{filteredItems.length}</Text>
          </HStack>

          <TransactionAccordion
            transactions={filteredItems}
            onDelete={undefined}
            loading={loading}
            isUserView={true}
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
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
  },
  profileTopRow: {
    alignItems: "center",
    padding: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: "#dbeafe",
    marginBottom: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#dbeafe",
  },
  profileCourse: {
    fontSize: 12,
    color: "#bfdbfe",
    marginTop: 4,
    fontStyle: "italic",
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: "100%",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1e40af",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  statsScrollView: {
    marginTop: 16,
    borderWidth: 0,
    marginLeft: 10,
  },
  statsContainer: {
    paddingLeft: 0,
    paddingRight: 10,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.18)", // clearer contrast on blue
    borderRadius: 14, // slightly softer corners
    alignItems: "center",
    justifyContent: "center",

    borderLeftWidth: 4, // stronger visual anchor
    borderLeftColor: "#ffffff",

    minWidth: 130, // improves readability

    // Subtle elevation (native + web-safe)
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,

    // Web polish
    backdropFilter: "blur(6px)", // ignored on native, fine on web
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#dbeafe",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  transactionsContainer: {
    padding: 16,
  },
  sectionHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fab: {
    backgroundColor: "#2563eb",
    marginBottom: 16,
    marginRight: 16,
    shadowColor: "#2563eb",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
