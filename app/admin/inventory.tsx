// admin/inventory.tsx
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Plus } from "lucide-react-native";
import React, { useState } from "react";
import { Text, ScrollView, Pressable, StyleSheet } from "react-native";
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

export default function EquipmentInterface() {
  const { equipment, loading, error } = useEquipment();
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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
        ) : (
          <Grid
            className="gap-y-1 gap-x-1"
            _extra={{
              className: "grid-cols-4",
            }}
          >
            {equipment.map((item) => (
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
                        Price: ${item.pricePerUnit.toFixed(2)}
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
        placement="top right"
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
});
