// app/user/create-transaction.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { auth, db } from "@/firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
} from "lucide-react-native";
import { useUsers } from "@/context/UsersContext";
import { Image } from "@/components/ui/image";
import DateTimePicker from "@/components/DateTimePicker";
import { createTransaction } from "@/_helpers/firebaseHelpers";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

interface Equipment {
  id: string;
  name: string;
  description: string;
  availableQuantity: number;
  totalQuantity: number;
  pricePerUnit: number;
  condition: string;
  status: string;
  imageUrl: string;
}

interface CartItem {
  id: string;
  equipmentId: string;
  itemName: string;
  quantity: number;
  pricePerQuantity: number;
  availableQuantity: number;
}

export default function CreateTransactionScreen() {
  const currentUser = auth.currentUser;
  const { getUserByUid } = useUsers();
  const studentData = currentUser ? getUserByUid(currentUser.uid) : null;

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  const resetScreenState = useCallback(() => {
    setCart([]);
    setEquipmentSearch("");
    setDueDate(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoadingEquipment(true);
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
      setLoadingEquipment(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      resetScreenState();
      loadEquipment(); // optional but recommended to refresh availability

      return () => {
        // no cleanup needed
      };
    }, [resetScreenState]),
  );

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

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + item.quantity * item.pricePerQuantity,
      0,
    );
  };

  const handleSubmit = async () => {
    if (!currentUser || !studentData) {
      Alert.alert("Error", "User not found");
      return;
    }

    if (cart.length === 0) {
      Alert.alert("Error", "Please add at least one item to your cart");
      return;
    }

    if (!dueDate) {
      Alert.alert("Error", "Please select a due date");
      return;
    }

    // Validate due date is in the future
    const selectedDate = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      Alert.alert("Error", "Due date must be in the future");
      return;
    }

    setLoading(true);

    try {
      // Use the createTransaction helper with isAdminCreated = false (creates "Request")
      await createTransaction(
        currentUser.uid,
        studentData.name,
        studentData.email,
        cart.map((item) => ({
          equipmentId: item.equipmentId,
          name: item.itemName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerQuantity,
        })),
        false, // isAdminCreated - this will set status to "Request"
        dueDate,
      );

      router.back();
    } catch (error) {
      console.error("Error creating transaction:", error);
      Alert.alert("Error", "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()),
  );

  if (!currentUser || !studentData) {
    return (
      <Box style={styles.container}>
        <Box style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        <HStack style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <ArrowLeft size={24} color="#ffffff" />
            <Heading size="lg" style={{ marginLeft: 10, color: "white" }}>
              Create Transaction
            </Heading>
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <VStack style={styles.content}>
          {/* Student Info Card */}
          <Box style={styles.infoCard}>
            <Text style={styles.infoLabel}>Borrower Information</Text>
            <Text style={styles.infoName}>{studentData.name}</Text>
            <Text style={styles.infoEmail}>{studentData.email}</Text>
            {studentData.course && (
              <Text style={styles.infoCourse}>{studentData.course}</Text>
            )}
          </Box>

          {/* Due Date Section */}
          <Box style={styles.section}>
            <Text style={styles.sectionTitle}>Due Date *</Text>
            <DateTimePicker value={dueDate} onChange={setDueDate} />
          </Box>

          {/* Equipment Browsing Section */}
          <Box style={styles.section}>
            <Text style={styles.sectionTitle}>Browse Equipment</Text>

            <Input style={{ marginBottom: 16 }}>
              <InputField
                placeholder="Search equipment..."
                value={equipmentSearch}
                onChangeText={setEquipmentSearch}
              />
            </Input>

            {loadingEquipment ? (
              <Box style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading equipment...</Text>
              </Box>
            ) : (
              <ScrollView
                style={styles.equipmentList}
                contentContainerStyle={styles.equipmentListContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                {filteredEquipment.map((eq) => (
                  <EquipmentCard key={eq.id} equipment={eq} onAdd={addToCart} />
                ))}
              </ScrollView>
            )}
          </Box>

          {/* Cart Section */}
          <Box style={styles.cartSection}>
            <HStack style={styles.cartHeader}>
              <ShoppingCart size={20} color="#1f2937" />
              <Text style={styles.cartTitle}>
                Your Cart ({cart.length} items)
              </Text>
            </HStack>

            {cart.length === 0 ? (
              <Box style={styles.emptyCart}>
                <ShoppingCart size={48} color="#d1d5db" />
                <Text style={styles.emptyCartText}>No items in cart yet</Text>
                <Text style={styles.emptyCartSubtext}>
                  Browse equipment above to add items
                </Text>
              </Box>
            ) : (
              <VStack style={{ gap: 12 }}>
                {cart.map((item) => (
                  <Box key={item.id} style={styles.cartItem}>
                    <VStack style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.itemName}</Text>
                      <Text style={styles.cartItemPrice}>
                        ₱{item.pricePerQuantity} × {item.quantity} = ₱
                        {(item.pricePerQuantity * item.quantity).toFixed(2)}
                      </Text>
                    </VStack>
                    <HStack style={styles.cartItemActions}>
                      <TouchableOpacity
                        onPress={() => updateCartQuantity(item.id, -1)}
                        style={styles.cartActionButton}
                      >
                        <Minus size={18} color="#ef4444" />
                      </TouchableOpacity>
                      <Text style={styles.cartItemQuantity}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateCartQuantity(item.id, 1)}
                        style={styles.cartActionButton}
                      >
                        <Plus size={18} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.id)}
                        style={styles.cartActionButton}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </HStack>
                  </Box>
                ))}

                {/* Total */}
                <Box style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalPrice}>
                    ₱{calculateTotal().toFixed(2)}
                  </Text>
                </Box>
              </VStack>
            )}
          </Box>
        </VStack>
      </ScrollView>

      {/* Submit Button */}
      <Box style={styles.footer}>
        <Button
          onPress={handleSubmit}
          disabled={loading || cart.length === 0 || !dueDate}
          style={{ width: "100%" }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ButtonText>Submit Transaction Request</ButtonText>
          )}
        </Button>
      </Box>
    </Box>
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
      <HStack style={{ gap: 12 }}>
        <Image
          source={{
            uri:
              equipment.imageUrl ||
              "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
          }}
          className="h-[100px] w-[100px] rounded-md"
          alt={equipment.name}
        />
        <VStack style={{ flex: 1 }}>
          <Text style={styles.equipmentName}>{equipment.name}</Text>
          <Text style={styles.equipmentDescription} numberOfLines={2}>
            {equipment.description}
          </Text>
          <Text style={styles.equipmentAvailable}>
            Available: {equipment.availableQuantity}/{equipment.totalQuantity}
          </Text>
          <Text style={styles.equipmentPrice}>
            ₱{equipment.pricePerUnit.toFixed(2)} per unit
          </Text>
        </VStack>
      </HStack>

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
        <Button
          size="sm"
          onPress={() => {
            onAdd(equipment, quantity);
            setQuantity(1);
          }}
        >
          <ButtonText>Add to Cart</ButtonText>
        </Button>
      </HStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  equipmentList: {
    maxHeight: 630, // ≈ 3 cards
    borderRadius: 12,
  },

  equipmentListContent: {
    gap: 12,
    paddingRight: 4, // avoids scrollbar overlap on web
  },
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    backgroundColor: "#2563eb",
    paddingTop: 10,
    paddingLeft: 5,
    paddingBottom: 10,
  },
  headerContent: {
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    color: "#ffffff",
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  infoEmail: {
    fontSize: 14,
    color: "#2563eb",
    marginTop: 4,
  },
  infoCourse: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  equipmentCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
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
    fontWeight: "600",
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
    marginTop: 8,
  },
  quantityContainer: {
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  cartSection: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cartHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  emptyCart: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9ca3af",
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#d1d5db",
  },
  cartItem: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  cartItemPrice: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  cartItemActions: {
    alignItems: "center",
    gap: 8,
  },
  cartActionButton: {
    padding: 4,
  },
  cartItemQuantity: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563eb",
  },
  footer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
});
