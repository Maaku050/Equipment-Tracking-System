// components/TransactionAccordion.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Alert,
  ActivityIndicator,
  View,
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
import {
  Check,
  ChevronDownIcon,
  ChevronUpIcon,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react-native";

interface Transaction {
  id: string;
  transactionId: string;
  studentName: string;
  studentEmail: string;
  dueDate: Date;
  borrowedDate: Date;
  items: BorrowedItem[];
  status?: string; // For active transactions
  finalStatus?: string; // For completed records
  totalPrice: number;
  fineAmount?: number; // For records
  completedDate?: Date; // For records
  returnedDate?: Date; // For records
  notes?: string; // For records
}

interface TransactionAccordionProps {
  transactions: Transaction[];
  onComplete?: (
    transactionId: string,
    itemReturnStates: { [key: string]: { checked: boolean; quantity: number } },
  ) => Promise<void>;
  onDelete?: (transactionId: string) => Promise<void>;
  onApprove?: (transactionId: string) => Promise<void>;
  onDeny?: (transactionId: string) => Promise<void>;
  loading?: boolean;
  isUserView?: boolean; // New prop to distinguish user view from admin view
}

type ConfirmActionType = "delete" | "approve" | "deny" | "complete";

export default function TransactionAccordion({
  transactions,
  onComplete,
  onDelete,
  onApprove,
  onDeny,
  loading = false,
  isUserView = false, // Default to admin view
}: TransactionAccordionProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnAll, setReturnAll] = useState(false);
  const [itemReturnStates, setItemReturnStates] = useState<{
    [key: string]: { checked: boolean; quantity: number };
  }>({});

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(
    null,
  );
  const [confirmTransaction, setConfirmTransaction] =
    useState<Transaction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirmModal = (
    action: ConfirmActionType,
    transaction: Transaction,
  ) => {
    setConfirmAction(action);
    setConfirmTransaction(transaction);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || !confirmTransaction) return;

    try {
      setConfirmLoading(true);

      switch (confirmAction) {
        case "delete":
          await deleteTransaction(confirmTransaction.id);
          break;

        case "approve":
          await approveTransaction(confirmTransaction.id);
          break;

        case "deny":
          await denyTransaction(confirmTransaction.id);
          break;

        case "complete":
          openCompleteModal(confirmTransaction);
          break;
      }

      setShowConfirmModal(false);
    } catch (error) {
      Alert.alert("Error", "Action failed. Please try again.");
    } finally {
      setConfirmLoading(false);
      setConfirmAction(null);
      setConfirmTransaction(null);
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

  const openCompleteModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    const initialStates: {
      [key: string]: { checked: boolean; quantity: number };
    } = {};

    // Check if all items are already returned to set initial returnAll state
    let allReturned = true;
    transaction.items.forEach((item) => {
      const isFullyReturned = item.returnedQuantity === item.quantity;
      initialStates[item.id] = {
        checked: item.returned || isFullyReturned,
        quantity: item.returnedQuantity || 0,
      };
      if (!isFullyReturned) {
        allReturned = false;
      }
    });

    setReturnAll(allReturned);
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
        checked: numQuantity > 0,
        quantity: numQuantity,
      },
    }));
  };

  const handleReturnAllToggle = (checked: boolean) => {
    if (!selectedTransaction) return;

    setReturnAll(checked);

    if (checked) {
      // Mark all items as returned with full quantity
      const newStates: {
        [key: string]: { checked: boolean; quantity: number };
      } = {};
      selectedTransaction.items.forEach((item) => {
        newStates[item.id] = {
          checked: true,
          quantity: item.quantity,
        };
      });
      setItemReturnStates(newStates);
    } else {
      // Reset to previous state (keeping previously returned items)
      const resetStates: {
        [key: string]: { checked: boolean; quantity: number };
      } = {};
      selectedTransaction.items.forEach((item) => {
        resetStates[item.id] = {
          checked: item.returned || item.returnedQuantity > 0,
          quantity: item.returnedQuantity || 0,
        };
      });
      setItemReturnStates(resetStates);
    }
  };

  const handleCompleteTransaction = async () => {
    if (!selectedTransaction || !onComplete) return;

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

    try {
      setIsSubmitting(true);
      await completeTransaction(selectedTransaction.id, itemReturnStates);
      setShowCompleteModal(false);
      setSelectedTransaction(null);
    } catch (error) {
      Alert.alert("Error", "Failed to complete transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Request":
        return "#f59e0b";
      case "Ongoing":
        return "#3b82f6";
      case "Ondue":
        return "#f59e0b"; // Amber/Orange to indicate urgency but not yet overdue
      case "Overdue":
        return "#ef4444";
      case "Incomplete":
        return "#f97316";
      case "Incomplete and Ondue":
        return "#ea580c"; // Slightly darker orange for incomplete + ondue
      case "Incomplete and Overdue":
        return "#dc2626";
      case "Complete":
      case "Complete and Overdue":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Request":
        return Clock;
      case "Ongoing":
        return AlertCircle;
      case "Ondue":
        return Calendar; // Calendar icon for "due today"
      case "Overdue":
        return AlertCircle;
      case "Incomplete":
        return AlertCircle;
      case "Incomplete and Ondue":
        return Calendar;
      case "Incomplete and Overdue":
        return AlertCircle;
      case "Complete":
        return CheckCircle;
      default:
        return AlertCircle;
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
      <Box style={styles.emptyContainer}>
        <Box style={styles.emptyIconContainer}>
          <AlertCircle size={48} color="#d1d5db" />
        </Box>
        <Text style={styles.emptyTitle}>No Transactions Found</Text>
        <Text style={styles.emptySubtitle}>
          {isUserView
            ? "You haven't borrowed any equipment yet. Start by creating a new transaction!"
            : "No transactions to display at the moment."}
        </Text>
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
        {transactions.map((transaction) => {
          // Determine if this is a record or active transaction
          const isRecord = !!transaction.finalStatus;
          const displayStatus = isRecord
            ? transaction.finalStatus
            : transaction.status;
          const StatusIcon = getStatusIcon(displayStatus || "");

          return (
            <AccordionItem key={transaction.id} value={transaction.id}>
              <AccordionHeader>
                <AccordionTrigger style={styles.accordionTrigger}>
                  {({ isExpanded }: any) => {
                    return (
                      <>
                        <AccordionTitleText>
                          <HStack style={styles.accordionHeaderContent}>
                            <VStack style={styles.headerLeft}>
                              <HStack
                                style={{
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                {!isUserView && (
                                  <Text style={styles.studentName}>
                                    {transaction.studentName}
                                  </Text>
                                )}
                                <Box
                                  style={{
                                    ...styles.statusBadge,
                                    backgroundColor:
                                      transaction.fineAmount &&
                                      transaction.fineAmount > 0
                                        ? "#ef4444" // Red if there's a fine
                                        : getStatusColor(displayStatus || ""), // Otherwise use the normal status color
                                  }}
                                >
                                  <HStack
                                    style={{ alignItems: "center", gap: 4 }}
                                  >
                                    <StatusIcon size={12} color="#ffffff" />
                                    <Text style={styles.statusText}>
                                      {displayStatus}
                                    </Text>
                                  </HStack>
                                </Box>
                              </HStack>
                              {!isUserView && (
                                <Text style={styles.studentEmail}>
                                  {transaction.studentEmail}
                                </Text>
                              )}
                              <Text style={styles.transactionId}>
                                ID: {transaction.transactionId}
                              </Text>
                              <Text style={styles.borrowedDate}>
                                Borrowed:{" "}
                                {formatDateTime(transaction.borrowedDate)}
                              </Text>
                              {isRecord && transaction.completedDate && (
                                <Text style={styles.completedDate}>
                                  Completed:{" "}
                                  {formatDateTime(transaction.completedDate)}
                                </Text>
                              )}
                            </VStack>
                            <VStack style={{ alignItems: "flex-end" }}>
                              <Text style={styles.dueDate}>
                                Due: {formatDate(transaction.dueDate)}
                              </Text>
                              {!isRecord && displayStatus === "Request" && (
                                <Text style={styles.requestedDate}>
                                  Requested:{" "}
                                  {formatDateTime(transaction.borrowedDate)}
                                </Text>
                              )}
                              <Text style={styles.itemCount}>
                                {transaction.items.length}{" "}
                                {transaction.items.length === 1
                                  ? "item"
                                  : "items"}
                              </Text>
                            </VStack>
                          </HStack>
                        </AccordionTitleText>
                        {isExpanded ? (
                          <AccordionIcon as={ChevronUpIcon} className="ml-3" />
                        ) : (
                          <AccordionIcon
                            as={ChevronDownIcon}
                            className="ml-3"
                          />
                        )}
                      </>
                    );
                  }}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent style={styles.accordionContent}>
                <VStack style={styles.contentVStack}>
                  {/* Items List */}
                  <Text style={styles.sectionTitle}>Equipment Items</Text>
                  {transaction.items.map((item, index) => (
                    <HStack key={item.id} style={styles.itemRow}>
                      <VStack style={styles.itemLeft}>
                        <HStack style={{ alignItems: "center", gap: 8 }}>
                          <Text style={styles.itemNumber}>{index + 1}.</Text>
                          <Text style={styles.itemName}>{item.itemName}</Text>
                        </HStack>
                        <Text style={styles.itemDetails}>
                          Quantity: {item.quantity} × ₱{item.pricePerQuantity} =
                          ₱{(item.pricePerQuantity * item.quantity).toFixed(2)}
                        </Text>
                        {item.returnedQuantity > 0 && (
                          <HStack
                            style={{
                              alignItems: "center",
                              gap: 4,
                              marginTop: 4,
                            }}
                          >
                            <CheckCircle size={14} color="#10b981" />
                            <Text style={styles.returnedInfo}>
                              Returned: {item.returnedQuantity}/{item.quantity}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </HStack>
                  ))}

                  {/* Total */}
                  <HStack style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalPrice}>
                      ₱{transaction.totalPrice.toFixed(2)}
                    </Text>
                  </HStack>

                  {/* Fine Amount (for records) */}
                  {isRecord &&
                    transaction.fineAmount &&
                    transaction.fineAmount > 0 && (
                      <HStack style={styles.fineRow}>
                        <Text style={styles.fineLabel}>Fine Amount:</Text>
                        <Text style={styles.finePrice}>
                          ₱{transaction.fineAmount.toFixed(2)}
                        </Text>
                      </HStack>
                    )}

                  {/* Notes (for records) */}
                  {isRecord && transaction.notes && (
                    <Box style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{transaction.notes}</Text>
                    </Box>
                  )}

                  {/* User View - Information Only */}
                  {isUserView && (
                    <Box style={styles.infoBox}>
                      {displayStatus === "Request" && (
                        <Text style={styles.infoText}>
                          ⏳ Your request is pending approval from the staff.
                          You'll be notified once it's processed.
                        </Text>
                      )}
                      {displayStatus === "Ongoing" && (
                        <Text style={styles.infoText}>
                          📦 Please return the equipment by{" "}
                          {formatDate(transaction.dueDate)} to avoid penalties.
                        </Text>
                      )}
                      {displayStatus === "Ondue" && (
                        <Text style={[styles.infoText, { color: "#d97706" }]}>
                          📅 Equipment is DUE TODAY! Please return it before
                          midnight to avoid penalties.
                        </Text>
                      )}
                      {displayStatus === "Overdue" && (
                        <Text style={[styles.infoText, { color: "#ef4444" }]}>
                          ⚠️ This transaction is overdue. Please return the
                          equipment as soon as possible.
                        </Text>
                      )}
                      {displayStatus === "Incomplete" && (
                        <Text style={[styles.infoText, { color: "#f97316" }]}>
                          ⚠️ Some items are still pending return. Please return
                          all equipment.
                        </Text>
                      )}
                      {displayStatus === "Incomplete and Ondue" && (
                        <Text style={[styles.infoText, { color: "#ea580c" }]}>
                          ⚠️ Some items are still pending return and are DUE
                          TODAY! Please return them before midnight.
                        </Text>
                      )}
                      {displayStatus === "Incomplete and Overdue" && (
                        <Text style={[styles.infoText, { color: "#dc2626" }]}>
                          ⚠️ This transaction is overdue and incomplete. Please
                          return the remaining equipment immediately.
                        </Text>
                      )}
                      {displayStatus === "Complete" && (
                        <Text style={[styles.infoText, { color: "#10b981" }]}>
                          ✅ Transaction completed successfully. Thank you for
                          returning on time!
                        </Text>
                      )}
                      {displayStatus === "Complete and Overdue" && (
                        <Text style={[styles.infoText, { color: "#f59e0b" }]}>
                          ✅ Transaction completed. Note: Items were returned
                          late.
                        </Text>
                      )}
                    </Box>
                  )}

                  {/* Admin Action Buttons - Only shown in admin view for active transactions */}
                  {!isUserView && !isRecord && (
                    <>
                      {displayStatus === "Request" ? (
                        <HStack style={styles.actionButtons}>
                          <Button
                            style={styles.denyButton}
                            onPress={() =>
                              openConfirmModal("deny", transaction)
                            }
                          >
                            <ButtonText>Deny</ButtonText>
                          </Button>
                          <Button
                            style={styles.approveButton}
                            onPress={() =>
                              openConfirmModal("approve", transaction)
                            }
                          >
                            <ButtonText>Approve</ButtonText>
                          </Button>
                        </HStack>
                      ) : (
                        <HStack style={styles.actionButtons}>
                          {onDelete && (
                            <Button
                              style={styles.deleteButton}
                              onPress={() =>
                                openConfirmModal("delete", transaction)
                              }
                            >
                              <ButtonText>Delete</ButtonText>
                            </Button>
                          )}
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
                    </>
                  )}
                </VStack>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Complete Transaction Modal - Admin Only */}
      {!isUserView && onComplete && (
        <Modal
          isOpen={showCompleteModal}
          onClose={() => !isSubmitting && setShowCompleteModal(false)}
          size="lg"
        >
          <ModalBackdrop />
          <ModalContent style={styles.modalContent}>
            <ModalHeader>
              <Heading size="lg" style={styles.modalTitle}>
                Complete Transaction
              </Heading>
              <ModalCloseButton disabled={isSubmitting}>
                <Icon as={CloseIcon} />
              </ModalCloseButton>
            </ModalHeader>
            <ModalBody showsVerticalScrollIndicator={false}>
              <VStack style={styles.modalBodyContainer}>
                <Text style={styles.modalSubtitle}>
                  Mark returned items for {selectedTransaction?.studentName}
                </Text>

                {/* Return All Checkbox - Prominent at the top */}
                <Box style={styles.returnAllContainer}>
                  <Checkbox
                    value={returnAll ? "checked" : ""}
                    isChecked={returnAll}
                    onChange={handleReturnAllToggle}
                    isDisabled={isSubmitting}
                    size="lg"
                  >
                    <CheckboxIndicator>
                      <CheckboxIcon as={Check} />
                    </CheckboxIndicator>
                    <CheckboxLabel style={styles.returnAllLabel}>
                      Return All Items
                    </CheckboxLabel>
                  </Checkbox>
                  <Text style={styles.returnAllDescription}>
                    Quickly mark all items as fully returned
                  </Text>
                </Box>

                {/* Divider */}
                <Box style={styles.divider} />

                {/* Items List */}
                <Text style={styles.itemsListTitle}>Individual Items</Text>
                <View>
                  {selectedTransaction?.items.map((item, index) => {
                    const state = itemReturnStates[item.id];
                    const remaining =
                      item.quantity - (item.returnedQuantity || 0);

                    return (
                      <Box key={item.id} style={styles.modalItem}>
                        {/* Item Header */}
                        <HStack style={styles.itemHeader}>
                          <Text style={styles.itemIndexNumber}>
                            {index + 1}
                          </Text>
                          <VStack style={styles.itemHeaderContent}>
                            <Text style={styles.modalItemName}>
                              {item.itemName}
                            </Text>
                            <Text style={styles.itemQuantityInfo}>
                              Total: {item.quantity} | Already returned:{" "}
                              {item.returnedQuantity || 0} | Remaining:{" "}
                              {remaining}
                            </Text>
                          </VStack>
                        </HStack>

                        {/* Return Input Section */}
                        <Box style={styles.returnInputSection}>
                          <Checkbox
                            value={state?.checked ? "checked" : ""}
                            isChecked={state?.checked || false}
                            onChange={(checked) =>
                              handleItemCheck(item.id, checked)
                            }
                            style={styles.checkbox}
                            isDisabled={isSubmitting}
                          >
                            <CheckboxIndicator>
                              <CheckboxIcon as={Check} />
                            </CheckboxIndicator>
                            <CheckboxLabel style={styles.checkboxLabel}>
                              Mark as returned
                            </CheckboxLabel>
                          </Checkbox>

                          {state?.checked && (
                            <HStack style={styles.quantityInputRow}>
                              <Text style={styles.quantityLabel}>
                                Quantity returned:
                              </Text>
                              <Input style={styles.quantityInputField}>
                                <InputField
                                  value={String(state?.quantity || 0)}
                                  onChangeText={(text) =>
                                    handleQuantityChange(item.id, text)
                                  }
                                  keyboardType="numeric"
                                  placeholder="0"
                                  editable={!isSubmitting}
                                />
                              </Input>
                              <Text style={styles.quantityTotal}>
                                / {item.quantity}
                              </Text>
                            </HStack>
                          )}

                          {state?.checked && state?.quantity > 0 && (
                            <HStack style={styles.statusIndicator}>
                              {state.quantity === item.quantity ? (
                                <>
                                  <CheckCircle size={16} color="#10b981" />
                                  <Text style={styles.completeReturnText}>
                                    Complete Return
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={16} color="#f59e0b" />
                                  <Text style={styles.partialReturnText}>
                                    Partial Return ({state.quantity}/
                                    {item.quantity})
                                  </Text>
                                </>
                              )}
                            </HStack>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </View>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <HStack style={styles.modalActions}>
                <Button
                  style={styles.modalCancelButton}
                  onPress={() => setShowCompleteModal(false)}
                  isDisabled={isSubmitting}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>
                <Button
                  style={styles.modalSubmitButton}
                  onPress={handleCompleteTransaction}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <HStack style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <ButtonText style={styles.loadingText}>
                        Submitting...
                      </ButtonText>
                    </HStack>
                  ) : (
                    <ButtonText>Submit</ButtonText>
                  )}
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      <Modal
        isOpen={showConfirmModal}
        onClose={() => !confirmLoading && setShowConfirmModal(false)}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Confirm Action</Heading>
            <ModalCloseButton disabled={confirmLoading}>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            <Text style={{ fontSize: 14, color: "#374151" }}>
              Are you sure you want to{" "}
              <Text style={{ fontWeight: "700" }}>{confirmAction}</Text> this
              transaction?
            </Text>

            <Text style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Transaction ID: {confirmTransaction?.transactionId}
            </Text>
          </ModalBody>

          <ModalFooter>
            <HStack style={{ gap: 12 }}>
              <Button
                style={{ flex: 1, backgroundColor: "#6b7280" }}
                onPress={() => setShowConfirmModal(false)}
                isDisabled={confirmLoading}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>

              <Button
                style={{
                  flex: 1,
                  backgroundColor:
                    confirmAction === "delete" || confirmAction === "deny"
                      ? "#ef4444"
                      : "#10b981",
                }}
                onPress={handleConfirmAction}
                isDisabled={confirmLoading}
              >
                {confirmLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ButtonText>Confirm</ButtonText>
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
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
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  accordion: {
    gap: 12,
  },
  accordionTrigger: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginBottom: 8,
  },
  accordionHeaderContent: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    flex: 1,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  studentEmail: {
    fontSize: 13,
    color: "#6b7280",
  },
  transactionId: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "monospace",
  },
  borrowedDate: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  completedDate: {
    fontSize: 12,
    color: "#10b981",
    marginTop: 2,
    fontWeight: "500",
  },
  statusBadge: {
    borderRadius: 12,
    paddingLeft: 5,
    paddingRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  dueDate: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  requestedDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  itemCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  accordionContent: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: -8,
    marginBottom: 8,
  },
  contentVStack: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: -4,
  },
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  itemLeft: {
    flex: 1,
    gap: 6,
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
  totalRow: {
    justifyContent: "space-between",
    paddingTop: 16,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  fineRow: {
    justifyContent: "space-between",
    paddingTop: 8,
  },
  fineLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  finePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ef4444",
  },
  notesBox: {
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#78350f",
    fontStyle: "italic",
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  infoText: {
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
    marginTop: 4,
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
  modalBodyContainer: {
    gap: 0,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  returnAllContainer: {
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginBottom: 16,
  },
  returnAllLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e40af",
    marginLeft: 12,
  },
  returnAllDescription: {
    fontSize: 12,
    color: "#3b82f6",
    marginLeft: 40,
    marginTop: 4,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  itemsListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  itemHeader: {
    alignItems: "flex-start",
    gap: 12,
  },
  itemIndexNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#9ca3af",
    width: 24,
  },
  itemHeaderContent: {
    flex: 1,
    gap: 4,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  itemQuantityInfo: {
    fontSize: 12,
    color: "#6b7280",
  },
  returnInputSection: {
    marginLeft: 36,
    gap: 12,
  },
  checkbox: {
    marginBottom: 0,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  quantityInputRow: {
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
    flexWrap: "wrap",
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
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
    fontWeight: "600",
  },
  statusIndicator: {
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  completeReturnText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
  },
  partialReturnText: {
    fontSize: 13,
    color: "#f59e0b",
    fontWeight: "600",
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
