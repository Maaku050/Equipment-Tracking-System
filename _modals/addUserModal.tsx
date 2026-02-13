// _modals/AddUserModal.tsx (Simplified - No Bulk Actions)
import React, { useState } from "react";
import {
  Text,
  View,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
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
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
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
import { UserRoundPlus } from "lucide-react-native";
import { Card } from "@/components/ui/card";

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UserRole = "student" | "admin";

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

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email and password are always required
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Invalid email address";

    if (!password.trim()) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Minimum 6 characters";

    // Student-specific validations
    if (role === "student") {
      if (!name.trim()) newErrors.name = "Name is required";
      if (!course.trim()) newErrors.course = "Course is required";
      if (!contactNumber.trim())
        newErrors.contactNumber = "Contact number is required";
      else if (!/^(\+63|0)?9\d{9}$/.test(contactNumber))
        newErrors.contactNumber = "Invalid phone number format";
    }

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

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
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
      if (imageUri && role === "student") {
        imageBase64 = await convertImageToBase64(imageUri);
      }

      const payload: any = {
        email: email.trim(),
        password: password.trim(),
        role,
      };

      // Add student-specific fields
      if (role === "student") {
        payload.name = name.trim();
        payload.course = course.trim();
        payload.contactNumber = contactNumber.trim();
        payload.imageBase64 = imageBase64;
      } else {
        // For admin, use email as name
        payload.name = email.split("@")[0];
        payload.course = "N/A";
        payload.contactNumber = "N/A";
      }

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        Alert.alert(
          "Success",
          `${role === "student" ? "Student" : "Admin"} created successfully!`,
        );
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

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    // Clear student-specific errors when switching to admin
    if (newRole === "admin") {
      setErrors({});
      setName("");
      setCourse("");
      setContactNumber("");
      setImageUri(null);
    }
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="max-w-6xl h-[90vh]">
        <ModalHeader>
          <Heading size="lg">Add New User</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <ScrollView showsVerticalScrollIndicator={false}>
            <VStack space="lg">
              {/* Role Selection */}
              <Card className="p-4 bg-background-50 border border-outline-200">
                <VStack space="md">
                  <Heading size="sm">Select User Type</Heading>
                  <HStack space="md">
                    <Button
                      size="md"
                      variant={role === "student" ? "solid" : "outline"}
                      action={role === "student" ? "primary" : "secondary"}
                      onPress={() => handleRoleChange("student")}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      <ButtonIcon as={UserRoundPlus} />
                      <ButtonText>Student Account</ButtonText>
                    </Button>
                    <Button
                      size="md"
                      variant={role === "admin" ? "solid" : "outline"}
                      action={role === "admin" ? "primary" : "secondary"}
                      onPress={() => handleRoleChange("admin")}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      <ButtonText>Admin Account</ButtonText>
                    </Button>
                  </HStack>
                  <Text className="text-xs text-typography-500">
                    {role === "student"
                      ? "Students can borrow equipment and access their records"
                      : "Admins have full access to manage users, equipment, and records"}
                  </Text>
                </VStack>
              </Card>

              {/* Conditional Fields Based on Role */}
              {role === "student" ? (
                <>
                  <HStack style={{ flex: 1 }} space="md">
                    <VStack
                      space="md"
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        flex: 1,
                      }}
                    >
                      <TouchableOpacity onPress={pickImage} disabled={loading}>
                        <View
                          style={{
                            width: 250,
                            height: 250,
                            borderRadius: "100%",
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
                            <Text
                              style={{
                                color: "#9ca3af",
                                fontSize: 12,
                                textAlign: "center",
                              }}
                            >
                              Tap to{"\n"}upload photo
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </VStack>
                    <VStack
                      space="md"
                      style={{
                        justifyContent: "center",
                        flex: 1,
                      }}
                    >
                      {/* Name */}
                      <FormControl isRequired isInvalid={!!errors.name}>
                        <FormControlLabel>
                          <Text>Full Name</Text>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            value={name}
                            onChangeText={(v) => {
                              setName(v);
                              setErrors((e) => ({ ...e, name: "" }));
                            }}
                            placeholder="Enter student's full name"
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
                          <Text>Course/Program</Text>
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
                      <FormControl
                        isRequired
                        isInvalid={!!errors.contactNumber}
                      >
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
                            placeholder="+639123456789 or 09123456789"
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
                    <VStack
                      space="sm"
                      style={{
                        flex: 1,
                      }}
                    >
                      {/* Email */}
                      <FormControl isRequired isInvalid={!!errors.email}>
                        <FormControlLabel>
                          <Text>Email Address</Text>
                        </FormControlLabel>
                        <Input>
                          <InputField
                            value={email}
                            onChangeText={(v) => {
                              setEmail(v);
                              setErrors((e) => ({ ...e, email: "" }));
                            }}
                            placeholder="student@example.com"
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
                    </VStack>
                  </HStack>
                </>
              ) : (
                <>
                  {/* Admin Form Fields - Simplified */}
                  <Card className="p-4 bg-info-50 border border-info-200">
                    <VStack space="sm">
                      <Text className="font-semibold text-info-900">
                        Admin Account Requirements
                      </Text>
                      <Text className="text-sm text-info-700">
                        Only email and password are required for admin accounts.
                        Admin users will have full access to manage the system.
                      </Text>
                    </VStack>
                  </Card>

                  <VStack space="md">
                    {/* Email */}
                    <FormControl isRequired isInvalid={!!errors.email}>
                      <FormControlLabel>
                        <Text>Admin Email Address</Text>
                      </FormControlLabel>
                      <Input>
                        <InputField
                          value={email}
                          onChangeText={(v) => {
                            setEmail(v);
                            setErrors((e) => ({ ...e, email: "" }));
                          }}
                          placeholder="admin@example.com"
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
                        <Text>Admin Password</Text>
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
                  </VStack>
                </>
              )}
            </VStack>
          </ScrollView>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button
              variant="outline"
              action="secondary"
              onPress={handleClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>

            <Button
              onPress={handleSave}
              disabled={loading}
              action="primary"
              style={{ flex: 1 }}
            >
              <ButtonText>
                {loading
                  ? "Creating..."
                  : `Create ${role === "student" ? "Student" : "Admin"}`}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
