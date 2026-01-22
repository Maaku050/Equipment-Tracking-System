// components/AddUserModal.tsx

import React, { useState } from "react";
import { Text, TextInput, View, StyleSheet, Alert } from "react-native";
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
  FormControlHelper,
  FormControlError,
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const CLOUD_FUNCTION_URL =
    "http://127.0.0.1:5001/equipment-tracking-syste-65e94/us-central1/userManagement/createUser";
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

  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);

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

const styles = StyleSheet.create({
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    backgroundColor: "#ffffff",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  roleButtons: {
    flexWrap: "wrap",
  },
  roleButton: {
    flex: 1,
    minWidth: 80,
  },
  roleButtonText: {
    fontSize: 13,
  },
});
