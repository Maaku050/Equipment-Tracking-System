// admin/reports.tsx

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  View,
  Platform,
} from "react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
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
  PrinterIcon,
} from "lucide-react-native";
import { useRecords, RecordStatus } from "@/context/RecordsContext";
import DateTimePicker from "@/components/DateTimePicker";
import { HStack } from "@/components/ui/hstack";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import AdminGuard from "@/components/AdminGuard";

interface FilterState {
  status: RecordStatus[];
  startDate: Date | null;
  endDate: Date | null;
}

export default function RecordsReport() {
  const {
    records,
    stats,
    loading,
    error,
    searchRecords,
    getRecordsByStatus,
    getRecordsByDateRange,
  } = useRecords();
  const [filteredRecords, setFilteredRecords] = useState(records);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    startDate: null,
    endDate: null,
  });
  const [viewMode, setViewMode] = useState<"report" | "records">("report");

  const statusOptions: RecordStatus[] = [
    "Complete",
    "Incomplete",
    "Complete and Overdue",
  ];

  useEffect(() => {
    applyFilters();
  }, [records, searchQuery, filters]);

  const applyFilters = () => {
    let filtered = [...records];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchRecords(searchQuery);
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter((record) =>
        filters.status.includes(record.finalStatus),
      );
    }

    // Apply date range filter
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      const dateFiltered = getRecordsByDateRange(startDate, endDate);

      // Intersect with current filtered results
      filtered = filtered.filter((record) =>
        dateFiltered.some((dr) => dr.id === record.id),
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

  const handlePrint = () => {
    if (Platform.OS === "web") {
      // Create print content
      const printContent = generatePrintHTML();

      // Open print window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();

        // Wait for content to load then print
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const generatePrintHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    let recordsHTML = "";
    filteredRecords.forEach((record, index) => {
      const itemsHTML = record.items
        .map(
          (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.itemName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₱${item.pricePerQuantity.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.returnedQuantity}/${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₱${(item.pricePerQuantity * item.quantity).toFixed(2)}</td>
        </tr>
      `,
        )
        .join("");

      recordsHTML += `
        <div style="page-break-inside: avoid; margin-bottom: 24px; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f9fafb; padding: 16px; border-bottom: 2px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <div>
                <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${record.studentName}</h3>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">${record.studentEmail}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af; font-family: monospace;">${record.transactionId}</p>
              </div>
              <div style="text-align: right;">
                <div style="display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: ${getStatusColor(record.finalStatus)}; color: white; font-size: 11px; font-weight: 600; margin-bottom: 8px;">
                  ${record.finalStatus}
                </div>
                <p style="margin: 0; font-size: 11px; color: #9ca3af;">Borrowed: ${formatDate(record.borrowedDate)}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">Completed: ${formatDateTime(record.completedDate)}</p>
              </div>
            </div>
          </div>
          
          <div style="padding: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 8px; text-align: left; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Item</th>
                  <th style="padding: 8px; text-align: center; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Price/Unit</th>
                  <th style="padding: 8px; text-align: center; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Returned</th>
                  <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px;">Total:</span>
                <span style="font-weight: 700; font-size: 14px; color: #3b82f6;">₱${record.totalPrice.toFixed(2)}</span>
              </div>
              ${
                record.fineAmount > 0
                  ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 14px;">Fine:</span>
                <span style="font-weight: 700; font-size: 14px; color: #ef4444;">₱${record.fineAmount.toFixed(2)}</span>
              </div>
              `
                  : ""
              }
              ${
                record.notes
                  ? `
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #6b7280;">Notes:</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #374151; font-style: italic;">${record.notes}</p>
              </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Records Report - ${currentDate}</title>
        <style>
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: #1f2937;
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #3b82f6;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1f2937;">eLabTrack Records Report</h1>
          <p style="margin: 0; font-size: 14px; color: #6b7280;">Generated on ${currentDate}</p>
        </div>
        
        <div style="margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
          <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">Summary Statistics</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
            <div>
              <p style="margin: 0; font-size: 11px; color: #6b7280;">Total Records</p>
              <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold;">${stats.total}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #6b7280;">Complete</p>
              <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #10b981;">${stats.complete}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #6b7280;">Incomplete</p>
              <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #f97316;">${stats.incomplete + stats.incompleteAndOverdue}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #6b7280;">Total Fines</p>
              <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #ef4444;">₱${stats.totalFines.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Records (${filteredRecords.length})</h2>
        ${recordsHTML}
      </body>
      </html>
    `;
  };

  const getStatusColor = (status: RecordStatus) => {
    switch (status) {
      case "Complete":
        return "#10b981";
      case "Incomplete":
        return "#f97316";
      case "Overdue":
        return "#ef4444";
      case "Incomplete and Overdue":
        return "#dc2626";
      case "Complete and Overdue":
        return "#f59e0b";
      default:
        return "#6b7280";
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

  const aggregateEquipmentUsage = (records: any[]) => {
    const map: Record<string, { name: string; count: number }> = {};

    records.forEach((record) => {
      record.items.forEach((item: any) => {
        if (!map[item.equipmentId]) {
          map[item.equipmentId] = {
            name: item.itemName,
            count: 0,
          };
        }
        map[item.equipmentId].count += item.quantity;
      });
    });

    return Object.values(map);
  };

  const screenWidth = Dimensions.get("window").width;

  const usageData = aggregateEquipmentUsage(filteredRecords);

  const chartData = {
    labels: usageData.map((u) => u.name),
    datasets: [
      {
        data: usageData.map((u) => u.count),
      },
    ],
  };

  if (loading) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading records...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </Box>
    );
  }

  return (
    <AdminGuard>
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
                  placeholder="Search by name, email, or transaction ID..."
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

          {/* Stats Summary with Print Button */}
          <View style={styles.statsHeader}>
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
                  <Text style={styles.statValueOrange}>
                    {stats.incomplete + stats.incompleteAndOverdue}
                  </Text>
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
            <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
              <PrinterIcon size={20} color="#ffffff" />
              <Text style={styles.printButtonText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            paddingLeft: 16,
            paddingRight: 16,
            marginTop: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => setViewMode("report")}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              backgroundColor: viewMode === "report" ? "#3b82f6" : "#e5e7eb",
              marginRight: 6,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: viewMode === "report" ? "#fff" : "#374151",
                fontWeight: "600",
              }}
            >
              📊 Equipment Usage Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("records")}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              backgroundColor: viewMode === "records" ? "#3b82f6" : "#e5e7eb",
              marginLeft: 6,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: viewMode === "records" ? "#fff" : "#374151",
                fontWeight: "600",
              }}
            >
              📋 Records List
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === "report" ? (
          <>
            {/* 📊 Equipment Usage Report */}
            <View
              style={{
                padding: 16,
                backgroundColor: "#fff",
                borderBottomWidth: 1,
                borderColor: "#e5e7eb",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}
              >
                Equipment Usage Report
              </Text>

              {usageData.length === 0 ? (
                <Text style={{ color: "#6b7280" }}>
                  No usage data available.
                </Text>
              ) : (
                <ScrollView horizontal>
                  <LineChart
                    data={chartData}
                    width={Math.max(screenWidth, usageData.length * 80)}
                    height={280}
                    fromZero
                    yAxisLabel=""
                    chartConfig={{
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: () => "#374151",
                      propsForDots: {
                        r: "4",
                        strokeWidth: "2",
                        stroke: "#2563eb",
                      },
                      propsForBackgroundLines: {
                        strokeDasharray: "",
                      },
                    }}
                    bezier
                    style={{ borderRadius: 12 }}
                  />
                </ScrollView>
              )}
            </View>
          </>
        ) : null}

        {viewMode === "records" ? (
          <>
            {/* Records List */}
            <ScrollView style={styles.recordsList}>
              {filteredRecords.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No records found</Text>
                </View>
              ) : (
                <View style={styles.cardsContainer}>
                  {filteredRecords.map((record) => (
                    <View key={record.id} style={styles.recordCard}>
                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View style={styles.nameStatusRow}>
                            <Text style={styles.studentName}>
                              {record.studentName}
                            </Text>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor: getStatusColor(
                                    record.finalStatus,
                                  ),
                                },
                              ]}
                            >
                              <Text style={styles.statusText}>
                                {record.finalStatus}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.studentEmail}>
                            {record.studentEmail}
                          </Text>
                          <Text style={styles.transactionId}>
                            {record.transactionId}
                          </Text>
                        </View>
                        <View style={styles.headerRight}>
                          <Text style={styles.dateLabel}>Borrowed:</Text>
                          <Text style={styles.dateValue}>
                            {formatDate(record.borrowedDate)}
                          </Text>
                          <Text style={styles.dateLabel}>Completed:</Text>
                          <Text style={styles.dateValue}>
                            {formatDateTime(record.completedDate)}
                          </Text>
                        </View>
                      </View>

                      {/* Items List */}
                      <View style={styles.itemsSection}>
                        {record.items.map((item) => (
                          <View key={item.id} style={styles.itemRow}>
                            <View style={styles.itemLeft}>
                              <Text style={styles.itemName}>
                                {item.itemName}
                              </Text>
                              <Text style={styles.itemDetails}>
                                Qty: {item.quantity} | ₱{item.pricePerQuantity}{" "}
                                each
                              </Text>
                              <Text style={styles.returnedInfo}>
                                Returned: {item.returnedQuantity}/
                                {item.quantity}
                              </Text>
                            </View>
                            <Text style={styles.itemPrice}>
                              ₱
                              {(item.pricePerQuantity * item.quantity).toFixed(
                                2,
                              )}
                            </Text>
                          </View>
                        ))}
                      </View>

                      {/* Summary */}
                      <View style={styles.summarySection}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Total:</Text>
                          <Text style={styles.totalPrice}>
                            ₱{record.totalPrice.toFixed(2)}
                          </Text>
                        </View>
                        {record.fineAmount > 0 && (
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Fine:</Text>
                            <Text style={styles.fineAmount}>
                              ₱{record.fineAmount.toFixed(2)}
                            </Text>
                          </View>
                        )}
                        {record.notes && (
                          <View style={styles.notesSection}>
                            <Text style={styles.notesLabel}>Notes:</Text>
                            <Text style={styles.notesText}>{record.notes}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        ) : null}

        {/* Filter Modal - Gluestack UI */}
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
              {/* Status Filter */}
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

              {/* Date Range Filter */}
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
    </AdminGuard>
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
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
  },
  statsScrollView: {
    flex: 1,
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
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  printButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  recordsList: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  cardsContainer: {
    padding: 16,
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  studentName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1f2937",
    marginRight: 8,
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
  studentEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "monospace",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 2,
  },
  itemsSection: {
    padding: 16,
    backgroundColor: "#f9fafb",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  returnedInfo: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  summarySection: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
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
  notesSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
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
  },
  filterSection: {
    marginBottom: 5,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  statusOptions: {
    marginBottom: 8,
  },
  statusOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    marginBottom: 8,
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
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dateInput: {
    marginBottom: 12,
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
