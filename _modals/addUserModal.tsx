// _modals/AddUserModal.tsx
import React, { useState } from "react";
import { Text, View, Alert, Image, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Icon, CloseIcon } from "@/components/ui/icon";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import {
  FormControl,
  FormControlLabel,
  FormControlError,
  FormControlHelper,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UserRole = "student" | "staff" | "admin";

export default function AddUserModal({
  visible,
  onClose,
  onSuccess,
}: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [course, setCourse] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const CLOUD_FUNCTION_URL =
    "https://us-central1-equipment-tracking-syste-65e94.cloudfunctions.net/userManagement/createUser";
  // TODO: Replace with your actual Cloud Function URL
  // Example: 'https://us-central1-elabtrack-12345.cloudfunctions.net/userManagement/createUser'

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email address";

    if (!password.trim()) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";

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
      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos.",
        );
        return;
      }

      // Launch image picker
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

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64String.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

      let imageBase64 = null;
      if (imageUri) {
        imageBase64 = await convertImageToBase64(imageUri);
      }

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          role,
          course: course.trim(),
          contactNumber: contactNumber.trim(),
          imageBase64,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        resetForm();
        onClose();
        onSuccess();
      } else {
        Alert.alert("Error", data.message || "Failed to create user.");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      Alert.alert(
        "Error",
        "Failed to create user. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setCourse("");
    setContactNumber("");
    setImageUri(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Add New User</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {/* Profile Image Upload */}
          <VStack space="md" style={{ alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity onPress={pickImage} disabled={loading}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "#e5e7eb",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: "#d1d5db",
                }}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    Tap to{"\n"}upload
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <Button
              size="sm"
              variant="outline"
              onPress={pickImage}
              disabled={loading}
            >
              <ButtonText>
                {imageUri ? "Change Photo" : "Upload Photo"}
              </ButtonText>
            </Button>
          </VStack>

          <HStack space="sm" style={{ flex: 1 }}>
            {/* LEFT COLUMN */}
            <VStack space="md" style={{ flex: 1 }}>
              {/* Name */}
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormControlLabel>
                  <Text>Name</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setErrors((e) => ({ ...e, name: "" }));
                    }}
                    placeholder="Enter full name"
                    editable={!loading}
                  />
                </Input>
                {errors.name && (
                  <FormControlError>
                    <Text>{errors.name}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Course */}
              <FormControl isRequired isInvalid={!!errors.course}>
                <FormControlLabel>
                  <Text>Course</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={course}
                    onChangeText={(v) => {
                      setCourse(v);
                      setErrors((e) => ({ ...e, course: "" }));
                    }}
                    placeholder="e.g., Computer Science"
                    editable={!loading}
                  />
                </Input>
                {errors.course && (
                  <FormControlError>
                    <Text>{errors.course}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Contact Number */}
              <FormControl isRequired isInvalid={!!errors.contactNumber}>
                <FormControlLabel>
                  <Text>Contact Number</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={contactNumber}
                    onChangeText={(v) => {
                      setContactNumber(v);
                      setErrors((e) => ({ ...e, contactNumber: "" }));
                    }}
                    placeholder="+639123456789"
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                </Input>

                {!errors.contactNumber ? (
                  <FormControlHelper>
                    <Text>Format: +639XXXXXXXXX or 09XXXXXXXXX</Text>
                  </FormControlHelper>
                ) : (
                  <FormControlError>
                    <Text>{errors.contactNumber}</Text>
                  </FormControlError>
                )}
              </FormControl>
            </VStack>

            {/* RIGHT COLUMN */}
            <VStack space="md" style={{ flex: 1 }}>
              {/* Email */}
              <FormControl isRequired isInvalid={!!errors.email}>
                <FormControlLabel>
                  <Text>Email</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setErrors((e) => ({ ...e, email: "" }));
                    }}
                    placeholder="user@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </Input>
                {errors.email && (
                  <FormControlError>
                    <Text>{errors.email}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Password */}
              <FormControl isRequired isInvalid={!!errors.password}>
                <FormControlLabel>
                  <Text>Password</Text>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      setErrors((e) => ({ ...e, password: "" }));
                    }}
                    placeholder="Minimum 6 characters"
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </Input>
                {errors.password && (
                  <FormControlError>
                    <Text>{errors.password}</Text>
                  </FormControlError>
                )}
              </FormControl>

              {/* Role */}
              <FormControl isRequired>
                <FormControlLabel>
                  <Text>Role</Text>
                </FormControlLabel>
                <HStack space="sm">
                  {(["student", "staff", "admin"] as UserRole[]).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={role === r ? "solid" : "outline"}
                      onPress={() => setRole(r)}
                      disabled={loading}
                    >
                      <ButtonText>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </ButtonText>
                    </Button>
                  ))}
                </HStack>
              </FormControl>
            </VStack>
          </HStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md">
            <Button
              variant="outline"
              action="secondary"
              onPress={handleClose}
              disabled={loading}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>

            <Button onPress={handleSave} disabled={loading}>
              <ButtonText>{loading ? "Creating..." : "Create User"}</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
