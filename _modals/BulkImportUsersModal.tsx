// _modals/BulkImportUsersModal.tsx
import React, { useState } from "react";
import { Text, View, Alert, ScrollView, Platform } from "react-native";
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
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Badge, BadgeText } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface BulkImportUsersModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserData {
  name: string;
  email: string;
  password: string;
  course: string;
  contactNumber: string;
  role: "student" | "staff" | "admin";
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  successful: string[];
  failed: { email: string; error: string }[];
}

export default function BulkImportUsersModal({
  visible,
  onClose,
  onSuccess,
}: BulkImportUsersModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  const CLOUD_FUNCTION_URL =
    "https://us-central1-equipment-tracking-syste-65e94.cloudfunctions.net/userManagement/createBulkUsers";

  // Validation functions
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    return /^(\+63|0)?9\d{9}$/.test(phone);
  };

  const validateRow = (row: any, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const rowNum = index + 2; // +2 because Excel row 1 is header, index starts at 0

    if (!row.name || String(row.name).trim() === "") {
      errors.push({ row: rowNum, field: "name", message: "Name is required" });
    }

    if (!row.email || String(row.email).trim() === "") {
      errors.push({
        row: rowNum,
        field: "email",
        message: "Email is required",
      });
    } else if (!isValidEmail(String(row.email))) {
      errors.push({
        row: rowNum,
        field: "email",
        message: "Invalid email format",
      });
    }

    if (!row.password || String(row.password).trim() === "") {
      errors.push({
        row: rowNum,
        field: "password",
        message: "Password is required",
      });
    } else if (String(row.password).length < 6) {
      errors.push({
        row: rowNum,
        field: "password",
        message: "Password must be at least 6 characters",
      });
    }

    if (!row.course || String(row.course).trim() === "") {
      errors.push({
        row: rowNum,
        field: "course",
        message: "Course is required",
      });
    }

    if (!row.contactNumber || String(row.contactNumber).trim() === "") {
      errors.push({
        row: rowNum,
        field: "contactNumber",
        message: "Contact number is required",
      });
    } else if (!isValidPhoneNumber(String(row.contactNumber))) {
      errors.push({
        row: rowNum,
        field: "contactNumber",
        message: "Invalid phone format (use +639XXXXXXXXX or 09XXXXXXXXX)",
      });
    }

    const role = String(row.role || "student").toLowerCase();
    if (!["student", "staff", "admin"].includes(role)) {
      errors.push({
        row: rowNum,
        field: "role",
        message: "Role must be student, staff, or admin",
      });
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

      // Read the file
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      // Get first sheet
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Validate data
      const errors: ValidationError[] = [];
      const validUsers: UserData[] = [];

      jsonData.forEach((row: any, index) => {
        const rowErrors = validateRow(row, index);
        errors.push(...rowErrors);

        if (rowErrors.length === 0) {
          validUsers.push({
            name: String(row.name).trim(),
            email: String(row.email).trim(),
            password: String(row.password).trim(),
            course: String(row.course).trim(),
            contactNumber: String(row.contactNumber).trim(),
            role: String(
              row.role || "student",
            ).toLowerCase() as UserData["role"],
          });
        }
      });

      setValidationErrors(errors);
      setUserData(validUsers);
      setStep("preview");
    } catch (error) {
      console.error("Error reading file:", error);
      Alert.alert("Error", "Failed to read the Excel file. Please try again.");
    }
  };

  const handleImport = async () => {
    if (userData.length === 0) {
      Alert.alert("Error", "No valid users to import");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ users: userData }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setImportResult(data.data);
        setStep("result");
      } else {
        Alert.alert("Error", data.message || "Failed to import users");
      }
    } catch (error) {
      console.error("Error importing users:", error);
      Alert.alert(
        "Error",
        "Failed to import users. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    if (Platform.OS === "web") {
      // Create template workbook
      const template = [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          password: "password123",
          course: "Computer Science",
          contactNumber: "+639123456789",
          role: "student",
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          password: "password456",
          course: "Information Technology",
          contactNumber: "09987654321",
          role: "student",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(template);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      // Set column widths
      ws["!cols"] = [
        { wch: 20 }, // name
        { wch: 30 }, // email
        { wch: 15 }, // password
        { wch: 25 }, // course
        { wch: 18 }, // contactNumber
        { wch: 10 }, // role
      ];

      // Generate and download
      XLSX.writeFile(wb, "bulk_users_template.xlsx");
    } else {
      Alert.alert(
        "Template Download",
        "Template download is only available on web platform. Please use the web version to download the template.",
      );
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUserData([]);
    setValidationErrors([]);
    setImportResult(null);
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
          <Heading size="lg">Bulk Import Users</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          {step === "upload" && !loading && (
            <HStack space="lg">
              <VStack space="lg">
                {/* Instructions */}
                <Card className="p-4 bg-primary-50 border border-primary-200">
                  <VStack space="sm">
                    <Heading size="sm">Instructions</Heading>
                    <Text className="text-sm text-typography-700">
                      1. Download the Excel template below
                    </Text>
                    <Text className="text-sm text-typography-700">
                      2. Fill in the user details (name, email, password,
                      course, contactNumber, role)
                    </Text>
                    <Text className="text-sm text-typography-700">
                      3. Upload the completed Excel file
                    </Text>
                    <Text className="text-sm text-typography-700">
                      4. Review and confirm the import
                    </Text>
                  </VStack>
                </Card>

                {/* File Format Requirements */}
                <Card className="p-4 bg-background-50">
                  <VStack space="sm">
                    <Heading size="sm">Required Columns</Heading>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">name</Text>: Full name
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">email</Text>: Valid
                      email address
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">password</Text>: Minimum
                      6 characters
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">course</Text>: Course or
                      program
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">contactNumber</Text>:
                      Phone (+639XXXXXXXXX or 09XXXXXXXXX)
                    </Text>
                    <Text className="text-sm text-typography-700">
                      • <Text className="font-semibold">role</Text>: student or
                      admin (default: student)
                    </Text>
                  </VStack>
                </Card>
              </VStack>

              <VStack space="lg" style={{ flex: 1 }}>
                {/* Download Template */}
                <Button
                  variant="outline"
                  action="primary"
                  onPress={downloadTemplate}
                  size="lg"
                >
                  <ButtonIcon as={Download} />
                  <ButtonText>Download Template</ButtonText>
                </Button>

                {/* Upload File */}
                <Card
                  className="p-6 border-2 border-dashed border-outline-300"
                  style={{ flex: 1 }}
                >
                  <VStack
                    space="md"
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                    }}
                  >
                    <Upload size={48} color="#9ca3af" />
                    <Heading size="md">Upload Excel File</Heading>
                    <Text className="text-center text-typography-600">
                      Select an Excel file (.xlsx) with user data
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
            <VStack space="lg">
              {/* File Info */}
              <Card className="p-4 bg-success-50 border border-success-200">
                <HStack space="sm" style={{ alignItems: "center" }}>
                  <CheckCircle size={20} color="#10b981" />
                  <VStack style={{ flex: 1 }}>
                    <Text className="font-semibold text-success-900">
                      File: {selectedFile}
                    </Text>
                    <Text className="text-sm text-success-700">
                      {userData.length} valid users found
                    </Text>
                  </VStack>
                </HStack>
              </Card>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
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
                          Row {error.row}, {error.field}: {error.message}
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
              )}

              {/* Preview Data */}
              <VStack space="sm">
                <Heading size="sm">Preview ({userData.length} users)</Heading>
                <ScrollView style={{ maxHeight: 300 }}>
                  {userData.slice(0, 5).map((user, index) => (
                    <Card key={index} className="p-3 mb-2">
                      <VStack space="xs">
                        <Text className="font-semibold">{user.name}</Text>
                        <Text className="text-sm text-typography-600">
                          {user.email}
                        </Text>
                        <HStack space="sm">
                          <Badge size="sm" variant="solid" action="info">
                            <BadgeText>{user.course}</BadgeText>
                          </Badge>
                          <Badge size="sm" variant="outline">
                            <BadgeText>{user.role}</BadgeText>
                          </Badge>
                        </HStack>
                      </VStack>
                    </Card>
                  ))}
                  {userData.length > 5 && (
                    <Text className="text-sm text-typography-500 text-center mt-2">
                      ... and {userData.length - 5} more users
                    </Text>
                  )}
                </ScrollView>
              </VStack>
            </VStack>
          )}

          {step === "result" && importResult && !loading && (
            <VStack space="lg">
              {/* Success Summary */}
              <Card
                className="p-4 bg-success-50 border border-success-200"
                style={{ justifyContent: "center", alignItems: "center" }}
              >
                <VStack space="sm">
                  <HStack space="sm" style={{ alignItems: "center" }}>
                    <CheckCircle size={24} color="#10b981" />
                    <Heading size="md" className="text-success-900">
                      Import Complete
                    </Heading>
                  </HStack>
                  <Text className="text-md font-semibold text-success-900">
                    {importResult.successful.length} users created successfully
                  </Text>
                  {importResult.failed.length > 0 && (
                    <Text className="text-sm text-error-600">
                      {importResult.failed.length} users failed
                    </Text>
                  )}
                </VStack>
              </Card>

              {/* Failed Imports */}
              {importResult.failed.length > 0 && (
                <Card className="p-4 bg-error-50 border border-error-200">
                  <VStack space="sm">
                    <Heading size="sm" className="text-error-900">
                      Failed Imports
                    </Heading>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {importResult.failed.map((failure, index) => (
                        <Text key={index} className="text-sm text-error-700">
                          {failure.email}: {failure.error}
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
                Importing users... This may take a few moments.
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
                  onPress={handleImport}
                  className="flex-1"
                  disabled={loading || userData.length === 0}
                >
                  <ButtonText>
                    {loading
                      ? "Importing..."
                      : `Import ${userData.length} Users`}
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
