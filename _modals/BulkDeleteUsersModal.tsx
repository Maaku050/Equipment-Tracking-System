// _modals/BulkDeleteUsersModal.tsx
import React, { useState } from "react";
import { Text, View, Alert, ScrollView } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
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
import { Upload, AlertCircle, CheckCircle, Trash2 } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

interface BulkDeleteUsersModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserToDelete {
  email: string;
  name?: string;
}

interface ValidationError {
  row: number;
  message: string;
}

interface DeleteResult {
  successful: string[];
  failed: { email: string; error: string }[];
}

export default function BulkDeleteUsersModal({
  visible,
  onClose,
  onSuccess,
}: BulkDeleteUsersModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [usersToDelete, setUsersToDelete] = useState<UserToDelete[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  const CLOUD_FUNCTION_URL =
    "https://us-central1-equipment-tracking-syste-65e94.cloudfunctions.net/userManagement/deleteBulkUsers";

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateRow = (row: any, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const rowNum = index + 2;

    if (!row.email || String(row.email).trim() === "") {
      errors.push({ row: rowNum, message: "Email is required" });
    } else if (!isValidEmail(String(row.email))) {
      errors.push({ row: rowNum, message: "Invalid email format" });
    }

    return errors;
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile(file.name);

      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (jsonData.length === 0) {
        Alert.alert("Error", "The Excel file is empty");
        return;
      }

      const errors: ValidationError[] = [];
      const validUsers: UserToDelete[] = [];

      jsonData.forEach((row: any, index) => {
        const rowErrors = validateRow(row, index);
        errors.push(...rowErrors);

        if (rowErrors.length === 0) {
          validUsers.push({
            email: String(row.email).trim().toLowerCase(),
            name: row.name ? String(row.name).trim() : undefined,
          });
        }
      });

      setValidationErrors(errors);
      setUsersToDelete(validUsers);
      setStep("preview");
    } catch (error) {
      console.error("Error reading file:", error);
      Alert.alert("Error", "Failed to read the Excel file. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (usersToDelete.length === 0) {
      Alert.alert("Error", "No valid users to delete");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: usersToDelete.map((u) => u.email),
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setDeleteResult(data.data);
        setStep("result");
      } else {
        Alert.alert("Error", data.message || "Failed to delete users");
      }
    } catch (error) {
      console.error("Error deleting users:", error);
      Alert.alert(
        "Error",
        "Failed to delete users. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUsersToDelete([]);
    setValidationErrors([]);
    setDeleteResult(null);
    setStep("upload");
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onSuccess();
  };

  return (
    <Modal isOpen={visible} onClose={handleClose} size="lg">
      <ModalBackdrop />
      <ModalContent className={"max-w-6xl h-[90vh]"}>
        <ModalHeader>
          <Heading size="lg">Bulk Delete Users</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {step === "upload" && !loading && (
            <HStack space="lg">
              <VStack space="md">
                {/* Instructions */}
                <Card className="p-4 bg-background-50 border border-outline-200">
                  <VStack space="sm">
                    <Heading size="sm">Instructions</Heading>
                    <Text className="text-sm text-typography-700">
                      1. Upload an Excel file (.xlsx) with user emails
                    </Text>
                    <Text className="text-sm text-typography-700">
                      2. The file must have an "email" column
                    </Text>
                    <Text className="text-sm text-typography-700">
                      3. Review the list of users to be deleted
                    </Text>
                    <Text className="text-sm text-typography-700">
                      4. Confirm the deletion (cannot be undone)
                    </Text>
                  </VStack>
                </Card>

                {/* Requirements */}
                <Card className="p-4 bg-background-50">
                  <VStack space="sm">
                    <Heading size="sm">Required Columns</Heading>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">email</Text>: Valid
                      email address (required)
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">name</Text>: User name
                      (optional, for reference only)
                    </Text>
                    <Text className="text-sm text-typography-500 mt-2">
                      Note: You can use the same Excel file from bulk import
                    </Text>
                  </VStack>
                </Card>
              </VStack>

              <VStack space="md" style={{ flex: 1 }}>
                {/* Warning */}
                <Card className="p-4 bg-error-50 border border-error-200">
                  <VStack space="sm">
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <AlertCircle size={20} color="#ef4444" />
                      <Heading size="sm" className="text-error-900">
                        Warning: Permanent Action
                      </Heading>
                    </HStack>
                    <Text className="text-sm text-error-700">
                      This will permanently delete user accounts from Firebase
                      Auth, Firestore, and Storage. This action cannot be
                      undone.
                    </Text>
                  </VStack>
                </Card>

                {/* Upload Excel File */}
                <Card className="p-6 border-2 border-dashed border-outline-300">
                  <VStack space="md" style={{ alignItems: "center" }}>
                    <Upload size={48} color="#9ca3af" />
                    <Heading size="md">Upload Excel File</Heading>
                    <Text className="text-center text-typography-600">
                      Select an Excel file (.xlsx) with user emails to delete
                    </Text>
                    <Button onPress={handleFileSelect} disabled={loading}>
                      <ButtonIcon as={Upload} />
                      <ButtonText>Choose File</ButtonText>
                    </Button>
                  </VStack>
                </Card>
              </VStack>
            </HStack>
          )}

          {step === "preview" && !loading && (
            <HStack space="lg">
              <VStack space="lg" style={{ flex: 1 }}>
                {/* Final Warning */}
                <Card className="p-4 bg-error-50 border border-error-300">
                  <VStack space="sm">
                    <HStack space="sm" style={{ alignItems: "center" }}>
                      <AlertCircle size={20} color="#dc2626" />
                      <Heading size="sm" className="text-error-900">
                        Final Warning
                      </Heading>
                    </HStack>
                    <Text className="text-sm text-error-700">
                      You are about to permanently delete {usersToDelete.length}{" "}
                      user account(s). This will remove:
                    </Text>
                    <Text className="text-sm text-error-700">
                      • Firebase Authentication accounts
                    </Text>
                    <Text className="text-sm text-error-700">
                      • Firestore user data
                    </Text>
                    <Text className="text-sm text-error-700">
                      • User profile images from Storage
                    </Text>
                    <Text className="text-sm text-error-900 font-semibold mt-2">
                      This action CANNOT be undone!
                    </Text>
                  </VStack>
                </Card>

                {/* Validation */}
                {validationErrors.length > 0 ? (
                  <Card className="p-4 bg-error-50 border border-error-200">
                    <VStack space="sm">
                      <HStack space="sm" style={{ alignItems: "center" }}>
                        <AlertCircle size={20} color="#ef4444" />
                        <Heading size="sm" className="text-error-900">
                          {validationErrors.length} Validation Error
                          {validationErrors.length > 1 ? "s" : ""}
                        </Heading>
                      </HStack>
                      <ScrollView style={{ maxHeight: 200 }}>
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <Text key={index} className="text-sm text-error-700">
                            Row {error.row}: {error.message}
                          </Text>
                        ))}
                        {validationErrors.length > 10 && (
                          <Text className="text-sm text-error-700 mt-2">
                            ... and {validationErrors.length - 10} more errors
                          </Text>
                        )}
                      </ScrollView>
                    </VStack>
                  </Card>
                ) : (
                  <Card
                    className="p-4 bg-success-50 border border-success-200"
                    style={{ justifyContent: "center", alignItems: "center" }}
                  >
                    <VStack space="sm">
                      <HStack space="sm" style={{ alignItems: "center" }}>
                        <CheckCircle size={20} color="#4aef44" />
                        <Heading size="sm" className="text-success-900">
                          {validationErrors.length} Validation Error
                          {validationErrors.length > 1 ? "s" : null}
                        </Heading>
                      </HStack>
                      <ScrollView style={{ maxHeight: 200 }}>
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <Text key={index} className="text-sm text-error-700">
                            Row {error.row}: {error.message}
                          </Text>
                        ))}
                        {validationErrors.length > 10 ? (
                          <Text className="text-sm text-error-700 mt-2">
                            ... and {validationErrors.length - 10} more errors
                          </Text>
                        ) : null}
                      </ScrollView>
                    </VStack>
                  </Card>
                )}
              </VStack>

              <VStack space="lg" style={{ flex: 1 }}>
                {/* File */}
                <Card className="p-4 bg-warning-50 border border-warning-300">
                  <HStack space="sm" style={{ alignItems: "center" }}>
                    <AlertCircle size={20} color="#f59e0b" />
                    <VStack style={{ flex: 1 }}>
                      <Text className="font-semibold text-warning-900">
                        File: {selectedFile}
                      </Text>
                      <Text className="text-sm text-warning-700">
                        {usersToDelete.length} user(s) will be deleted
                      </Text>
                    </VStack>
                  </HStack>
                </Card>

                {/* Users to Delete */}
                <VStack space="sm">
                  <Heading size="sm">
                    Users to Delete ({usersToDelete.length})
                  </Heading>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {usersToDelete.slice(0, 10).map((user, index) => (
                      <Card
                        key={index}
                        className="p-3 mb-2 bg-error-50 border border-error-200"
                      >
                        <HStack space="sm" style={{ alignItems: "center" }}>
                          <Trash2 size={16} color="#ef4444" />
                          <VStack style={{ flex: 1 }}>
                            <Text className="font-semibold text-error-900">
                              {user.email}
                            </Text>
                            {user.name && (
                              <Text className="text-sm text-error-700">
                                {user.name}
                              </Text>
                            )}
                          </VStack>
                        </HStack>
                      </Card>
                    ))}
                    {usersToDelete.length > 10 && (
                      <Text className="text-sm text-typography-500 text-center mt-2">
                        ... and {usersToDelete.length - 10} more users
                      </Text>
                    )}
                  </ScrollView>
                </VStack>
              </VStack>
            </HStack>
          )}

          {step === "result" && deleteResult && !loading && (
            <VStack space="lg">
              <Card
                className="p-4 bg-success-50 border border-success-200"
                style={{ justifyContent: "center", alignItems: "center" }}
              >
                <VStack space="sm">
                  <HStack space="sm" style={{ alignItems: "center" }}>
                    <CheckCircle size={24} color="#10b981" />
                    <Heading size="md" className="text-success-900">
                      Deletion Complete
                    </Heading>
                  </HStack>
                  <Text className="text-md font-semibold text-success-900">
                    {deleteResult.successful.length} users deleted successfully
                  </Text>
                  {deleteResult.failed.length > 0 && (
                    <Text className="text-sm text-error-600">
                      {deleteResult.failed.length} users failed to delete
                    </Text>
                  )}
                </VStack>
              </Card>

              {deleteResult.successful.length > 0 && (
                <Card className="p-4 bg-success-50 border border-success-200">
                  <VStack space="sm">
                    <Heading size="sm" className="text-success-900">
                      Successfully Deleted
                    </Heading>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {deleteResult.successful.map((email, index) => (
                        <Text key={index} className="text-sm text-success-700">
                          ✓ {email}
                        </Text>
                      ))}
                    </ScrollView>
                  </VStack>
                </Card>
              )}

              {deleteResult.failed.length > 0 && (
                <Card className="p-4 bg-error-50 border border-error-200">
                  <VStack space="sm">
                    <Heading size="sm" className="text-error-900">
                      Failed to Delete
                    </Heading>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {deleteResult.failed.map((failure, index) => (
                        <Text key={index} className="text-sm text-error-700">
                          ✕ {failure.email}: {failure.error}
                        </Text>
                      ))}
                    </ScrollView>
                  </VStack>
                </Card>
              )}
            </VStack>
          )}

          {loading && (
            <VStack space="md" style={{ alignItems: "center", padding: 40 }}>
              <Spinner size="large" />
              <Text className="text-typography-600">
                Deleting users... This may take a few moments.
              </Text>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          <HStack space="md" className="w-full">
            {step === "upload" && (
              <Button
                variant="outline"
                action="secondary"
                onPress={handleClose}
                className="flex-1"
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
            )}

            {step === "preview" && (
              <>
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => setStep("upload")}
                  className="flex-1"
                  disabled={loading}
                >
                  <ButtonText>Back</ButtonText>
                </Button>
                <Button
                  onPress={handleDelete}
                  className="flex-1"
                  action="negative"
                  disabled={loading || usersToDelete.length === 0}
                >
                  <ButtonIcon as={Trash2} />
                  <ButtonText>
                    {loading
                      ? "Deleting..."
                      : `Delete ${usersToDelete.length} Users`}
                  </ButtonText>
                </Button>
              </>
            )}

            {step === "result" && (
              <Button onPress={handleComplete} className="flex-1">
                <ButtonText>Done</ButtonText>
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
