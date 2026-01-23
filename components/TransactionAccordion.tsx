// components/TransactionAccordion.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Alert,
} from "react-native";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  AccordionTitleText,
  AccordionIcon,
} from "@/components/ui/accordion";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from "@/components/ui/checkbox";
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
import { Icon, CloseIcon } from "@/components/ui/icon";
import {
  approveTransaction,
  BorrowedItem,
  completeTransaction,
  deleteTransaction,
  denyTransaction,
} from "@/_helpers/firebaseHelpers";
import { Check, ChevronDownIcon, ChevronUpIcon } from "lucide-react-native";

interface Transaction {
  id: string;
  transactionId: string;
  studentName: string;
  studentEmail: string;
  dueDate: Date;
  borrowedDate: Date;
  items: BorrowedItem[];
  status: string;
  totalPrice: number;
}

interface TransactionAccordionProps {
  transactions: Transaction[];
  onComplete?: (
    transactionId: string,
    itemReturnStates: { [key: string]: { checked: boolean; quantity: number } },
  ) => Promise<void>;
  onDelete: (transactionId: string) => Promise<void>;
  onApprove?: (transactionId: string) => Promise<void>;
  onDeny?: (transactionId: string) => Promise<void>;
  loading?: boolean;
}

export default function TransactionAccordion({
  transactions,
  onComplete,
  onDelete,
  onApprove,
  onDeny,
  loading = false,
}: TransactionAccordionProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [itemReturnStates, setItemReturnStates] = useState<{
    [key: string]: { checked: boolean; quantity: number };
  }>({});

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

  const openCompleteModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const initialStates: {
      [key: string]: { checked: boolean; quantity: number };
    } = {};
    transaction.items.forEach((item) => {
      initialStates[item.id] = {
        checked: item.returned,
        quantity: item.returnedQuantity || 0,
      };
    });
    setItemReturnStates(initialStates);
    setShowCompleteModal(true);
  };

  const handleItemCheck = (itemId: string, checked: boolean) => {
    if (!selectedTransaction) return;

    const item = selectedTransaction.items.find((i) => i.id === itemId);
    if (!item) return;

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        checked,
        // When checking, set quantity to full amount (complete return)
        // When unchecking, reset to 0
        quantity: checked ? item.quantity : 0,
      },
    }));
  };

  const handleQuantityChange = (itemId: string, quantity: string) => {
    if (!selectedTransaction) return;

    const numQuantity = parseInt(quantity) || 0;
    const item = selectedTransaction.items.find((i) => i.id === itemId);
    if (!item) return;

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        // Automatically check if quantity > 0, uncheck if 0
        checked: numQuantity > 0,
        quantity: numQuantity,
      },
    }));
  };

  const handleCompleteTransaction = async () => {
    if (!selectedTransaction || !onComplete) return;

    // Validate that checked items have quantity > 0
    const invalidItems = Object.entries(itemReturnStates).filter(
      ([itemId, state]) => state.checked && state.quantity === 0,
    );

    if (invalidItems.length > 0) {
      Alert.alert(
        "Validation Error",
        "Please enter a quantity for all checked items.",
      );
      return;
    }

    // Validate quantities don't exceed borrowed amounts
    const exceedingItems = selectedTransaction.items.filter((item) => {
      const state = itemReturnStates[item.id];
      return state && state.quantity > item.quantity;
    });

    if (exceedingItems.length > 0) {
      Alert.alert(
        "Validation Error",
        "Returned quantity cannot exceed borrowed quantity.",
      );
      return;
    }

    await completeTransaction(selectedTransaction.id, itemReturnStates);
    setShowCompleteModal(false);
    setSelectedTransaction(null);
  };

  const handleApprove = async (transactionId: string) => {
    if (!onApprove) return;

    Alert.alert(
      "Approve Transaction",
      "Are you sure you want to approve this borrow request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            await onApprove(transactionId);
          },
        },
      ],
    );
  };

  const handleDeny = async (transactionId: string) => {
    if (!onDeny) return;

    Alert.alert(
      "Deny Transaction",
      "Are you sure you want to deny this request? This will release the reserved equipment.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deny",
          style: "destructive",
          onPress: async () => {
            await onDeny(transactionId);
          },
        },
      ],
    );
  };

  const handleDelete = async (transactionId: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await onDelete(transactionId);
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Request":
        return "#f59e0b"; // amber
      case "Ongoing":
        return "#3b82f6"; // blue
      case "Overdue":
      case "Incomplete and Overdue":
      case "Complete and Overdue":
        return "#ef4444"; // red
      case "Incomplete":
        return "#f97316"; // orange
      case "Complete":
        return "#10b981"; // green
      default:
        return "#6b7280"; // gray
    }
  };

  const getReturnStatusText = (itemId: string) => {
    const state = itemReturnStates[itemId];
    const item = selectedTransaction?.items.find((i) => i.id === itemId);
    if (!state || !item) return "";

    if (state.quantity === 0) return "";
    if (state.quantity === item.quantity) {
      return "(Complete Return)";
    }
    return "(Partial Return)";
  };

  if (loading) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.emptyText}>No transactions found</Text>
      </Box>
    );
  }

  return (
    <>
      <Accordion
        size="sm"
        variant="unfilled"
        type="single"
        isCollapsible={true}
        isDisabled={false}
        style={{ backgroundColor: "transparent" }}
      >
        {transactions.map((transaction) => (
          <AccordionItem key={transaction.id} value={transaction.id}>
            <AccordionHeader>
              <AccordionTrigger style={styles.accordionTrigger}>
                {({ isExpanded }: any) => {
                  return (
                    <>
                      <AccordionTitleText>
                        <HStack style={styles.accordionHeaderContent}>
                          <VStack style={styles.headerLeft}>
                            <HStack style={{ alignItems: "center", gap: 8 }}>
                              <Text style={styles.studentName}>
                                {transaction.studentName}
                              </Text>
                              <Box
                                style={{
                                  ...styles.statusBadge,
                                  backgroundColor: getStatusColor(
                                    transaction.status,
                                  ),
                                }}
                              >
                                <Text style={styles.statusText}>
                                  {transaction.status}
                                </Text>
                              </Box>
                            </HStack>
                            <Text style={styles.studentEmail}>
                              {transaction.studentEmail}
                            </Text>
                            <Text style={styles.transactionId}>
                              {transaction.transactionId}
                            </Text>
                          </VStack>
                          <VStack style={{ alignItems: "flex-end" }}>
                            <Text style={styles.dueDate}>
                              Due: {formatDate(transaction.dueDate)}
                            </Text>
                            {transaction.status === "Request" && (
                              <Text style={styles.requestedDate}>
                                Requested:{" "}
                                {formatDateTime(transaction.borrowedDate)}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                      </AccordionTitleText>
                      {isExpanded ? (
                        <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                      ) : (
                        <AccordionIcon as={ChevronDownIcon} className="ml-3" />
                      )}
                    </>
                  );
                }}
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent style={styles.accordionContent}>
              <VStack style={styles.contentVStack}>
                {/* Items List */}
                {transaction.items.map((item) => (
                  <HStack key={item.id} style={styles.itemRow}>
                    <VStack style={styles.itemLeft}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <Text style={styles.itemDetails}>
                        Qty: {item.quantity} | ₱{item.pricePerQuantity} each
                      </Text>
                      {item.returnedQuantity > 0 && (
                        <Text style={styles.returnedInfo}>
                          Returned: {item.returnedQuantity}/{item.quantity}
                        </Text>
                      )}
                    </VStack>
                    <Text style={styles.itemPrice}>
                      ₱{(item.pricePerQuantity * item.quantity).toFixed(2)}
                    </Text>
                  </HStack>
                ))}

                {/* Total */}
                <HStack style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalPrice}>
                    ₱{transaction.totalPrice.toFixed(2)}
                  </Text>
                </HStack>

                {/* Action Buttons */}
                {transaction.status === "Request" ? (
                  <HStack style={styles.actionButtons}>
                    <Button
                      style={styles.denyButton}
                      onPress={() => denyTransaction(transaction.id)}
                    >
                      <ButtonText>Deny</ButtonText>
                    </Button>
                    <Button
                      style={styles.approveButton}
                      onPress={() => approveTransaction(transaction.id)}
                    >
                      <ButtonText>Approve</ButtonText>
                    </Button>
                  </HStack>
                ) : (
                  <HStack style={styles.actionButtons}>
                    <Button
                      style={styles.deleteButton}
                      onPress={() => deleteTransaction(transaction.id)}
                    >
                      <ButtonText>Delete</ButtonText>
                    </Button>
                    {onComplete && (
                      <Button
                        style={styles.completeButton}
                        onPress={() => openCompleteModal(transaction)}
                      >
                        <ButtonText>Complete</ButtonText>
                      </Button>
                    )}
                  </HStack>
                )}
              </VStack>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Complete Transaction Modal - Now using Gluestack UI */}
      {onComplete && (
        <Modal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          size="lg"
        >
          <ModalBackdrop />
          <ModalContent style={styles.modalContent}>
            <ModalHeader>
              <Heading size="lg" style={styles.modalTitle}>
                Complete Transaction
              </Heading>
              <ModalCloseButton>
                <Icon as={CloseIcon} />
              </ModalCloseButton>
            </ModalHeader>
            <ModalBody>
              <Text style={styles.modalSubtitle}>
                Mark returned items for {selectedTransaction?.studentName}
              </Text>

              <ScrollView style={styles.modalItemsList}>
                {selectedTransaction?.items.map((item) => (
                  <VStack key={item.id} style={styles.modalItem}>
                    <Checkbox
                      value={
                        itemReturnStates[item.id]?.checked ? "checked" : ""
                      }
                      isChecked={itemReturnStates[item.id]?.checked || false}
                      onChange={(checked) => handleItemCheck(item.id, checked)}
                      style={styles.checkbox}
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={Check} />
                      </CheckboxIndicator>
                      <CheckboxLabel style={styles.checkboxLabel}>
                        {item.itemName}
                      </CheckboxLabel>
                    </Checkbox>

                    <HStack style={styles.quantityInput}>
                      <Text style={styles.quantityLabel}>Returned:</Text>
                      <Input style={styles.quantityInputField}>
                        <InputField
                          value={String(
                            itemReturnStates[item.id]?.quantity || 0,
                          )}
                          onChangeText={(text) =>
                            handleQuantityChange(item.id, text)
                          }
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </Input>
                      <Text style={styles.quantityTotal}>
                        / {item.quantity}
                      </Text>
                      <Text style={styles.returnStatus}>
                        {getReturnStatusText(item.id)}
                      </Text>
                    </HStack>

                    {item.returnedQuantity > 0 && (
                      <Text style={styles.previouslyReturned}>
                        Previously returned: {item.returnedQuantity}
                      </Text>
                    )}
                  </VStack>
                ))}
              </ScrollView>
            </ModalBody>
            <ModalFooter>
              <HStack style={styles.modalActions}>
                <Button
                  style={styles.modalCancelButton}
                  onPress={() => setShowCompleteModal(false)}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  style={styles.modalSubmitButton}
                  onPress={handleCompleteTransaction}
                >
                  <ButtonText>Submit</ButtonText>
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 16,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
  },
  accordion: {
    gap: 12,
  },
  accordionTrigger: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  accordionHeaderContent: {
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  headerLeft: {
    flex: 1,
    gap: 0,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
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
  statusBadge: {
    padding: 2,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  dueDate: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  requestedDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  accordionContent: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
  },
  contentVStack: {
    gap: 12,
  },
  itemRow: {
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  itemLeft: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  itemDetails: {
    fontSize: 12,
    color: "#6b7280",
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
  totalRow: {
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#1f2937",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3b82f6",
  },
  actionButtons: {
    gap: 12,
    marginTop: 12,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#10b981",
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#10b981",
  },
  denyButton: {
    flex: 1,
    backgroundColor: "#ef4444",
  },
  modalContent: {
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  modalItemsList: {
    maxHeight: 400,
  },
  modalItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  checkbox: {
    marginBottom: 8,
    marginLeft: 5,
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 8,
  },
  quantityInput: {
    alignItems: "center",
    gap: 8,
    marginLeft: 32,
    flexWrap: "wrap",
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  quantityInputField: {
    width: 80,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
  },
  quantityTotal: {
    fontSize: 14,
    color: "#6b7280",
  },
  returnStatus: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
    fontStyle: "italic",
  },
  previouslyReturned: {
    fontSize: 12,
    color: "#10b981",
    marginLeft: 32,
    fontStyle: "italic",
  },
  modalActions: {
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#6b7280",
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: "#10b981",
  },
});
