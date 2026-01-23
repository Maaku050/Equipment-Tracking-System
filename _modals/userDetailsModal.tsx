// _modals/UserDetailsModal.tsx
import React, { useState, useEffect } from "react";
import { Text, ScrollView, Alert, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from "@/components/ui/modal";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlHelper,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Badge, BadgeText } from "@/components/ui/badge";
import { db, storage } from "@/firebase/firebaseConfig";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Edit, Package } from "lucide-react-native";

interface User {
  uid: string;
  email: string;
  name: string;
  role: "student" | "staff" | "admin";
  course: string;
  contactNumber: string;
  status: string;
  imageUrl: string;
}

interface RecordItem {
  id: string;
  equipmentId: string;
  itemName: string;
  quantity: number;
  pricePerQuantity: number;
  returned: boolean;
  returnedQuantity: number;
}

interface BorrowRecord {
  id: string;
  transactionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  items: RecordItem[];
  borrowedDate: any;
  dueDate: any;
  returnedDate?: any;
  completedDate?: any;
  finalStatus: string;
  totalPrice: number;
  fineAmount?: number;
  notes?: string;
  createdAt: any;
  archivedAt?: any;
}

interface UserDetailsModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailsModal({
  visible,
  user,
  onClose,
  onUpdate,
}: UserDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Records and fines
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [totalFines, setTotalFines] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Payment
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setCourse(user.course);
      setContactNumber(user.contactNumber);
      setImageUri(user.imageUrl || null);
      fetchBorrowRecords(user.uid);
    }
  }, [user]);

  const fetchBorrowRecords = async (userId: string) => {
    try {
      setLoadingRecords(true);
      const recordsQuery = query(
        collection(db, "records"),
        where("studentId", "==", userId),
      );

      const querySnapshot = await getDocs(recordsQuery);
      const records: BorrowRecord[] = [];
      let totalFine = 0;
      let totalAmount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data() as BorrowRecord;
        records.push({ ...data, id: doc.id });

        if (data.fineAmount) {
          totalFine += data.fineAmount;
        }
        if (data.totalPrice) {
          totalAmount += data.totalPrice;
        }
      });

      // Sort by creation date (newest first)
      records.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setBorrowRecords(records);
      setTotalFines(totalFine);
      setTotalSpent(totalAmount);
    } catch (error) {
      console.error("Error fetching records:", error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleConfirmPayFines = async () => {
    if (!user || totalFines === 0) return;

    try {
      setPaying(true);

      // Get only records with fines
      const recordsWithFines = borrowRecords.filter(
        (r) => r.fineAmount && r.fineAmount > 0,
      );

      const updates = recordsWithFines.map((record) =>
        updateDoc(doc(db, "records", record.id), {
          fineAmount: 0,
          finePaidAt: new Date(),
        }),
      );

      await Promise.all(updates);

      Alert.alert("Payment Successful", "All fines have been cleared.");

      setShowPayConfirm(false);

      // Refresh records + totals
      await fetchBorrowRecords(user.uid);
    } catch (error) {
      console.error("Error clearing fines:", error);
      Alert.alert("Error", "Failed to process payment.");
    } finally {
      setPaying(false);
    }
  };

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!course.trim()) newErrors.course = "Course is required";
    if (!contactNumber.trim())
      newErrors.contactNumber = "Contact number is required";
    else if (!/^(\+63|0)?9\d{9}$/.test(contactNumber))
      newErrors.contactNumber = "Invalid phone number format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string, userId: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `user-profiles/${userId}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user || !validateInputs()) return;

    try {
      setLoading(true);

      let imageUrl = user.imageUrl;

      // Upload new image if changed
      if (imageUri && imageUri !== user.imageUrl) {
        imageUrl = await uploadImage(imageUri, user.uid);
      }

      // Update Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name,
        course,
        contactNumber,
        imageUrl,
        updatedAt: new Date(),
      });

      Alert.alert("Success", "User updated successfully");
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setCourse(user.course);
      setContactNumber(user.contactNumber);
      setImageUri(user.imageUrl || null);
    }
    setIsEditing(false);
    setErrors({});
    onClose();
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getStatusBadgeAction = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "complete" || lowerStatus === "completed")
      return "success";
    if (lowerStatus === "overdue") return "error";
    if (lowerStatus === "pending") return "warning";
    return "muted";
  };

  const getTotalItemsCount = (items: RecordItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getReturnedItemsCount = (items: RecordItem[]) => {
    return items.reduce((sum, item) => sum + item.returnedQuantity, 0);
  };

  if (!user) return null;

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="max-w-6xl h-[90vh]">
        <ModalHeader>
          <Heading size="lg">User Details</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody
          style={{ maxHeight: 600 }}
          showsVerticalScrollIndicator={false}
        >
          <HStack space="xl" className="flex-1">
            {/* LEFT SIDE - User Profile Details */}
            <VStack space="lg" className="flex-1">
              {/* Profile Image */}
              <HStack space="md" style={{ alignItems: "center" }}>
                <TouchableOpacity
                  onPress={isEditing ? pickImage : undefined}
                  disabled={!isEditing}
                  style={{ alignItems: "center" }}
                >
                  <Image
                    source={{
                      uri:
                        imageUri ||
                        "https://via.placeholder.com/300/cccccc/ffffff?text=No+Image",
                    }}
                    className="rounded-md aspect-[263/240]"
                    alt={name}
                    style={{
                      borderWidth: 3,
                      borderColor: "#e5e7eb",
                      height: 150,
                      width: 150,
                    }}
                  />
                </TouchableOpacity>
                <VStack space="md">
                  <Heading size="xl">{name}</Heading>
                  <Text className="text-typography-700">{email}</Text>

                  <HStack space="sm">
                    <Badge
                      variant="solid"
                      action={user.status === "active" ? "success" : "error"}
                    >
                      <BadgeText>{user.status.toUpperCase()}</BadgeText>
                    </Badge>
                    <Badge variant="outline">
                      <BadgeText className="capitalize">{user.role}</BadgeText>
                    </Badge>
                  </HStack>
                </VStack>
              </HStack>

              {isEditing && (
                <Button size="sm" variant="outline" onPress={pickImage}>
                  <ButtonText>Change Photo</ButtonText>
                </Button>
              )}

              <Divider />

              {/* User Information Form */}
              <VStack space="md">
                <Heading size="sm">Personal Information</Heading>

                <HStack space="md" style={{ flex: 1 }}>
                  <FormControl
                    isRequired
                    isInvalid={!!errors.name}
                    style={{ flex: 1 }}
                  >
                    <FormControlLabel>
                      <Text className="font-semibold">Full Name</Text>
                    </FormControlLabel>
                    {isEditing ? (
                      <Input>
                        <InputField
                          value={name}
                          onChangeText={(v) => {
                            setName(v);
                            setErrors((e) => ({ ...e, name: "" }));
                          }}
                          placeholder="Enter full name"
                        />
                      </Input>
                    ) : (
                      <Text className="text-typography-700">{name}</Text>
                    )}
                    {errors.name && (
                      <FormControlError>
                        <Text>{errors.name}</Text>
                      </FormControlError>
                    )}
                  </FormControl>

                  <FormControl style={{ flex: 1 }}>
                    <FormControlLabel>
                      <Text className="font-semibold">Email Address</Text>
                    </FormControlLabel>
                    <Text className="text-typography-700">{email}</Text>
                  </FormControl>
                </HStack>

                <HStack space="md" style={{ flex: 1 }}>
                  <FormControl
                    isRequired
                    isInvalid={!!errors.course}
                    style={{ flex: 1 }}
                  >
                    <FormControlLabel>
                      <Text className="font-semibold">Course</Text>
                    </FormControlLabel>
                    {isEditing ? (
                      <Input>
                        <InputField
                          value={course}
                          onChangeText={(v) => {
                            setCourse(v);
                            setErrors((e) => ({ ...e, course: "" }));
                          }}
                          placeholder="e.g., Computer Science"
                        />
                      </Input>
                    ) : (
                      <Text className="text-typography-700">{course}</Text>
                    )}
                    {errors.course && (
                      <FormControlError>
                        <Text>{errors.course}</Text>
                      </FormControlError>
                    )}
                  </FormControl>

                  <FormControl
                    isRequired
                    isInvalid={!!errors.contactNumber}
                    style={{ flex: 1 }}
                  >
                    <FormControlLabel>
                      <Text className="font-semibold">Contact Number</Text>
                    </FormControlLabel>
                    {isEditing ? (
                      <Input>
                        <InputField
                          value={contactNumber}
                          onChangeText={(v) => {
                            setContactNumber(v);
                            setErrors((e) => ({ ...e, contactNumber: "" }));
                          }}
                          placeholder="+639123456789"
                          keyboardType="phone-pad"
                        />
                      </Input>
                    ) : (
                      <Text className="text-typography-700">
                        {contactNumber}
                      </Text>
                    )}
                    {errors.contactNumber && (
                      <FormControlError>
                        <Text>{errors.contactNumber}</Text>
                      </FormControlError>
                    )}
                  </FormControl>
                </HStack>
              </VStack>

              <Divider />

              {/* Action Buttons */}
              {isEditing ? (
                <HStack space="md">
                  <Button
                    variant="outline"
                    action="secondary"
                    onPress={() => {
                      setIsEditing(false);
                      if (user) {
                        setName(user.name);
                        setCourse(user.course);
                        setContactNumber(user.contactNumber);
                        setImageUri(user.imageUrl || null);
                      }
                      setErrors({});
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                  <Button
                    onPress={handleSave}
                    disabled={loading}
                    className="flex-1"
                  >
                    <ButtonText>
                      {loading ? "Saving..." : "Save Changes"}
                    </ButtonText>
                  </Button>
                </HStack>
              ) : (
                <Button onPress={() => setIsEditing(true)} action="secondary">
                  <ButtonIcon as={Edit} />
                  <ButtonText>Edit User Details</ButtonText>
                </Button>
              )}
            </VStack>

            {/* RIGHT SIDE - Financial Summary & Borrowing History */}
            <VStack space="lg" className="flex-1" style={{ maxHeight: 600 }}>
              {/* Financial Summary */}
              <VStack space="md">
                <Heading size="md">Financial Summary</Heading>
                <Card className="p-4 bg-background-50">
                  <HStack
                    space="md"
                    style={{ justifyContent: "space-between" }}
                  >
                    <HStack className="items-center" space="sm">
                      <Text className="text-typography-600">Total Fines:</Text>
                      <Text className="font-bold text-xl text-error-600">
                        ₱{totalFines.toFixed(2)}
                      </Text>
                    </HStack>
                    <Button
                      action="positive"
                      size="sm"
                      isDisabled={totalFines === 0}
                      onPress={() => setShowPayConfirm(true)}
                    >
                      <ButtonText>Pay</ButtonText>
                    </Button>
                  </HStack>
                </Card>
              </VStack>

              <Divider />

              {/* Borrowing History */}
              <VStack space="md" className="flex-1">
                <HStack className="items-center justify-between">
                  <Heading size="md">Borrowing History</Heading>
                  <Badge action="info">
                    <BadgeText>{borrowRecords.length} records</BadgeText>
                  </Badge>
                </HStack>

                {loadingRecords ? (
                  <Box className="p-8 items-center justify-center">
                    <Text className="text-typography-500">
                      Loading records...
                    </Text>
                  </Box>
                ) : borrowRecords.length === 0 ? (
                  <Box className="p-8 items-center justify-center rounded-lg">
                    <Package size={48} color="#999" />
                    <Text className="text-typography-500 mt-4 text-center">
                      No borrowing records
                    </Text>
                    <Text className="text-typography-400 text-sm text-center mt-2">
                      This user hasn't borrowed any equipment yet
                    </Text>
                  </Box>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    className="flex-1"
                    style={{ maxHeight: 225, minHeight: "100%" }}
                  >
                    <VStack space="md">
                      {borrowRecords.map((record) => (
                        <Box
                          key={record.id}
                          className="p-4 bg-background-50 rounded-lg border border-outline-200"
                        >
                          <VStack space="sm">
                            {/* Header */}
                            <HStack className="justify-between items-start">
                              <VStack style={{ flex: 1 }}>
                                <Text className="font-bold text-base text-primary-600">
                                  {record.transactionId}
                                </Text>
                                <Text className="text-xs text-typography-500">
                                  {formatDate(record.createdAt)}
                                </Text>
                              </VStack>
                              <Badge
                                variant="solid"
                                action={getStatusBadgeAction(
                                  record.finalStatus,
                                )}
                              >
                                <BadgeText className="uppercase">
                                  {record.finalStatus}
                                </BadgeText>
                              </Badge>
                            </HStack>

                            <Divider className="my-2" />

                            {/* Items List */}
                            <VStack space="xs">
                              <Text className="font-semibold text-sm">
                                Equipment ({record.items?.length || 0} items):
                              </Text>
                              {record.items?.map((item) => (
                                <HStack
                                  key={item.id}
                                  className="justify-between items-center pl-2"
                                >
                                  <VStack style={{ flex: 1 }}>
                                    <Text className="text-sm">
                                      {item.itemName}
                                    </Text>
                                    <Text className="text-xs text-typography-600">
                                      Qty: {item.quantity} × ₱
                                      {item.pricePerQuantity.toFixed(2)}
                                      {item.returned &&
                                        ` • Returned: ${item.returnedQuantity}`}
                                    </Text>
                                  </VStack>
                                  <Text className="text-sm font-semibold">
                                    ₱
                                    {(
                                      item.quantity * item.pricePerQuantity
                                    ).toFixed(2)}
                                  </Text>
                                </HStack>
                              ))}
                            </VStack>

                            <Divider className="my-2" />

                            {/* Dates and Summary */}
                            <HStack className="justify-between">
                              <VStack style={{ flex: 1 }}>
                                <Text className="text-xs text-typography-600">
                                  Borrowed: {formatDate(record.borrowedDate)}
                                </Text>
                                <Text className="text-xs text-typography-600">
                                  Due: {formatDate(record.dueDate)}
                                </Text>
                                {record.returnedDate && (
                                  <Text className="text-xs text-typography-600">
                                    Returned: {formatDate(record.returnedDate)}
                                  </Text>
                                )}
                                {record.completedDate && (
                                  <Text className="text-xs text-success-600">
                                    Completed:{" "}
                                    {formatDate(record.completedDate)}
                                  </Text>
                                )}
                              </VStack>

                              <VStack style={{ alignItems: "flex-end" }}>
                                <Text className="text-sm font-semibold">
                                  Total: ₱{record.totalPrice.toFixed(2)}
                                </Text>
                                {record.fineAmount && record.fineAmount > 0 && (
                                  <Text className="text-sm font-semibold text-error-600">
                                    Fine: ₱{record.fineAmount.toFixed(2)}
                                  </Text>
                                )}
                                {record.items && (
                                  <Text className="text-xs text-typography-500 mt-1">
                                    {getReturnedItemsCount(record.items)}/
                                    {getTotalItemsCount(record.items)} items
                                    returned
                                  </Text>
                                )}
                              </VStack>
                            </HStack>

                            {/* Notes */}
                            {record.notes && (
                              <>
                                <Divider className="my-2" />
                                <Text className="text-xs text-typography-600 italic">
                                  Note: {record.notes}
                                </Text>
                              </>
                            )}
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  </ScrollView>
                )}
              </VStack>
            </VStack>
          </HStack>
        </ModalBody>
      </ModalContent>

      {/* Pay Confirmation Modal */}
      <Modal isOpen={showPayConfirm} onClose={() => setShowPayConfirm(false)}>
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="md">Confirm Payment</Heading>
            <ModalCloseButton>
              <Icon as={CloseIcon} />
            </ModalCloseButton>
          </ModalHeader>

          <ModalBody>
            <VStack space="md">
              <Text>This will clear all outstanding fines for this user.</Text>

              <Text className="font-bold text-error-600">
                Total to be cleared: ₱{totalFines.toFixed(2)}
              </Text>

              <HStack space="md" className="mt-4">
                <Button
                  variant="outline"
                  action="secondary"
                  className="flex-1"
                  onPress={() => setShowPayConfirm(false)}
                  isDisabled={paying}
                >
                  <ButtonText>Cancel</ButtonText>
                </Button>

                <Button
                  action="positive"
                  className="flex-1"
                  onPress={handleConfirmPayFines}
                  isDisabled={paying}
                >
                  <ButtonText>
                    {paying ? "Processing..." : "Confirm Payment"}
                  </ButtonText>
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Modal>
  );
}
