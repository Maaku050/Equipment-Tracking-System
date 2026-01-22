import React, { useState, useEffect } from "react";
import { ScrollView, View, Alert } from "react-native";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from "@/components/ui/modal";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Image } from "@/components/ui/image";
import { Box } from "@/components/ui/box";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Edit, Package } from "lucide-react-native";
import { Equipment } from "@/context/EquipmentContext";
import { useTransaction } from "@/context/TransactionContext";
import EditEquipmentModal from "@/_modals/editEquipmentModal";

interface BorrowerInfo {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentImageUrl?: string;
  borrowedQuantity: number;
  status: string;
  borrowedDate: Date;
  dueDate: Date;
  transactionId: string;
}

interface EquipmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

export default function EquipmentDetailsModal({
  visible,
  onClose,
  equipment,
}: EquipmentDetailsModalProps) {
  const { transactions } = useTransaction();
  const [borrowers, setBorrowers] = useState<BorrowerInfo[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (equipment && visible) {
      loadBorrowers();
    }
  }, [equipment, visible, transactions]);

  const loadBorrowers = () => {
    if (!equipment) return;

    const borrowerList: BorrowerInfo[] = [];

    // Find all transactions that include this equipment
    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        if (item.equipmentId === equipment.id) {
          // Only show if not fully returned or is ongoing/overdue
          if (!item.returned || transaction.status !== "Complete") {
            borrowerList.push({
              studentId: transaction.studentId,
              studentName: transaction.studentName,
              studentEmail: transaction.studentEmail,
              studentImageUrl: "", // You can fetch from users collection if needed
              borrowedQuantity: item.quantity - item.returnedQuantity,
              status: transaction.status,
              borrowedDate: transaction.borrowedDate,
              dueDate: transaction.dueDate,
              transactionId: transaction.id,
            });
          }
        }
      });
    });

    setBorrowers(borrowerList);
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

  const getTransactionStatusColor = (status: string) => {
    if (status.includes("Overdue")) return "error";
    if (status === "Ongoing") return "info";
    if (status === "Complete") return "success";
    if (status === "Request") return "warning";
    return "info";
  };

  if (!equipment) return null;

  return (
    <>
      <Modal isOpen={visible} onClose={onClose} size="lg">
        <ModalBackdrop />
        <ModalContent className="max-w-6xl h-[90vh]">
          <ModalHeader>
            <Heading size="lg">Equipment Details</Heading>
            <ModalCloseButton />
          </ModalHeader>

          <ModalBody
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
          >
            <HStack space="xl" className="flex-1">
              {/* LEFT SIDE - Equipment Details */}
              <VStack space="lg" className="flex-1">
                <Image
                  source={{
                    uri:
                      equipment.imageUrl ||
                      "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
                  }}
                  className="w-full h-[300px] rounded-lg"
                  alt={equipment.name}
                  resizeMode="cover"
                />

                <VStack space="md">
                  <Heading size="xl">{equipment.name}</Heading>
                  <Text className="text-typography-700">
                    {equipment.description}
                  </Text>

                  <HStack space="sm">
                    <Badge action={getStatusColor(equipment.status)}>
                      <BadgeText>{equipment.status}</BadgeText>
                    </Badge>
                    <Badge action={getConditionColor(equipment.condition)}>
                      <BadgeText>{equipment.condition}</BadgeText>
                    </Badge>
                  </HStack>
                </VStack>

                <Divider />

                <VStack space="md">
                  <Heading size="sm">Inventory Information</Heading>

                  <HStack className="justify-between">
                    <Text className="text-typography-600">Total Quantity:</Text>
                    <Text className="font-semibold">
                      {equipment.totalQuantity}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text className="text-typography-600">Available:</Text>
                    <Text className="font-semibold text-success-600">
                      {equipment.availableQuantity}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text className="text-typography-600">Borrowed:</Text>
                    <Text className="font-semibold text-warning-600">
                      {equipment.borrowedQuantity}
                    </Text>
                  </HStack>

                  <HStack className="justify-between">
                    <Text className="text-typography-600">Price per Unit:</Text>
                    <Text className="font-semibold">
                      ₱{equipment.pricePerUnit.toFixed(2)}
                    </Text>
                  </HStack>
                </VStack>

                <Divider />

                <Button
                  onPress={() => setShowEditModal(true)}
                  action="secondary"
                >
                  <ButtonIcon as={Edit} />
                  <ButtonText>Edit Equipment Details</ButtonText>
                </Button>
              </VStack>

              {/* RIGHT SIDE - Borrowers List */}
              <VStack space="lg" className="flex-1" style={{ maxHeight: 400 }}>
                <HStack className="items-center justify-between">
                  <Heading size="md">Current Borrowers</Heading>
                  <Badge action="info">
                    <BadgeText>{borrowers.length} active</BadgeText>
                  </Badge>
                </HStack>

                {borrowers.length === 0 ? (
                  <Box className="p-8 items-center justify-center bg-background-50 rounded-lg">
                    <Package size={48} color="#999" />
                    <Text className="text-typography-500 mt-4 text-center">
                      No active borrowers
                    </Text>
                    <Text className="text-typography-400 text-sm text-center mt-2">
                      This equipment is currently not borrowed by anyone
                    </Text>
                  </Box>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                  >
                    <VStack space="md">
                      {borrowers.map((borrower, index) => (
                        <Box
                          key={`${borrower.transactionId}-${index}`}
                          className="p-4 bg-background-50 rounded-lg border border-outline-200"
                        >
                          <HStack space="md" className="items-start">
                            {/* User Image */}
                            <Image
                              source={{
                                uri:
                                  borrower.studentImageUrl ||
                                  "https://ui-avatars.com/api/?name=" +
                                    encodeURIComponent(borrower.studentName) +
                                    "&background=random",
                              }}
                              className="w-12 h-12 rounded-full"
                              alt={borrower.studentName}
                            />

                            {/* Borrower Info */}
                            <VStack space="xs" className="flex-1">
                              <Text className="font-semibold text-typography-900">
                                {borrower.studentName}
                              </Text>
                              <Text className="text-sm text-typography-600">
                                {borrower.studentEmail}
                              </Text>

                              <HStack space="xs" className="items-center mt-1">
                                <Text className="text-sm text-typography-700">
                                  Borrowed
                                </Text>
                                <Badge action="warning" size="sm">
                                  <BadgeText>
                                    {borrower.borrowedQuantity}x
                                  </BadgeText>
                                </Badge>
                                <Text className="text-sm text-typography-700">
                                  {equipment.name}
                                </Text>
                              </HStack>

                              <VStack space="xs" className="mt-2">
                                <HStack className="justify-between">
                                  <Text className="text-xs text-typography-500">
                                    Borrowed:
                                  </Text>
                                  <Text className="text-xs text-typography-700">
                                    {borrower.borrowedDate.toLocaleDateString()}
                                  </Text>
                                </HStack>
                                <HStack className="justify-between">
                                  <Text className="text-xs text-typography-500">
                                    Due:
                                  </Text>
                                  <Text className="text-xs text-typography-700">
                                    {borrower.dueDate.toLocaleDateString()}
                                  </Text>
                                </HStack>
                              </VStack>

                              <Badge
                                action={getTransactionStatusColor(
                                  borrower.status,
                                )}
                                size="sm"
                                className="self-start mt-2"
                              >
                                <BadgeText>{borrower.status}</BadgeText>
                              </Badge>
                            </VStack>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </ScrollView>
                )}
              </VStack>
            </HStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Equipment Modal */}
      <EditEquipmentModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        equipment={equipment}
        onSuccess={() => {
          setShowEditModal(false);
          onClose();
        }}
      />
    </>
  );
}
