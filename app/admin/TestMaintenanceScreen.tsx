// TestMaintenance.tsx - Fixed version with better error handling
import React, { useState } from "react";
import { View, Text, ActivityIndicator, Alert, ScrollView } from "react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebaseConfig";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";

interface MaintenanceResult {
  success: boolean;
  overdueCount: number;
  reminderCount: number;
  overdueNoticeCount: number;
  ondueNoticeCount: number;
}

interface TestResult {
  message: string;
  timestamp: string;
}

export default function TestMaintenanceScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTestFunction = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      console.log("Calling test function...");

      const testFunc = httpsCallable<Record<string, never>, TestResult>(
        functions,
        "testFunction",
      );

      const response = await testFunc({});
      console.log("Test function response:", response.data);

      setTestResult(response.data);
      Alert.alert("Success", "Test function works!");
    } catch (error: any) {
      console.error("Test function error:", error);

      const errorMessage = error.message || "Test function failed";
      const errorCode = error.code || "unknown";
      const errorDetails = error.details || "No additional details";

      setError(
        `Error: ${errorMessage}\nCode: ${errorCode}\nDetails: ${errorDetails}`,
      );

      Alert.alert(
        "Error",
        `${errorMessage}\n\nCode: ${errorCode}\n\nCheck console for details`,
      );
    } finally {
      setLoading(false);
    }
  };

  const runManualMaintenance = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      console.log("Calling manual maintenance function...");

      const manualMaintenance = httpsCallable<
        Record<string, never>,
        MaintenanceResult
      >(functions, "manualTransactionMaintenance");

      const response = await manualMaintenance({});
      console.log("Maintenance response:", response.data);

      setResult(response.data);

      Alert.alert(
        "Maintenance Complete",
        `Updated Overdue: ${response.data.overdueCount}\n` +
          `Return Reminders: ${response.data.reminderCount}\n` +
          `Overdue Notices: ${response.data.overdueNoticeCount}\n` +
          `Ondue Notices: ${response.data.ondueNoticeCount}`,
      );
    } catch (error: any) {
      console.error("Error running maintenance:", error);

      const errorMessage = error.message || "Maintenance failed";
      const errorCode = error.code || "unknown";
      const errorDetails = error.details || "No additional details";

      setError(
        `Error: ${errorMessage}\nCode: ${errorCode}\nDetails: ${errorDetails}`,
      );

      Alert.alert(
        "Error",
        `${errorMessage}\n\nCode: ${errorCode}\n\nThis might be due to:\n` +
          `1. Not being logged in\n` +
          `2. Functions not deployed\n` +
          `3. CORS issues\n\n` +
          `Check console for full details`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <VStack style={{ padding: 20, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
          Manual Maintenance Test
        </Text>

        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
          Use these buttons to test your Firebase Functions. Make sure you're
          logged in first!
        </Text>

        {/* Test Basic Function Button */}
        <Button
          onPress={runTestFunction}
          isDisabled={loading}
          style={{ width: "100%" }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>Test Basic Function</ButtonText>
          )}
        </Button>

        {/* Manual Maintenance Button */}
        <Button
          onPress={runManualMaintenance}
          isDisabled={loading}
          style={{ width: "100%" }}
          action="positive"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>Run Manual Maintenance</ButtonText>
          )}
        </Button>

        {/* Test Function Result */}
        {testResult && (
          <Box
            style={{
              padding: 16,
              backgroundColor: "#e3f2fd",
              borderRadius: 8,
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#2196f3",
            }}
          >
            <Text
              style={{ fontWeight: "bold", marginBottom: 8, color: "#1565c0" }}
            >
              ✅ Test Function Result:
            </Text>
            <Text
              style={{ fontFamily: "monospace", fontSize: 12, color: "#333" }}
            >
              {JSON.stringify(testResult, null, 2)}
            </Text>
          </Box>
        )}

        {/* Maintenance Result */}
        {result && (
          <Box
            style={{
              padding: 16,
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#10b981",
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 10,
                color: "#047857",
              }}
            >
              ✅ Maintenance Results
            </Text>
            <VStack style={{ gap: 8 }}>
              <Text style={{ fontSize: 14 }}>
                <Text style={{ fontWeight: "bold" }}>Success:</Text>{" "}
                {result.success ? "Yes" : "No"}
              </Text>
              <Text style={{ fontSize: 14 }}>
                <Text style={{ fontWeight: "bold" }}>Overdue Updated:</Text>{" "}
                {result.overdueCount}
              </Text>
              <Text style={{ fontSize: 14 }}>
                <Text style={{ fontWeight: "bold" }}>
                  Return Reminders Sent:
                </Text>{" "}
                {result.reminderCount}
              </Text>
              <Text style={{ fontSize: 14 }}>
                <Text style={{ fontWeight: "bold" }}>
                  Overdue Notices Sent:
                </Text>{" "}
                {result.overdueNoticeCount}
              </Text>
              <Text style={{ fontSize: 14 }}>
                <Text style={{ fontWeight: "bold" }}>Ondue Notices Sent:</Text>{" "}
                {result.ondueNoticeCount}
              </Text>
            </VStack>
          </Box>
        )}

        {/* Error Display */}
        {error && (
          <Box
            style={{
              padding: 16,
              backgroundColor: "#fee",
              borderRadius: 8,
              marginTop: 10,
              borderWidth: 1,
              borderColor: "#ef4444",
            }}
          >
            <Text
              style={{ fontWeight: "bold", marginBottom: 8, color: "#dc2626" }}
            >
              ❌ Error Details:
            </Text>
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "#991b1b",
              }}
            >
              {error}
            </Text>
          </Box>
        )}

        {/* Instructions */}
        <Box
          style={{
            padding: 16,
            backgroundColor: "#fffbeb",
            borderRadius: 8,
            marginTop: 20,
            borderWidth: 1,
            borderColor: "#f59e0b",
          }}
        >
          <Text
            style={{ fontWeight: "bold", marginBottom: 8, color: "#92400e" }}
          >
            💡 Troubleshooting Tips:
          </Text>
          <VStack style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: "#78350f" }}>
              1. Make sure you're logged in as an authenticated user
            </Text>
            <Text style={{ fontSize: 13, color: "#78350f" }}>
              2. Check that Firebase Functions are deployed: `firebase deploy
              --only functions`
            </Text>
            <Text style={{ fontSize: 13, color: "#78350f" }}>
              3. Verify your Firebase config in firebaseConfig.ts
            </Text>
            <Text style={{ fontSize: 13, color: "#78350f" }}>
              4. Check the browser console and Firebase Functions logs for
              errors
            </Text>
            <Text style={{ fontSize: 13, color: "#78350f" }}>
              5. Ensure the function region matches: asia-southeast1
            </Text>
          </VStack>
        </Box>
      </VStack>
    </ScrollView>
  );
}
