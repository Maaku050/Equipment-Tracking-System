// _modals/addEquipmentModal.tsx
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
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
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from "@/components/ui/select";
import { ChevronDownIcon, CloseIcon, Icon } from "@/components/ui/icon";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase/firebaseConfig";
import { HStack } from "@/components/ui/hstack";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
} from "@/components/ui/form-control";
import * as ImagePicker from "expo-image-picker";

interface AddEquipmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEquipmentModal({
  visible,
  onClose,
  onSuccess,
}: AddEquipmentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    totalQuantity: "",
    pricePerUnit: "",
    condition: "good",
    status: "available",
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      totalQuantity: "",
      pricePerUnit: "",
      condition: "good",
      status: "available",
    });
    setImageUri(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Sorry, we need camera roll permissions to upload images.",
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
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

  const removeImage = () => {
    setImageUri(null);
  };

  const uploadImage = async (
    equipmentId: string,
  ): Promise<{ imageUrl: string; imagePath: string }> => {
    if (!imageUri) return { imageUrl: "", imagePath: "" };

    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create a unique filename
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      // Create storage path
      const imagePath = `equipment-images/${equipmentId}/${filename}`;

      // Create storage reference
      const storageRef = ref(storage, imagePath);

      // Upload the image
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      return { imageUrl: downloadURL, imagePath };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Equipment name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    const quantity = parseInt(formData.totalQuantity);
    if (!formData.totalQuantity || isNaN(quantity) || quantity <= 0) {
      newErrors.totalQuantity = "Enter a valid quantity greater than 0";
    }

    const price = parseFloat(formData.pricePerUnit);
    if (!formData.pricePerUnit || isNaN(price) || price < 0) {
      newErrors.pricePerUnit = "Enter a valid price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const totalQty = parseInt(formData.totalQuantity);

      // First, create the equipment document
      const docRef = await addDoc(collection(db, "equipment"), {
        name: formData.name,
        description: formData.description,
        totalQuantity: totalQty,
        availableQuantity: totalQty, // Initially all available
        borrowedQuantity: 0,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        condition: formData.condition,
        status: formData.status,
        imageUrl: "", // Will be updated if image exists
        imagePath: "", // Store the storage path for easy deletion
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Upload image if selected and update the document
      if (imageUri) {
        const { imageUrl, imagePath } = await uploadImage(docRef.id);

        // Update the document with the image URL and path
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "equipment", docRef.id), {
          imageUrl: imageUrl,
          imagePath: imagePath,
        });
      }

      Alert.alert("Success", "Equipment added successfully!");
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("❌ Error adding equipment:", error);
      Alert.alert("Error", "Failed to add equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent className={"max-w-6xl h-[90vh]"}>
        <ModalHeader>
          <Heading size="md">Add New Equipment</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <HStack space="sm" style={{ flex: 1 }}>
            {/* Image Upload */}
            <FormControl style={{ flex: 1 }}>
              <FormControlLabel>
                <Text>Equipment Image (Optional)</Text>
              </FormControlLabel>

              <VStack space="sm">
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{
                      width: "100%",
                      height: 300,
                      borderRadius: 8,
                      backgroundColor: "#f0f0f0",
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 300,
                      borderRadius: 8,
                      backgroundColor: "#e5e5e5",
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: "#d4d4d4",
                      borderStyle: "dashed",
                    }}
                  >
                    <Icon
                      as={Image}
                      size="xl"
                      className="text-typography-400 mb-2"
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#737373",
                        fontWeight: "500",
                      }}
                    >
                      No Image Selected
                    </Text>
                  </View>
                )}
                <HStack space="sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={pickImage}
                    style={{ flex: 1 }}
                  >
                    <ButtonText>
                      {imageUri ? "Change Image" : "Select Image"}
                    </ButtonText>
                  </Button>
                  {imageUri && (
                    <Button
                      variant="outline"
                      size="sm"
                      action="negative"
                      onPress={removeImage}
                      style={{ flex: 1 }}
                    >
                      <ButtonText>Remove</ButtonText>
                    </Button>
                  )}
                </HStack>
              </VStack>
            </FormControl>

            {/* LEFT COLUMN */}
            <VStack space="sm" style={{ flex: 1 }}>
              {/* Equipment Name */}
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormControlLabel>
                  <Text>Equipment Name</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    placeholder="e.g., Digital Multimeter"
                    value={formData.name}
                    onChangeText={(v) => {
                      setFormData({ ...formData, name: v });
                      setErrors((e) => ({ ...e, name: "" }));
                    }}
                  />
                </Input>
                {errors.name && (
                  <FormControlError>
                    <Text>{errors.name}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Description */}
              <FormControl isRequired isInvalid={!!errors.description}>
                <FormControlLabel>
                  <Text>Description</Text>
                </FormControlLabel>
                <Textarea style={{ minHeight: 193 }}>
                  <TextareaInput
                    placeholder="e.g., Fluke 87V Digital Multimeter"
                    value={formData.description}
                    onChangeText={(v) => {
                      setFormData({ ...formData, description: v });
                      setErrors((e) => ({ ...e, description: "" }));
                    }}
                  />
                </Textarea>
                {errors.description && (
                  <FormControlError>
                    <Text>{errors.description}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </VStack>

            {/* RIGHT COLUMN */}
            <VStack space="md" style={{ flex: 1 }}>
              {/* Price Per Unit */}
              <FormControl isRequired isInvalid={!!errors.pricePerUnit}>
                <FormControlLabel>
                  <Text>Price Per Unit (₱)</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    placeholder="Enter price"
                    keyboardType="decimal-pad"
                    value={formData.pricePerUnit}
                    onChangeText={(v) => {
                      setFormData({ ...formData, pricePerUnit: v });
                      setErrors((e) => ({ ...e, pricePerUnit: "" }));
                    }}
                  />
                </Input>
                {errors.pricePerUnit && (
                  <FormControlError>
                    <Text>{errors.pricePerUnit}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Condition */}
              <FormControl>
                <FormControlLabel>
                  <Text>Condition</Text>
                </FormControlLabel>
                <Select
                  selectedValue={formData.condition}
                  onValueChange={(v) =>
                    setFormData({ ...formData, condition: v })
                  }
                >
                  <SelectTrigger>
                    <SelectInput placeholder="Select condition" />
                    <SelectIcon as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="Good" value="good" />
                      <SelectItem label="Fair" value="fair" />
                      <SelectItem label="Needs Repair" value="needs repair" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              {/* Status */}
              <FormControl>
                <FormControlLabel>
                  <Text>Status</Text>
                </FormControlLabel>
                <Select
                  selectedValue={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectInput placeholder="Select status" />
                    <SelectIcon as={ChevronDownIcon} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label="Available" value="available" />
                      <SelectItem label="Unavailable" value="unavailable" />
                      <SelectItem label="Maintenance" value="maintenance" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              {/* Total Quantity */}
              <FormControl isRequired isInvalid={!!errors.totalQuantity}>
                <FormControlLabel>
                  <Text>Total Quantity</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    placeholder="Enter quantity"
                    keyboardType="numeric"
                    value={formData.totalQuantity}
                    onChangeText={(v) => {
                      setFormData({ ...formData, totalQuantity: v });
                      setErrors((e) => ({ ...e, totalQuantity: "" }));
                    }}
                  />
                </Input>
                {errors.totalQuantity && (
                  <FormControlError>
                    <Text>{errors.totalQuantity}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </VStack>
          </HStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            action="secondary"
            onPress={handleClose}
            className="mr-3"
            disabled={loading}
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button onPress={handleSubmit} disabled={loading}>
            <ButtonText>{loading ? "Adding..." : "Add Equipment"}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
