import React, { useState, useEffect } from "react";
import { Alert, ScrollView, Text } from "react-native";
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
import { ChevronDownIcon } from "@/components/ui/icon";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { Equipment } from "@/context/EquipmentContext";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
} from "@/components/ui/form-control";
import { HStack } from "@/components/ui/hstack";

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
    imageUrl: "",
  });
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
        imageUrl: equipment.imageUrl || "",
      });
    }
  }, [equipment, visible]);

  const handleClose = () => {
    onClose();
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

      const equipmentRef = doc(db, "equipment", equipment.id);
      await updateDoc(equipmentRef, {
        name: formData.name,
        description: formData.description,
        totalQuantity: newTotalQuantity,
        availableQuantity: newAvailableQuantity,
        pricePerUnit: parseFloat(formData.pricePerUnit),
        condition: formData.condition,
        status: formData.status,
        imageUrl: formData.imageUrl || equipment.imageUrl,
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

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">Edit Equipment</Heading>
          <ModalCloseButton />
        </ModalHeader>

        <ModalBody>
          <HStack space="sm" style={{ flex: 1 }}>
            <VStack space="md" style={{ flex: 1 }}>
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
              <FormControl
                isRequired
                isInvalid={!!errors.description}
                style={{ marginTop: 17 }}
              >
                <FormControlLabel>
                  <Text>Description</Text>
                </FormControlLabel>
                <Textarea style={{ minHeight: 115 }}>
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

              {/* Image URL */}
              <FormControl>
                <FormControlLabel>
                  <Text>Image URL (Optional)</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    placeholder="Enter image URL"
                    value={formData.imageUrl}
                    onChangeText={(v) =>
                      setFormData({ ...formData, imageUrl: v })
                    }
                  />
                </Input>
              </FormControl>
            </VStack>
            <VStack space="md" style={{ flex: 1 }}>
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
            </VStack>
          </HStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            action="secondary"
            onPress={handleClose}
            className="mr-3"
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
