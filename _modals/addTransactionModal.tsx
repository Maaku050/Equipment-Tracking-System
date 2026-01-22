// _modals/addTransactionModal.tsx
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { X, Plus, Minus, Trash2, MoveRight } from "lucide-react-native";
import { Box } from "@/components/ui/box";
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
import { Heading } from "@/components/ui/heading";
import { Button, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import DateTimePicker from "@/components/DateTimePicker";
import { createTransaction } from "@/_helpers/firebaseHelpers";

interface User {
  uid: string;
  name: string;
  email: string;
  course: string;
}

interface Equipment {
  id: string;
  name: string;
  description: string;
  availableQuantity: number;
  totalQuantity: number;
  pricePerUnit: number;
  condition: string;
  status: string;
}

interface CartItem {
  id: string;
  equipmentId: string;
  itemName: string;
  quantity: number;
  pricePerQuantity: number;
  availableQuantity: number;
}

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTransactionModal({
  visible,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Step 1: Student Selection
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Step 2: Equipment Browsing
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");

  // Step 3: Due Date
  const [dueDate, setDueDate] = useState<Date | null>(null);

  useEffect(() => {
    if (visible && step === 1) {
      loadStudents();
    }
  }, [visible, step]);

  useEffect(() => {
    if (visible && step === 2) {
      loadEquipment();
    }
  }, [visible, step]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("status", "==", "active"),
      );
      const querySnapshot = await getDocs(q);
      const studentsList = querySnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      })) as User[];
      setStudents(studentsList);
    } catch (error) {
      console.error("Error loading students:", error);
      Alert.alert("Error", "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "equipment"),
        where("status", "==", "available"),
      );
      const querySnapshot = await getDocs(q);
      const equipmentList: Equipment[] = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Equipment, "id">),
        }))
        .filter((eq) => eq.availableQuantity > 0);
      setEquipment(equipmentList);
    } catch (error) {
      console.error("Error loading equipment:", error);
      Alert.alert("Error", "Failed to load equipment");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (student: User) => {
    setSelectedStudent(student);
    setStep(2);
  };

  const addToCart = (eq: Equipment, quantity: number) => {
    const existingItem = cart.find((item) => item.equipmentId === eq.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > eq.availableQuantity) {
        Alert.alert("Error", `Only ${eq.availableQuantity} units available`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.equipmentId === eq.id
            ? { ...item, quantity: newQuantity }
            : item,
        ),
      );
    } else {
      if (quantity > eq.availableQuantity) {
        Alert.alert("Error", `Only ${eq.availableQuantity} units available`);
        return;
      }
      setCart([
        ...cart,
        {
          id: `item-${Date.now()}-${eq.id}`,
          equipmentId: eq.id,
          itemName: eq.name,
          quantity,
          pricePerQuantity: eq.pricePerUnit,
          availableQuantity: eq.availableQuantity,
        },
      ]);
    }
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity < 1) return item;
          if (newQuantity > item.availableQuantity) {
            Alert.alert(
              "Error",
              `Only ${item.availableQuantity} units available`,
            );
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert("Error", "No student selected");
      return;
    }

    if (cart.length === 0) {
      Alert.alert("Error", "Cart is empty");
      return;
    }

    if (!dueDate) {
      Alert.alert("Error", "Please set a due date");
      return;
    }

    try {
      setLoading(true);

      // Use the createTransaction helper with isAdminCreated = true
      await createTransaction(
        selectedStudent.uid,
        selectedStudent.name,
        selectedStudent.email,
        cart.map((item) => ({
          equipmentId: item.equipmentId,
          name: item.itemName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerQuantity,
        })),
        true, // isAdminCreated - this will set status to "Ongoing"
      );

      Alert.alert(
        "Success",
        "Transaction created successfully with status 'Ongoing'",
      );
      resetModal();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating transaction:", error);
      Alert.alert("Error", "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedStudent(null);
    setCart([]);
    setDueDate(null);
    setSearchQuery("");
    setEquipmentSearch("");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()),
  );

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent style={styles.modalContent}>
        <ModalHeader>
          <Heading size="lg">New Transaction</Heading>
          <ModalCloseButton>
            <Icon as={X} />
          </ModalCloseButton>
        </ModalHeader>

        {/* Progress Indicator */}
        <HStack style={styles.progressContainer} space="sm">
          <Box
            style={{
              ...styles.progressStep,
              ...(step >= 1 ? styles.progressStepActive : {}),
            }}
          >
            <Text style={styles.progressText}>Select Student</Text>
          </Box>
          <MoveRight color={step >= 2 ? "#3b82f6" : "#e5e7eb"} />
          <Box
            style={{
              ...styles.progressStep,
              ...(step >= 2 ? styles.progressStepActive : {}),
            }}
          >
            <Text style={styles.progressText}>Browse Equipment</Text>
          </Box>
          <MoveRight color={step >= 3 ? "#3b82f6" : "#e5e7eb"} />
          <Box
            style={{
              ...styles.progressStep,
              ...(step >= 3 ? styles.progressStepActive : {}),
            }}
          >
            <Text style={styles.progressText}>Set Due Date</Text>
          </Box>
        </HStack>

        <ModalBody>
          <ScrollView>
            {/* Step 1: Select Student */}
            {step === 1 && (
              <VStack space="md">
                <Input>
                  <InputField
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </Input>

                {loading ? (
                  <ActivityIndicator size="large" color="#3b82f6" />
                ) : (
                  filteredStudents.map((student) => (
                    <TouchableOpacity
                      key={student.uid}
                      style={styles.studentCard}
                      onPress={() => handleSelectStudent(student)}
                    >
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentCourse}>{student.course}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </VStack>
            )}

            {/* Step 2: Browse Equipment */}
            {step === 2 && (
              <VStack space="md">
                <Input>
                  <InputField
                    placeholder="Search equipment..."
                    value={equipmentSearch}
                    onChangeText={setEquipmentSearch}
                  />
                </Input>

                <VStack space="sm">
                  {filteredEquipment.map((eq) => (
                    <EquipmentCard
                      key={eq.id}
                      equipment={eq}
                      onAdd={addToCart}
                    />
                  ))}
                </VStack>

                {cart.length > 0 && (
                  <Box style={styles.cartContainer}>
                    <Text style={styles.cartTitle}>
                      Cart ({cart.length} items)
                    </Text>
                    {cart.map((item) => (
                      <HStack key={item.id} style={styles.cartItem}>
                        <VStack style={styles.cartItemInfo}>
                          <Text style={styles.cartItemName}>
                            {item.itemName}
                          </Text>
                          <Text style={styles.cartItemPrice}>
                            ₱{item.pricePerQuantity} × {item.quantity} = ₱
                            {(item.pricePerQuantity * item.quantity).toFixed(2)}
                          </Text>
                        </VStack>
                        <HStack style={styles.cartItemActions}>
                          <TouchableOpacity
                            onPress={() => updateCartQuantity(item.id, -1)}
                          >
                            <Minus size={20} color="#ef4444" />
                          </TouchableOpacity>
                          <Text style={styles.cartItemQuantity}>
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateCartQuantity(item.id, 1)}
                          >
                            <Plus size={20} color="#10b981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => removeFromCart(item.id)}
                          >
                            <Trash2 size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </HStack>
                      </HStack>
                    ))}
                    <Text style={styles.cartTotalText}>
                      Total: ₱
                      {cart
                        .reduce(
                          (sum, item) =>
                            sum + item.pricePerQuantity * item.quantity,
                          0,
                        )
                        .toFixed(2)}
                    </Text>
                  </Box>
                )}
              </VStack>
            )}

            {/* Step 3: Set Due Date */}
            {step === 3 && (
              <VStack space="md">
                <Text style={styles.label}>Due Date and Time</Text>
                <DateTimePicker value={dueDate} onChange={setDueDate} />

                <Box style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Transaction Summary</Text>
                  <Text style={styles.summaryText}>
                    Student: {selectedStudent?.name}
                  </Text>
                  <Text style={styles.summaryText}>
                    Email: {selectedStudent?.email}
                  </Text>
                  <Text style={styles.summaryText}>Items: {cart.length}</Text>
                  <Text style={styles.summaryText}>
                    Total: ₱
                    {cart
                      .reduce(
                        (sum, item) =>
                          sum + item.pricePerQuantity * item.quantity,
                        0,
                      )
                      .toFixed(2)}
                  </Text>
                  <Text style={styles.summaryText}>
                    Status: <Text style={styles.statusOngoing}>Ongoing</Text>
                  </Text>
                </Box>
              </VStack>
            )}
          </ScrollView>
        </ModalBody>

        <ModalFooter>
          <HStack space="sm" style={{ width: "100%" }}>
            {step > 1 && (
              <Button
                variant="outline"
                onPress={() => setStep(step - 1)}
                style={{ flex: 1 }}
              >
                <ButtonText>Back</ButtonText>
              </Button>
            )}
            {step < 3 ? (
              <Button
                onPress={() => (step === 1 ? setStep(2) : setStep(3))}
                disabled={step === 2 && cart.length === 0}
                style={{ flex: 1 }}
              >
                <ButtonText>Next</ButtonText>
              </Button>
            ) : (
              <Button
                onPress={handleSubmit}
                disabled={loading || !dueDate}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ButtonText>Create Transaction</ButtonText>
                )}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Equipment Card Component
function EquipmentCard({
  equipment,
  onAdd,
}: {
  equipment: Equipment;
  onAdd: (eq: Equipment, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <Box style={styles.equipmentCard}>
      <VStack style={styles.equipmentInfo}>
        <Text style={styles.equipmentName}>{equipment.name}</Text>
        <Text style={styles.equipmentDescription}>{equipment.description}</Text>
        <Text style={styles.equipmentAvailable}>
          Available: {equipment.availableQuantity}/{equipment.totalQuantity}
        </Text>
        <Text style={styles.equipmentPrice}>
          ₱{equipment.pricePerUnit.toFixed(2)} per unit
        </Text>
      </VStack>
      <HStack style={styles.equipmentActions}>
        <HStack style={styles.quantityContainer}>
          <TouchableOpacity
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            onPress={() =>
              setQuantity(Math.min(equipment.availableQuantity, quantity + 1))
            }
          >
            <Plus size={20} color="#374151" />
          </TouchableOpacity>
        </HStack>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            onAdd(equipment, quantity);
            setQuantity(1);
          }}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </HStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    maxHeight: "90%",
  },
  progressContainer: {
    padding: 16,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStep: {
    flex: 1,
    padding: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: "#3b82f6",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  studentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  studentCourse: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: "#3b82f6",
    marginTop: 4,
  },
  equipmentCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  equipmentInfo: {
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  equipmentDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  equipmentAvailable: {
    fontSize: 14,
    color: "#059669",
    marginTop: 4,
  },
  equipmentPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
  },
  equipmentActions: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityContainer: {
    alignItems: "center",
    gap: 12,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 30,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  cartContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  cartItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
  },
  cartItemPrice: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  cartItemActions: {
    alignItems: "center",
    gap: 12,
  },
  cartItemQuantity: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 25,
    textAlign: "center",
  },
  cartTotalText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  statusOngoing: {
    color: "#3b82f6",
    fontWeight: "600",
  },
});
