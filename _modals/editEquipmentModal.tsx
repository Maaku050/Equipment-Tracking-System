// _modals/editEquipmentModal.tsx
import React, { useState, useEffect } from "react";
import { Alert, ScrollView, Text, Image, View } from "react-native";
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
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/firebase/firebaseConfig";
import { Equipment } from "@/context/EquipmentContext";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";
import * as ImagePicker from "expo-image-picker";

interface EditEquipmentModalProps {
  visible: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onSuccess: () => void;
}

export default function EditEquipmentModal({
  visible,
  onClose,
  equipment,
  onSuccess,
}: EditEquipmentModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    totalQuantity: "",
    pricePerUnit: "",
    condition: "good",
    status: "available",
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [existingImagePath, setExistingImagePath] = useState<string>("");
  const [imageChanged, setImageChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (equipment && visible) {
      setFormData({
        name: equipment.name,
        description: equipment.description,
        totalQuantity: equipment.totalQuantity.toString(),
        pricePerUnit: equipment.pricePerUnit.toString(),
        condition: equipment.condition,
        status: equipment.status,
      });
      setExistingImageUrl(equipment.imageUrl || "");
      setExistingImagePath(equipment.imagePath || "");
      setImageUri(null);
      setImageChanged(false);
    }
  }, [equipment, visible]);

  const handleClose = () => {
    setImageUri(null);
    setImageChanged(false);
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
        setImageChanged(true);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageChanged(true);
  };

  const deleteOldImage = async (imagePath: string) => {
    if (!imagePath) return;

    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log("✅ Old image deleted successfully:", imagePath);
    } catch (error: any) {
      // If the file doesn't exist, that's fine
      if (error.code === "storage/object-not-found") {
        console.log("ℹ️ Old image not found in storage:", imagePath);
      } else {
        console.error("Error deleting old image:", error);
        // Don't throw error - we still want to proceed with update
      }
    }
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
    } else if (equipment && quantity < equipment.borrowedQuantity) {
      newErrors.totalQuantity = `Cannot be less than borrowed (${equipment.borrowedQuantity})`;
    }

    const price = parseFloat(formData.pricePerUnit);
    if (!formData.pricePerUnit || isNaN(price) || price < 0) {
      newErrors.pricePerUnit = "Enter a valid price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!equipment || !validateForm()) return;

    try {
      setLoading(true);

      const newTotalQuantity = parseInt(formData.totalQuantity);
      const quantityDifference = newTotalQuantity - equipment.totalQuantity;
      const newAvailableQuantity =
        equipment.availableQuantity + quantityDifference;

      let finalImageUrl = existingImageUrl;
      let finalImagePath = existingImagePath;

      // Handle image changes
      if (imageChanged) {
        // If there's a new image, upload it
        if (imageUri) {
          // Delete old image if exists (using imagePath)
          if (existingImagePath) {
            await deleteOldImage(existingImagePath);
          }
          // Upload new image
          const result = await uploadImage(equipment.id);
          finalImageUrl = result.imageUrl;
          finalImagePath = result.imagePath;
        } else {
          // User removed the image
          if (existingImagePath) {
            await deleteOldImage(existingImagePath);
          }
          finalImageUrl = "";
          finalImagePath = "";
        }
      }

      const equipmentRef = doc(db, "equipment", equipment.id);
      await updateDoc(equipmentRef, {
        name: formData.name,
        description: formData.description,
        totalQuantity: newTotalQuantity,
        availableQuantity: newAvailableQuantity,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        condition: formData.condition,
        status: formData.status,
        imageUrl: finalImageUrl,
        imagePath: finalImagePath,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Success", "Equipment updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("❌ Error updating equipment:", error);
      Alert.alert("Error", "Failed to update equipment");
    } finally {
      setLoading(false);
    }
  };

  if (!equipment) return null;

  // Determine which image to show
  const displayImageUri = imageUri || existingImageUrl;

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent className={"max-w-6xl h-[90vh]"}>
        <ModalHeader>
          <Heading size="md">Edit Equipment</Heading>
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
                {displayImageUri ? (
                  <Image
                    source={{ uri: displayImageUri }}
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
                      {displayImageUri ? "Change Image" : "Select Image"}
                    </ButtonText>
                  </Button>
                  {displayImageUri && (
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
                {errors.totalQuantity ? (
                  <FormControlError>
                    <Text>{errors.totalQuantity}</Text>
                  </FormControlError>
                ) : (
                  <Text
                    style={{ fontSize: 12 }}
                    className="text-typography-500"
                  >
                    Current borrowed: {equipment.borrowedQuantity} — available
                    adjusts automatically
                  </Text>
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
            <ButtonText>
              {loading ? "Updating..." : "Update Equipment"}
            </ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
