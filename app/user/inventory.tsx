// app/user/inventory.tsx
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Search, Filter, X, Package, AlertCircle } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  View,
} from "react-native";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { useEquipment, Equipment } from "@/context/EquipmentContext";
import { router } from "expo-router";

type FilterStatus = "all" | "available" | "unavailable" | "maintenance";
type FilterCondition = "all" | "good" | "fair" | "needs repair";

export default function StudentInventory() {
  const { equipment, loading, error } = useEquipment();
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [conditionFilter, setConditionFilter] =
    useState<FilterCondition>("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);

  // Apply filters
  useEffect(() => {
    let filtered = [...equipment];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Condition filter
    if (conditionFilter !== "all") {
      filtered = filtered.filter((item) => item.condition === conditionFilter);
    }

    // Available only filter
    if (availableOnly) {
      filtered = filtered.filter((item) => item.availableQuantity > 0);
    }

    setFilteredEquipment(filtered);
  }, [equipment, searchQuery, statusFilter, conditionFilter, availableOnly]);

  const handleEquipmentClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowDetailsModal(true);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setConditionFilter("all");
    setAvailableOnly(false);
    setSearchQuery("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    conditionFilter !== "all" ||
    availableOnly ||
    searchQuery.trim() !== "";

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Equipment context auto-refreshes via real-time listener
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "success";
      case "unavailable":
        return "error";
      case "maintenance":
        return "warning";
      default:
        return "info";
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "good":
        return "success";
      case "fair":
        return "warning";
      case "needs repair":
        return "error";
      default:
        return "info";
    }
  };

  const stats = {
    total: equipment.length,
    available: equipment.filter((e) => e.availableQuantity > 0).length,
    unavailable: equipment.filter((e) => e.status === "unavailable").length,
    maintenance: equipment.filter((e) => e.status === "maintenance").length,
  };

  if (error) {
    return (
      <Box style={styles.centerContainer}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScrollView}
        >
          <HStack style={styles.statsContainer} space="sm">
            <Box style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </Box>
            <Box style={styles.statCardGreen}>
              <Text style={styles.statNumberGreen}>{stats.available}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </Box>
            <Box style={styles.statCardRed}>
              <Text style={styles.statNumberRed}>{stats.unavailable}</Text>
              <Text style={styles.statLabel}>Unavailable</Text>
            </Box>
            <Box style={styles.statCardOrange}>
              <Text style={styles.statNumberOrange}>{stats.maintenance}</Text>
              <Text style={styles.statLabel}>Maintenance</Text>
            </Box>
          </HStack>
        </ScrollView>
      </Box>

      {/* Search and Filter Bar */}
      <Box style={styles.searchFilterContainer}>
        <HStack style={styles.searchFilterRow} space="sm">
          <Box style={styles.searchInputWrapper}>
            <Input style={styles.searchInput}>
              <InputSlot style={styles.inputSlotLeft}>
                <InputIcon as={Search} />
              </InputSlot>
              <InputField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search equipment..."
                placeholderTextColor="#9ca3af"
              />
              {searchQuery && (
                <InputSlot style={styles.inputSlotRight}>
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Icon as={X} size="sm" color="#6b7280" />
                  </TouchableOpacity>
                </InputSlot>
              )}
            </Input>
          </Box>
          <TouchableOpacity
            style={
              hasActiveFilters ? styles.filterButtonActive : styles.filterButton
            }
            onPress={() => setShowFilterModal(true)}
          >
            <Filter
              size={20}
              color={hasActiveFilters ? "#3b82f6" : "#6b7280"}
            />
            {hasActiveFilters && (
              <Box style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {(statusFilter !== "all" ? 1 : 0) +
                    (conditionFilter !== "all" ? 1 : 0) +
                    (availableOnly ? 1 : 0)}
                </Text>
              </Box>
            )}
          </TouchableOpacity>
        </HStack>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack style={styles.activeFiltersRow}>
              {statusFilter !== "all" && (
                <Box style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    Status: {statusFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setStatusFilter("all")}>
                    <X size={14} color="#6b7280" />
                  </TouchableOpacity>
                </Box>
              )}
              {conditionFilter !== "all" && (
                <Box style={styles.filterChip}>
                  <Text style={styles.filterChipText}>
                    Condition: {conditionFilter}
                  </Text>
                  <TouchableOpacity onPress={() => setConditionFilter("all")}>
                    <X size={14} color="#6b7280" />
                  </TouchableOpacity>
                </Box>
              )}
              {availableOnly && (
                <Box style={styles.filterChip}>
                  <Text style={styles.filterChipText}>Available Only</Text>
                  <TouchableOpacity onPress={() => setAvailableOnly(false)}>
                    <X size={14} color="#6b7280" />
                  </TouchableOpacity>
                </Box>
              )}
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </HStack>
          </ScrollView>
        )}
      </Box>

      {/* Equipment Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <Box style={styles.loadingContainer}>
            <Spinner size="large" />
            <Text style={styles.loadingText}>Loading equipment...</Text>
          </Box>
        ) : filteredEquipment.length === 0 ? (
          <Box style={styles.emptyContainer}>
            <Package size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Equipment Found</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "No equipment available at the moment"}
            </Text>
            {hasActiveFilters && (
              <Button
                variant="outline"
                style={styles.clearFiltersButtonLarge}
                onPress={clearFilters}
              >
                <ButtonText>Clear Filters</ButtonText>
              </Button>
            )}
          </Box>
        ) : (
          <Box style={styles.gridContainer}>
            {filteredEquipment.map((item) => (
              <Box key={item.id} style={styles.gridItem}>
                <Pressable
                  onPress={() => handleEquipmentClick(item)}
                  style={styles.pressableContainer}
                >
                  <Card style={styles.equipmentCard}>
                    <Image
                      source={{
                        uri:
                          item.imageUrl ||
                          "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
                      }}
                      style={styles.equipmentImage}
                      alt={item.name}
                    />

                    {/* Availability Indicator */}
                    <Box
                      style={
                        item.status === "unavailable"
                          ? styles.availabilityBadgeUnavailable
                          : item.status === "maintenance"
                            ? styles.availabilityBadgeMaintenance
                            : item.availableQuantity > 0
                              ? styles.availabilityBadgeAvailable
                              : styles.availabilityBadgeUnavailable
                      }
                    >
                      <Text style={styles.availabilityText}>
                        {item.status === "unavailable"
                          ? "Unavailable"
                          : item.status === "maintenance"
                            ? "Maintenance"
                            : item.availableQuantity > 0
                              ? "Available"
                              : "Out of Stock"}
                      </Text>
                    </Box>

                    <HStack style={styles.cardContent} space="sm">
                      <VStack style={styles.cardLeftSection} space="xs">
                        <Heading size="sm" style={styles.equipmentName}>
                          {item.name}
                        </Heading>
                        <Text
                          style={styles.equipmentDescription}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      </VStack>

                      <VStack style={styles.cardRightSection} space="xs">
                        <HStack style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Avail:</Text>
                          <Text style={styles.infoValue}>
                            {item.availableQuantity}/{item.totalQuantity}
                          </Text>
                        </HStack>
                        <HStack style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Price:</Text>
                          <Text style={styles.infoPriceValue}>
                            ₱{item.pricePerUnit.toFixed(0)}
                          </Text>
                        </HStack>
                        <Badge
                          action={getConditionColor(item.condition)}
                          size="sm"
                        >
                          <BadgeText style={styles.badgeText}>
                            {item.condition}
                          </BadgeText>
                        </Badge>
                      </VStack>
                    </HStack>
                  </Card>
                </Pressable>
              </Box>
            ))}
          </Box>
        )}
      </ScrollView>

      {/* Equipment Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedEquipment(null);
        }}
        size="lg"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Equipment Details</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            {selectedEquipment && (
              <VStack space="md">
                <Image
                  source={{
                    uri:
                      selectedEquipment.imageUrl ||
                      "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
                  }}
                  style={styles.modalImage}
                  alt={selectedEquipment.name}
                />

                <VStack space="sm">
                  <VStack space="xs">
                    <Text style={styles.modalLabel}>Name</Text>
                    <Text style={styles.modalValue}>
                      {selectedEquipment.name}
                    </Text>
                  </VStack>

                  <VStack space="xs">
                    <Text style={styles.modalLabel}>Description</Text>
                    <Text style={styles.modalValue}>
                      {selectedEquipment.description}
                    </Text>
                  </VStack>

                  <HStack space="sm">
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Total Quantity</Text>
                      <Text style={styles.modalValue}>
                        {selectedEquipment.totalQuantity}
                      </Text>
                    </VStack>
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Available</Text>
                      <Text
                        style={
                          selectedEquipment.availableQuantity > 0
                            ? styles.modalValueGreen
                            : styles.modalValueRed
                        }
                      >
                        {selectedEquipment.availableQuantity}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack space="sm">
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Borrowed</Text>
                      <Text style={styles.modalValue}>
                        {selectedEquipment.borrowedQuantity}
                      </Text>
                    </VStack>
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Price per Unit</Text>
                      <Text style={styles.modalValueBlue}>
                        ₱{selectedEquipment.pricePerUnit.toFixed(2)}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack space="sm">
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Status</Text>
                      <Badge
                        action={getStatusColor(selectedEquipment.status)}
                        style={styles.badgeAlignStart}
                      >
                        <BadgeText>{selectedEquipment.status}</BadgeText>
                      </Badge>
                    </VStack>
                    <VStack space="xs" style={styles.modalFieldFlex}>
                      <Text style={styles.modalLabel}>Condition</Text>
                      <Badge
                        action={getConditionColor(selectedEquipment.condition)}
                        style={styles.badgeAlignStart}
                      >
                        <BadgeText>{selectedEquipment.condition}</BadgeText>
                      </Badge>
                    </VStack>
                  </HStack>
                </VStack>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              style={styles.modalButtonOutline}
              onPress={() => {
                setShowDetailsModal(false);
                setSelectedEquipment(null);
              }}
            >
              <ButtonText>Close</ButtonText>
            </Button>
            <Button
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowDetailsModal(false);
                setSelectedEquipment(null);
                router.push("/user/create-transaction");
              }}
            >
              <ButtonText>Borrow This</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Filter Equipment</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              {/* Status Filter */}
              <VStack space="xs">
                <Text style={styles.filterSectionTitle}>Status</Text>
                <HStack space="xs" style={styles.filterOptionsRow}>
                  {(
                    [
                      "all",
                      "available",
                      "unavailable",
                      "maintenance",
                    ] as FilterStatus[]
                  ).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={
                        statusFilter === status
                          ? styles.filterOptionSelected
                          : styles.filterOption
                      }
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text
                        style={
                          statusFilter === status
                            ? styles.filterOptionTextSelected
                            : styles.filterOptionText
                        }
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              {/* Condition Filter */}
              <VStack space="xs">
                <Text style={styles.filterSectionTitle}>Condition</Text>
                <HStack space="xs" style={styles.filterOptionsRow}>
                  {(
                    ["all", "good", "fair", "needs repair"] as FilterCondition[]
                  ).map((condition) => (
                    <TouchableOpacity
                      key={condition}
                      style={
                        conditionFilter === condition
                          ? styles.filterOptionSelected
                          : styles.filterOption
                      }
                      onPress={() => setConditionFilter(condition)}
                    >
                      <Text
                        style={
                          conditionFilter === condition
                            ? styles.filterOptionTextSelected
                            : styles.filterOptionText
                        }
                      >
                        {condition.charAt(0).toUpperCase() + condition.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              {/* Available Only Toggle */}
              <TouchableOpacity
                style={
                  availableOnly
                    ? styles.toggleOptionActive
                    : styles.toggleOption
                }
                onPress={() => setAvailableOnly(!availableOnly)}
              >
                <Text
                  style={
                    availableOnly
                      ? styles.toggleOptionTextActive
                      : styles.toggleOptionText
                  }
                >
                  Show Available Only
                </Text>
              </TouchableOpacity>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              style={styles.modalButtonOutline}
              onPress={() => {
                clearFilters();
                setShowFilterModal(false);
              }}
            >
              <ButtonText>Clear All</ButtonText>
            </Button>
            <Button
              style={styles.modalButtonPrimary}
              onPress={() => setShowFilterModal(false)}
            >
              <ButtonText>Apply</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
    padding: 40,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    color: "#1f2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  statsScrollView: {
    marginTop: 16,
  },
  statsContainer: {
    paddingBottom: 4,
  },
  statCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    minWidth: 100,
    paddingLeft: 10,
    paddingRight: 10,
  },
  statCardGreen: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statCardRed: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statCardOrange: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statNumberGreen: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 4,
  },
  statNumberRed: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 4,
  },
  statNumberOrange: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f59e0b",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  searchFilterContainer: {
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchFilterRow: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  inputSlotLeft: {
    paddingLeft: 12,
  },
  inputSlotRight: {
    paddingRight: 12,
  },
  filterButton: {
    width: 48,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  filterButtonActive: {
    width: 48,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
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
  activeFiltersRow: {
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    paddingLeft: 5,
    paddingRight: 5,
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    alignItems: "center",
  },
  gridContainer: {
    width: "100%",
    maxWidth: 600,
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  clearFiltersButtonLarge: {
    marginTop: 16,
  },
  gridItem: {
    width: "100%",
    marginBottom: 12,
  },
  pressableContainer: {
    flex: 1,
  },
  equipmentCard: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  equipmentImage: {
    height: 120,
    width: "100%",
    borderRadius: 8,
    marginBottom: 12,
  },
  availabilityBadgeAvailable: {
    position: "absolute",
    top: 20,
    right: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  availabilityBadgeUnavailable: {
    position: "absolute",
    top: 20,
    right: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#ef4444",
  },
  availabilityBadgeMaintenance: {
    position: "absolute",
    top: 20,
    right: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
    paddingHorizontal: 5,
  },
  cardContent: {
    alignItems: "flex-end",
  },
  cardLeftSection: {
    flex: 1,
    marginRight: 12,
  },
  cardRightSection: {
    alignItems: "flex-end",
    minWidth: 100,
  },
  equipmentName: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "600",
  },
  equipmentDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  infoRow: {
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  infoPriceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3b82f6",
  },
  badgeText: {
    fontSize: 10,
  },
  modalImage: {
    height: 240,
    width: "100%",
    borderRadius: 8,
  },
  modalLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalValueGreen: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  modalValueRed: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  modalValueBlue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
  },
  modalFieldFlex: {
    flex: 1,
  },
  badgeAlignStart: {
    alignSelf: "flex-start",
  },
  modalButtonOutline: {
    flex: 1,
    marginRight: 8,
  },
  modalButtonPrimary: {
    flex: 1,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  filterOptionsRow: {
    flexWrap: "wrap",
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  filterOptionSelected: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  filterOptionTextSelected: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
  },
  toggleOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  toggleOptionActive: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  toggleOptionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
  },
  toggleOptionTextActive: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e40af",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
});
