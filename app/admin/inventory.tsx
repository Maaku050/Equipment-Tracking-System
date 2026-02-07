// app/admin/inventory.tsx | Inventory Interface
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Plus, Search, Printer, PrinterIcon } from "lucide-react-native";
import React, { useState, useMemo } from "react";
import {
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  View,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Grid, GridItem } from "@/components/ui/grid";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Badge, BadgeText } from "@/components/ui/badge";
import AddEquipmentModal from "@/_modals/addEquipmentModal";
import EquipmentDetailsModal from "@/_modals/equipmentDetailsModal";
import { useEquipment, Equipment } from "@/context/EquipmentContext";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import AdminGuard from "@/components/AdminGuard";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

export default function EquipmentInterface() {
  const { equipment, loading, error } = useEquipment();
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter equipment based on search query
  const filteredEquipment = useMemo(() => {
    if (!searchQuery.trim()) {
      return equipment;
    }

    const query = searchQuery.toLowerCase();
    return equipment.filter((item) => {
      return (
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query) ||
        item.condition?.toLowerCase().includes(query)
      );
    });
  }, [equipment, searchQuery]);

  const handleEquipmentClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowDetailsModal(true);
  };

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

  const getStatusColorHex = (status: string) => {
    switch (status) {
      case "available":
        return "#10b981";
      case "unavailable":
        return "#ef4444";
      case "maintenance":
        return "#f59e0b";
      default:
        return "#3b82f6";
    }
  };

  const getConditionColorHex = (condition: string) => {
    switch (condition) {
      case "good":
        return "#10b981";
      case "fair":
        return "#f59e0b";
      case "needs repair":
        return "#ef4444";
      default:
        return "#3b82f6";
    }
  };

  const handlePrint = () => {
    if (Platform.OS === "web") {
      const printContent = generatePrintHTML();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const generatePrintHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const equipmentToPrint = searchQuery.trim() ? filteredEquipment : equipment;

    const equipmentCardsHTML = equipmentToPrint
      .map(
        (item) => `
        <div class="equipment-card">
          <img 
            src="${item.imageUrl || "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc"}" 
            alt="${item.name}"
            class="equipment-image"
          />
          <h3 class="equipment-name">${item.name}</h3>
          <div class="equipment-details-container">
            <p class="equipment-details"><strong>Available:</strong> ${item.availableQuantity} / ${item.totalQuantity}</p>
            <p class="equipment-details"><strong>Borrowed:</strong> ${item.borrowedQuantity}</p>
            <p class="equipment-details"><strong>Price:</strong> ₱${item.pricePerUnit.toFixed(2)}</p>
          </div>
          <div class="badges">
            <span class="badge" style="background-color: ${getStatusColorHex(item.status)}">
              ${item.status}
            </span>
            <span class="badge" style="background-color: ${getConditionColorHex(item.condition)}">
              ${item.condition}
            </span>
          </div>
        </div>
      `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Equipment Inventory Report - ${currentDate}</title>
        <style>
          @media print {
            body { margin: 0; }
            @page { 
              margin: 0.5cm; 
              size: landscape;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 15px;
            margin: 0;
            line-height: 1.3;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: #1f2937;
          }
          .header p {
            margin: 3px 0;
            color: #6b7280;
            font-size: 12px;
          }
          .equipment-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-top: 15px;
          }
          .equipment-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            page-break-inside: avoid;
          }
          .equipment-image {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 4px;
            margin-bottom: 8px;
            background-color: #f3f4f6;
          }
          .equipment-name {
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 6px 0;
            color: #111827;
            line-height: 1.2;
          }
          .equipment-description {
            font-size: 11px;
            color: #6b7280;
            margin: 0 0 8px 0;
            line-height: 1.3;
          }
          .equipment-details-container {
            margin: 8px 0;
          }
          .equipment-details {
            font-size: 10px;
            color: #374151;
            margin: 2px 0;
          }
          .badges {
            display: flex;
            gap: 4px;
            margin-top: 8px;
            flex-wrap: wrap;
          }
          .badge {
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: 600;
            color: white;
            text-transform: capitalize;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Equipment Inventory Report</h1>
          <p>Generated on ${currentDate}</p>
          <p>Total Equipment: ${equipmentToPrint.length}</p>
          ${searchQuery.trim() ? `<p style="font-style: italic;">Search Filter: "${searchQuery}"</p>` : ""}
        </div>
        
        <div class="equipment-grid">
          ${equipmentCardsHTML}
        </div>
      </body>
      </html>
    `;
  };

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
        style={{ padding: 15 }}
        showsHorizontalScrollIndicator={false}
      >
        {/* Search Bar and Print Button */}
        <View className="mb-4" style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input variant="outline" size="md">
              <InputSlot className="pl-3">
                <InputIcon as={Search} />
              </InputSlot>
              <InputField
                placeholder="Search by name, description, status, or condition..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </Input>
          </View>
          <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
            disabled={loading || equipment.length === 0}
          >
            <PrinterIcon size={20} color="#ffffff" />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Box style={{ padding: 20, alignItems: "center" }}>
            <Spinner />
          </Box>
        ) : !equipment || equipment.length === 0 ? (
          <Box style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: "#666" }}>
              No equipment found
            </Text>
          </Box>
        ) : filteredEquipment.length === 0 ? (
          <Box style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ fontSize: 16, color: "#666" }}>
              No equipment matches your search
            </Text>
            <Text style={{ fontSize: 14, color: "#999", marginTop: 8 }}>
              Try a different search term
            </Text>
          </Box>
        ) : (
          <Grid
            className="gap-y-1 gap-x-1"
            _extra={{
              className: "grid-cols-4",
            }}
          >
            {filteredEquipment.map((item) => (
              <GridItem
                key={item.id}
                _extra={{
                  className: "col-span-3 md:col-span-1",
                }}
              >
                <Pressable onPress={() => handleEquipmentClick(item)}>
                  <Card className="p-5 rounded-lg max-w-[360px] m-3">
                    <Image
                      source={{
                        uri:
                          item.imageUrl ||
                          "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
                      }}
                      className="mb-6 h-[240px] w-full rounded-md aspect-[263/240]"
                      alt={item.name}
                    />
                    <Heading size="md" className="mb-2">
                      {item.name}
                    </Heading>
                    <Text className="text-sm font-normal mb-3 text-typography-700">
                      {item.description}
                    </Text>

                    <Box style={{ gap: 4 }}>
                      <Text className="text-sm text-typography-600">
                        Available: {item.availableQuantity} /{" "}
                        {item.totalQuantity}
                      </Text>
                      <Text className="text-sm text-typography-600">
                        Borrowed: {item.borrowedQuantity}
                      </Text>
                      <Text className="text-sm text-typography-600">
                        Price: ₱{item.pricePerUnit.toFixed(2)}
                      </Text>
                    </Box>

                    <Box
                      style={{ flexDirection: "row", gap: 8, marginTop: 12 }}
                    >
                      <Badge action={getStatusColor(item.status)}>
                        <BadgeText>{item.status}</BadgeText>
                      </Badge>
                      <Badge action={getConditionColor(item.condition)}>
                        <BadgeText>{item.condition}</BadgeText>
                      </Badge>
                    </Box>
                  </Card>
                </Pressable>
              </GridItem>
            ))}
          </Grid>
        )}

        <AddEquipmentModal
          visible={showAddEquipmentModal}
          onClose={() => setShowAddEquipmentModal(false)}
          onSuccess={() => {
            // Context auto-updates via onSnapshot
            setShowAddEquipmentModal(false);
          }}
        />

        <EquipmentDetailsModal
          visible={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedEquipment(null);
          }}
          equipment={selectedEquipment}
        />
      </ScrollView>

      <Fab
        size="sm"
        placement="bottom right"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
        onPress={() => setShowAddEquipmentModal(true)}
      >
        <FabIcon as={Plus} />
        <FabLabel>Add Equipment</FabLabel>
      </Fab>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
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
});
