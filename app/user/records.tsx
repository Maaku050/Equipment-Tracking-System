// app/user/records.tsx | User Records
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  View,
  RefreshControl,
} from "react-native";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  FilterIcon,
  SearchIcon,
  XIcon,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react-native";
import { useRecords, RecordStatus } from "@/context/RecordsContext";
import DateTimePicker from "@/components/DateTimePicker";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { auth } from "@/firebase/firebaseConfig";
import { Button, ButtonText } from "@/components/ui/button";
import { router } from "expo-router";

interface FilterState {
  status: RecordStatus[];
  startDate: Date | null;
  endDate: Date | null;
}

export default function UserRecords() {
  const currentUser = auth.currentUser;
  const { records, loading, error, searchRecords, getRecordsByDateRange } =
    useRecords();

  const [userRecords, setUserRecords] = useState(
    records.filter((r) => r.studentId === currentUser?.uid),
  );
  const [filteredRecords, setFilteredRecords] = useState(userRecords);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    startDate: null,
    endDate: null,
  });

  const statusOptions: RecordStatus[] = [
    "Complete",
    "Incomplete",
    "Complete and Overdue",
    "Incomplete and Overdue",
  ];

  useEffect(() => {
    if (!currentUser) return;
    const filtered = records.filter((r) => r.studentId === currentUser.uid);
    setUserRecords(filtered);
    applyFilters(filtered);
  }, [records, currentUser]);

  useEffect(() => {
    applyFilters(userRecords);
  }, [searchQuery, filters]);

  const applyFilters = (recordsToFilter = userRecords) => {
    let filtered = [...recordsToFilter];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.transactionId.toLowerCase().includes(query) ||
          record.items.some((item) =>
            item.itemName.toLowerCase().includes(query),
          ),
      );
    }

    if (filters.status.length > 0) {
      filtered = filtered.filter((record) =>
        filters.status.includes(record.finalStatus),
      );
    }

    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(
        (record) =>
          record.borrowedDate >= startDate && record.borrowedDate <= endDate,
      );
    } else if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((record) => record.borrowedDate >= startDate);
    } else if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record) => record.borrowedDate <= endDate);
    }

    // Sort by completion date (most recent first)
    filtered.sort(
      (a, b) => b.completedDate.getTime() - a.completedDate.getTime(),
    );

    setFilteredRecords(filtered);
  };

  const toggleStatusFilter = (status: RecordStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      startDate: null,
      endDate: null,
    });
    setSearchQuery("");
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const getStatusColor = (status: RecordStatus) => {
    switch (status) {
      case "Complete":
        return "#10b981"; // Green - all good
      case "Complete and Overdue":
        return "#f59e0b"; // Amber - late but returned
      case "Incomplete":
        return "#f97316"; // Orange - missing items
      case "Incomplete and Overdue":
        return "#dc2626"; // Red - missing items + late
      default:
        return "#6b7280"; // Gray
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters =
    filters.status.length > 0 || filters.startDate || filters.endDate;

  // Calculate user-specific stats
  const stats = {
    total: userRecords.length,
    complete: userRecords.filter((r) => r.finalStatus === "Complete").length,
    incomplete: userRecords.filter(
      (r) =>
        r.finalStatus === "Incomplete" ||
        r.finalStatus === "Incomplete and Overdue",
    ).length,
    totalFines: userRecords.reduce((sum, r) => sum + (r.fineAmount || 0), 0),
    pendingFines: userRecords
      .filter((r) => r.fineAmount > 0 && !r.finePaid)
      .reduce((sum, r) => sum + r.fineAmount, 0),
  };

  if (!currentUser) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view your records</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading your records...</Text>
      </Box>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <SearchIcon size={20} color="#6b7280" style={styles.searchIcon} />
            <Input style={styles.searchInput}>
              <InputField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by transaction ID or item..."
                placeholderTextColor="#9ca3af"
              />
            </Input>
            {searchQuery && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <XIcon size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <FilterIcon
              size={20}
              color={hasActiveFilters ? "#3b82f6" : "#6b7280"}
            />
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {filters.status.length +
                    (filters.startDate ? 1 : 0) +
                    (filters.endDate ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <View style={styles.activeFiltersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.activeFiltersList}>
                {filters.status.map((status) => (
                  <View key={status} style={styles.filterChip}>
                    <Text style={styles.filterChipText}>{status}</Text>
                    <TouchableOpacity
                      onPress={() => toggleStatusFilter(status)}
                    >
                      <XIcon size={14} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                ))}
                {filters.startDate && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      From: {formatDate(new Date(filters.startDate))}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, startDate: null }))
                      }
                    >
                      <XIcon size={14} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                {filters.endDate && (
                  <View style={styles.filterChip}>
                    <Text style={styles.filterChipText}>
                      To: {formatDate(new Date(filters.endDate))}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, endDate: null }))
                      }
                    >
                      <XIcon size={14} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearFiltersText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Stats Summary */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Records</Text>
            </View>
            <View style={styles.statCardGreen}>
              <Text style={styles.statValueGreen}>{stats.complete}</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statCardOrange}>
              <Text style={styles.statValueOrange}>{stats.incomplete}</Text>
              <Text style={styles.statLabel}>Incomplete</Text>
            </View>
            <View style={styles.statCardRed}>
              <Text style={styles.statValueRed}>
                ₱{stats.totalFines.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Total Fines</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Records List */}
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.cardsContainer}>
          {filteredRecords.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AlertCircle size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No records found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Your completed transactions will appear here"}
              </Text>
            </View>
          ) : (
            filteredRecords.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.idStatusRow}>
                      <Text style={styles.transactionId}>
                        {record.transactionId}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: getStatusColor(record.finalStatus),
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {record.finalStatus}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.dateInfo}>
                      Borrowed: {formatDate(record.borrowedDate)}
                    </Text>
                    <Text style={styles.dateInfo}>
                      Completed: {formatDateTime(record.completedDate)}
                    </Text>
                  </View>
                </View>

                {/* Items Section */}
                <View style={styles.itemsSection}>
                  <Text style={styles.itemsSectionTitle}>Equipment Items</Text>
                  {record.items.map((item, index) => (
                    <View key={item.id} style={styles.itemRow}>
                      <VStack style={styles.itemLeft}>
                        <HStack style={{ alignItems: "center", gap: 8 }}>
                          <Text style={styles.itemNumber}>{index + 1}.</Text>
                          <Text style={styles.itemName}>{item.itemName}</Text>
                        </HStack>
                        <Text style={styles.itemDetails}>
                          Quantity: {item.quantity} × ₱{item.pricePerQuantity} =
                          ₱{(item.pricePerQuantity * item.quantity).toFixed(2)}
                        </Text>
                        <HStack
                          style={{ alignItems: "center", gap: 4, marginTop: 4 }}
                        >
                          <CheckCircle size={12} color="#10b981" />
                          <Text style={styles.returnedInfo}>
                            Returned: {item.returnedQuantity}/{item.quantity}
                          </Text>
                        </HStack>

                        {/* Damage/Lost Information */}
                        {(item.damagedQuantity > 0 ||
                          item.lostQuantity > 0) && (
                          <VStack style={styles.damageSection}>
                            {item.damagedQuantity > 0 && (
                              <HStack style={{ alignItems: "center", gap: 4 }}>
                                <AlertTriangle size={12} color="#f59e0b" />
                                <Text style={styles.damagedText}>
                                  Damaged: {item.damagedQuantity} (₱
                                  {(
                                    item.damagedQuantity * item.pricePerQuantity
                                  ).toFixed(2)}
                                  )
                                </Text>
                              </HStack>
                            )}
                            {item.lostQuantity > 0 && (
                              <HStack style={{ alignItems: "center", gap: 4 }}>
                                <AlertTriangle size={12} color="#ef4444" />
                                <Text style={styles.lostText}>
                                  Lost: {item.lostQuantity} (₱
                                  {(
                                    item.lostQuantity * item.pricePerQuantity
                                  ).toFixed(2)}
                                  )
                                </Text>
                              </HStack>
                            )}
                            {item.damageNotes && (
                              <Text style={styles.damageNotes}>
                                Note: {item.damageNotes}
                              </Text>
                            )}
                          </VStack>
                        )}
                      </VStack>
                    </View>
                  ))}
                </View>

                {/* Summary Section */}
                <View style={styles.summarySection}>
                  <HStack style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Amount:</Text>
                    <Text style={styles.totalPrice}>
                      ₱{record.totalPrice.toFixed(2)}
                    </Text>
                  </HStack>
                  {record.fineAmount > 0 && (
                    <HStack style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Fine Amount:</Text>
                      <Text style={styles.fineAmount}>
                        ₱{record.fineAmount.toFixed(2)}
                      </Text>
                    </HStack>
                  )}
                  {record.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{record.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Filter Records</Heading>
            <ModalCloseButton>
              <XIcon size={24} color="#6b7280" />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      filters.status.includes(status) &&
                        styles.statusOptionSelected,
                    ]}
                    onPress={() => toggleStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        filters.status.includes(status) &&
                          styles.statusOptionTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <HStack style={styles.dateInputs} space="xs">
                <View style={styles.dateInput}>
                  <Text style={styles.dateInputLabel}>Start Date</Text>
                  <DateTimePicker
                    value={filters.startDate}
                    onChange={(date) =>
                      setFilters((prev) => ({ ...prev, startDate: date }))
                    }
                  />
                </View>
                <Text> - </Text>
                <View style={styles.dateInput}>
                  <Text style={styles.dateInputLabel}>End Date</Text>
                  <DateTimePicker
                    value={filters.endDate}
                    onChange={(date) =>
                      setFilters((prev) => ({ ...prev, endDate: date }))
                    }
                  />
                </View>
              </HStack>
            </View>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              action="secondary"
              style={styles.modalClearButton}
              onPress={() => {
                clearFilters();
                setShowFilterModal(false);
              }}
            >
              <ButtonText>Clear All</ButtonText>
            </Button>
            <Button
              style={styles.modalApplyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <ButtonText>Apply Filters</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  headerTitle: {
    color: "#1f2937",
  },
  searchFilterContainer: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    position: "relative",
    marginRight: 12,
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "48%",
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
  filterButton: {
    width: 48,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  filterButtonActive: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  activeFiltersContainer: {
    paddingTop: 8,
    marginBottom: 12,
  },
  activeFiltersList: {
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    color: "#1e40af",
    marginRight: 6,
  },
  clearFiltersButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearFiltersText: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "500",
  },
  statsScrollView: {
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: "row",
  },
  statCard: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  statCardGreen: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  statCardOrange: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#f97316",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  statCardRed: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  statCardAmber: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statValueGreen: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10b981",
  },
  statValueOrange: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f97316",
  },
  statValueRed: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ef4444",
  },
  statValueAmber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f59e0b",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  recordCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 16,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  headerLeft: {
    flex: 1,
  },
  idStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 8,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  dateInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  itemsSection: {
    padding: 16,
  },
  itemsSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
    gap: 4,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  itemDetails: {
    fontSize: 13,
    color: "#6b7280",
    marginLeft: 24,
  },
  returnedInfo: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
  },
  damageSection: {
    marginTop: 8,
    marginLeft: 24,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#fecaca",
    gap: 4,
  },
  damagedText: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
  },
  lostText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  damageNotes: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  summarySection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  summaryRow: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3b82f6",
  },
  fineAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
  },
  notesBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#374151",
    fontStyle: "italic",
    lineHeight: 18,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  statusOptionSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusOptionTextSelected: {
    color: "#1e40af",
    fontWeight: "500",
  },
  dateInputs: {
    justifyContent: "center",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  modalClearButton: {
    marginRight: 12,
  },
  modalApplyButton: {
    backgroundColor: "#3b82f6",
  },
});
