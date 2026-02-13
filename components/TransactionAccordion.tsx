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
import { Textarea, TextareaInput } from "@/components/ui/textarea";
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
  AlertTriangle,
} from "lucide-react-native";

interface Transaction {
  id: string;
  transactionId: string;
  studentName: string;
  studentEmail: string;
  dueDate: Date;
  borrowedDate: Date;
  items: BorrowedItem[];
  status?: string;
  finalStatus?: string;
  totalPrice: number;
  fineAmount?: number;
  completedDate?: Date;
  returnedDate?: Date;
  notes?: string;
}

interface TransactionAccordionProps {
  transactions: Transaction[];
  onComplete?: (
    transactionId: string,
    itemReturnStates: {
      [key: string]: {
        checked: boolean;
        quantity: number;
        damagedQuantity: number;
        lostQuantity: number;
        damageNotes: string;
      };
    },
  ) => Promise<void>;
  onDelete?: (transactionId: string) => Promise<void>;
  onApprove?: (transactionId: string) => Promise<void>;
  onDeny?: (transactionId: string) => Promise<void>;
  loading?: boolean;
  isUserView?: boolean;
}

type ConfirmActionType = "delete" | "approve" | "deny" | "complete";

export default function TransactionAccordion({
  transactions,
  onComplete,
  onDelete,
  onApprove,
  onDeny,
  loading = false,
  isUserView = false,
}: TransactionAccordionProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnAll, setReturnAll] = useState(false);
  const [itemReturnStates, setItemReturnStates] = useState<{
    [key: string]: {
      checked: boolean;
      quantity: number;
      damagedQuantity: number;
      lostQuantity: number;
      damageNotes: string;
    };
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
    // Filter out fully returned items
    const incompleteItems = transaction.items.filter((item) => {
      const returned = item.returnedQuantity || 0;
      return returned < item.quantity; // Only show items that aren't fully returned
    });

    // If all items are returned, this shouldn't happen, but handle it gracefully
    if (incompleteItems.length === 0) {
      Alert.alert(
        "All Items Returned",
        "All items in this transaction have already been returned.",
      );
      return;
    }

    // Create a filtered transaction object with only incomplete items
    const filteredTransaction = {
      ...transaction,
      items: incompleteItems,
    };

    setSelectedTransaction(filteredTransaction);

    const initialStates: {
      [key: string]: {
        checked: boolean;
        quantity: number;
        damagedQuantity: number;
        lostQuantity: number;
        damageNotes: string;
      };
    } = {};

    incompleteItems.forEach((item) => {
      const remaining = item.quantity - (item.returnedQuantity || 0);
      initialStates[item.id] = {
        checked: false,
        quantity: 0, // Start at 0 - admin enters the quantity being returned THIS time
        damagedQuantity: 0, // Start at 0 - this is for NEW damage in this submission
        lostQuantity: 0, // Start at 0 - this is for NEW lost items in this submission
        damageNotes: item.damageNotes || "", // Keep existing notes
      };
    });

    setReturnAll(false);
    setItemReturnStates(initialStates);
    setShowCompleteModal(true);
  };

  const handleItemCheck = (itemId: string, checked: boolean) => {
    if (!selectedTransaction) return;

    const item = selectedTransaction.items.find((i) => i.id === itemId);
    if (!item) return;

    const remaining = item.quantity - (item.returnedQuantity || 0);

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        checked,
        quantity: checked ? remaining : 0, // Set to full remaining quantity when checked
        damagedQuantity: 0, // Reset damage/lost when marking as returned
        lostQuantity: 0,
        damageNotes: "",
      },
    }));
  };

  const handleQuantityChange = (itemId: string, quantity: string) => {
    if (!selectedTransaction) return;

    const numQuantity = parseInt(quantity) || 0;

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked: false, // Uncheck when manually changing quantity (indicates partial/custom return)
        quantity: numQuantity,
      },
    }));
  };

  const handleDamagedQuantityChange = (itemId: string, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked: false, // Uncheck when adding damage (not a perfect return)
        damagedQuantity: numQuantity,
      },
    }));
  };

  const handleLostQuantityChange = (itemId: string, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;

    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked: false, // Uncheck when adding lost items (not a perfect return)
        lostQuantity: numQuantity,
      },
    }));
  };

  const handleDamageNotesChange = (itemId: string, notes: string) => {
    setItemReturnStates((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        damageNotes: notes,
      },
    }));
  };

  const handleReturnAllToggle = (checked: boolean) => {
    if (!selectedTransaction) return;

    setReturnAll(checked);

    if (checked) {
      const newStates: {
        [key: string]: {
          checked: boolean;
          quantity: number;
          damagedQuantity: number;
          lostQuantity: number;
          damageNotes: string;
        };
      } = {};
      selectedTransaction.items.forEach((item) => {
        const remaining = item.quantity - (item.returnedQuantity || 0);
        newStates[item.id] = {
          checked: true,
          quantity: remaining, // Full return of remaining items
          damagedQuantity: 0,
          lostQuantity: 0,
          damageNotes: "",
        };
      });
      setItemReturnStates(newStates);
    } else {
      const resetStates: {
        [key: string]: {
          checked: boolean;
          quantity: number;
          damagedQuantity: number;
          lostQuantity: number;
          damageNotes: string;
        };
      } = {};
      selectedTransaction.items.forEach((item) => {
        resetStates[item.id] = {
          checked: false, // Reset to unchecked
          quantity: 0, // Reset to 0
          damagedQuantity: item.damagedQuantity || 0,
          lostQuantity: item.lostQuantity || 0,
          damageNotes: item.damageNotes || "",
        };
      });
      setItemReturnStates(resetStates);
    }
  };

  const handleCompleteTransaction = async () => {
    if (!selectedTransaction || !onComplete) return;

    // Validate that total quantities don't exceed remaining borrowed quantity
    const exceedingItems = selectedTransaction.items.filter((item) => {
      const state = itemReturnStates[item.id];
      if (!state) return false;

      const total = state.quantity + state.damagedQuantity + state.lostQuantity;
      const remaining = item.quantity - (item.returnedQuantity || 0);
      return total > remaining;
    });

    if (exceedingItems.length > 0) {
      Alert.alert(
        "Validation Error",
        "Total of returned + damaged + lost quantities cannot exceed remaining borrowed quantity.",
      );
      return;
    }

    // Check if damage notes are required when there are damaged items
    const missingDamageNotes = Object.entries(itemReturnStates).filter(
      ([itemId, state]) =>
        (state.damagedQuantity > 0 || state.lostQuantity > 0) &&
        !state.damageNotes.trim(),
    );

    if (missingDamageNotes.length > 0) {
      Alert.alert(
        "Validation Error",
        "Please provide damage notes for all damaged or lost items.",
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
        return "#f59e0b"; // Amber - awaiting approval
      case "Ongoing":
        return "#3b82f6"; // Blue - active
      case "Ondue":
        return "#f59e0b"; // Amber - due today
      case "Overdue":
        return "#ef4444"; // Red - late
      case "Incomplete":
        return "#f97316"; // Orange - partial return
      case "Incomplete and Ondue":
        return "#ea580c"; // Dark orange
      case "Incomplete and Overdue":
        return "#dc2626"; // Dark red
      case "Complete":
        return "#10b981"; // Green
      case "Complete and Overdue":
        return "#f59e0b"; // Amber - completed but was late
      default:
        return "#6b7280"; // Gray
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Request":
        return Clock;
      case "Ongoing":
        return AlertCircle;
      case "Ondue":
        return Calendar;
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

  const calculateTotalFine = () => {
    if (!selectedTransaction) return 0;

    let damageLostFine = 0;

    Object.entries(itemReturnStates).forEach(([itemId, state]) => {
      const item = selectedTransaction.items.find((i) => i.id === itemId);
      if (item) {
        damageLostFine +=
          (state.damagedQuantity + state.lostQuantity) * item.pricePerQuantity;
      }
    });

    return damageLostFine;
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
                                        ? "#ef4444"
                                        : getStatusColor(displayStatus || ""),
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
                        {(item.damagedQuantity > 0 ||
                          item.lostQuantity > 0) && (
                          <VStack style={{ marginTop: 8, gap: 4 }}>
                            {item.damagedQuantity > 0 && (
                              <HStack style={{ alignItems: "center", gap: 4 }}>
                                <AlertTriangle size={14} color="#f59e0b" />
                                <Text style={styles.damagedInfo}>
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
                                <AlertTriangle size={14} color="#ef4444" />
                                <Text style={styles.lostInfo}>
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
                    </HStack>
                  ))}

                  <HStack style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalPrice}>
                      ₱{transaction.totalPrice.toFixed(2)}
                    </Text>
                  </HStack>

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

                  {isRecord && transaction.notes && (
                    <Box style={styles.notesBox}>
                      <Text style={styles.notesLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{transaction.notes}</Text>
                    </Box>
                  )}

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

      {/* Complete Transaction Modal */}
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
                      Return All Remaining Items (No Damage)
                    </CheckboxLabel>
                  </Checkbox>
                  <Text style={styles.returnAllDescription}>
                    Quickly mark all remaining items as returned in good
                    condition
                  </Text>
                </Box>

                <Box style={styles.divider} />

                <Text style={styles.itemsListTitle}>Individual Items</Text>
                <View>
                  {selectedTransaction?.items.map((item, index) => {
                    const state = itemReturnStates[item.id];
                    const remaining =
                      item.quantity - (item.returnedQuantity || 0);
                    const hasDamageOrLoss =
                      (state?.damagedQuantity || 0) > 0 ||
                      (state?.lostQuantity || 0) > 0;

                    return (
                      <Box key={item.id} style={styles.modalItem}>
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
                            <Text style={styles.itemPriceInfo}>
                              Price per unit: ₱
                              {item.pricePerQuantity.toFixed(2)}
                            </Text>
                          </VStack>
                        </HStack>

                        <Box style={styles.returnInputSection}>
                          {/* Mark as Returned Checkbox - Indicates perfect return */}
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
                              ✓ Fully returned (no damage/loss)
                            </CheckboxLabel>
                          </Checkbox>

                          {/* Show manual inputs when NOT checked (for partial/damaged returns) */}
                          {!state?.checked && (
                            <>
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
                                  / {remaining}
                                </Text>
                              </HStack>

                              {/* Damage/Lost Section */}
                              <Box style={styles.damageLostSection}>
                                <Text style={styles.damageLostTitle}>
                                  Damage/Lost Items (Optional)
                                </Text>

                                <HStack style={styles.damageInputRow}>
                                  <VStack style={{ flex: 1 }}>
                                    <Text style={styles.damageInputLabel}>
                                      Damaged:
                                    </Text>
                                    <Input style={styles.damageInputField}>
                                      <InputField
                                        value={String(
                                          state?.damagedQuantity || 0,
                                        )}
                                        onChangeText={(text) =>
                                          handleDamagedQuantityChange(
                                            item.id,
                                            text,
                                          )
                                        }
                                        keyboardType="numeric"
                                        placeholder="0"
                                        editable={!isSubmitting}
                                      />
                                    </Input>
                                    {state.damagedQuantity > 0 && (
                                      <Text style={styles.damageFineText}>
                                        Fine: ₱
                                        {(
                                          state.damagedQuantity *
                                          item.pricePerQuantity
                                        ).toFixed(2)}
                                      </Text>
                                    )}
                                  </VStack>

                                  <VStack style={{ flex: 1 }}>
                                    <Text style={styles.damageInputLabel}>
                                      Lost:
                                    </Text>
                                    <Input style={styles.damageInputField}>
                                      <InputField
                                        value={String(state?.lostQuantity || 0)}
                                        onChangeText={(text) =>
                                          handleLostQuantityChange(
                                            item.id,
                                            text,
                                          )
                                        }
                                        keyboardType="numeric"
                                        placeholder="0"
                                        editable={!isSubmitting}
                                      />
                                    </Input>
                                    {state.lostQuantity > 0 && (
                                      <Text style={styles.damageFineText}>
                                        Fine: ₱
                                        {(
                                          state.lostQuantity *
                                          item.pricePerQuantity
                                        ).toFixed(2)}
                                      </Text>
                                    )}
                                  </VStack>
                                </HStack>

                                {hasDamageOrLoss && (
                                  <VStack style={{ marginTop: 12 }}>
                                    <Text style={styles.damageNotesLabel}>
                                      Damage/Loss Notes: *
                                    </Text>
                                    <Textarea style={styles.damageNotesInput}>
                                      <TextareaInput
                                        value={state?.damageNotes || ""}
                                        onChangeText={(text) =>
                                          handleDamageNotesChange(item.id, text)
                                        }
                                        placeholder="Describe the damage or loss..."
                                        editable={!isSubmitting}
                                        multiline
                                        numberOfLines={3}
                                      />
                                    </Textarea>
                                  </VStack>
                                )}
                              </Box>

                              {/* Status Indicator for manual entries */}
                              {state?.quantity > 0 && (
                                <HStack style={styles.statusIndicator}>
                                  {state.quantity === remaining &&
                                  !hasDamageOrLoss ? (
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
                                        {state.quantity < remaining
                                          ? `Partial Return (${state.quantity}/${remaining})`
                                          : `Return (${state.quantity}/${remaining})`}
                                        {hasDamageOrLoss && " with damage/loss"}
                                      </Text>
                                    </>
                                  )}
                                </HStack>
                              )}
                            </>
                          )}

                          {/* Show status when checked */}
                          {state?.checked && (
                            <HStack style={styles.statusIndicator}>
                              <CheckCircle size={16} color="#10b981" />
                              <Text style={styles.completeReturnText}>
                                ✓ Complete Return ({remaining}/{remaining} - No
                                damage)
                              </Text>
                            </HStack>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </View>

                {/* Total Fine Summary */}
                {calculateTotalFine() > 0 && (
                  <Box style={styles.totalFineBox}>
                    <HStack
                      style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <VStack>
                        <Text style={styles.totalFineLabel}>
                          Total Damage/Lost Fine:
                        </Text>
                        <Text style={styles.totalFineSubtext}>
                          (This will be added to any late fees)
                        </Text>
                      </VStack>
                      <Text style={styles.totalFineAmount}>
                        ₱{calculateTotalFine().toFixed(2)}
                      </Text>
                    </HStack>
                  </Box>
                )}
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
  damagedInfo: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
  },
  lostInfo: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  damageNotes: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
    marginLeft: 18,
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
    maxHeight: "90%",
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
    marginBottom: 20,
    paddingBottom: 20,
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
  itemPriceInfo: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
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
  damageLostSection: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  damageLostTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991b1b",
    marginBottom: 12,
  },
  damageInputRow: {
    gap: 12,
  },
  damageInputLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  damageInputField: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  damageFineText: {
    fontSize: 11,
    color: "#dc2626",
    fontWeight: "600",
    marginTop: 4,
  },
  damageNotesLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  damageNotesInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    backgroundColor: "#ffffff",
    minHeight: 60,
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
  totalFineBox: {
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  totalFineLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991b1b",
  },
  totalFineSubtext: {
    fontSize: 11,
    color: "#dc2626",
    marginTop: 2,
  },
  totalFineAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#dc2626",
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
