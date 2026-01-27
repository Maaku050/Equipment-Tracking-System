// app/TestMaintenanceScreen.tsx
import React, { useState } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebaseConfig"; // Adjust path to your firebase config
import { Button, ButtonText } from "@/components/ui/button";

interface MaintenanceResult {
  success: boolean;
  overdueCount: number;
  reminderCount: number;
  overdueNoticeCount: number;
}

export default function TestMaintenanceScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [testResult, setTestResult] = useState<string>("");

  const runTestFunction = async () => {
    setLoading(true);
    try {
      const testFunc = httpsCallable(functions, "testFunction");
      const response = await testFunc();
      console.log("Test function response:", response.data);
      setTestResult(JSON.stringify(response.data, null, 2));
      Alert.alert("Success", "Test function works!");
    } catch (error: any) {
      console.error("Test function error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const runManualMaintenance = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Create a callable function reference
      const manualMaintenance = httpsCallable<void, MaintenanceResult>(
        functions,
        "manualTransactionMaintenance",
      );

      // Call the function
      const response = await manualMaintenance();

      // Display the result
      setResult(response.data);

      Alert.alert(
        "Maintenance Complete",
        `Updated: ${response.data.overdueCount} overdue\n` +
          `Reminders: ${response.data.reminderCount}\n` +
          `Overdue Notices: ${response.data.overdueNoticeCount}`,
        [{ text: "OK" }],
      );
    } catch (error: any) {
      console.error("Error running maintenance:", error);
      console.error("Error code:", error.code);
      console.error("Error details:", error.details);
      Alert.alert(
        "Error",
        `${error.message}\n\nCode: ${error.code}\n\nDetails: ${error.details || "None"}`,
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 20 }}>
        Manual Maintenance Test
      </Text>

      <Button onPress={runTestFunction} isDisabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText>Test Basic Function</ButtonText>
        )}
      </Button>

      <Button onPress={runManualMaintenance} isDisabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText>Run Manual Maintenance</ButtonText>
        )}
      </Button>

      {testResult && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#e3f2fd",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
            Test Function Result:
          </Text>
          <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
            {testResult}
          </Text>
        </View>
      )}

      {result && (
        <View
          style={{
            padding: 16,
            backgroundColor: "#f0f0f0",
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
            Results:
          </Text>
          <Text>✅ Success: {result.success ? "Yes" : "No"}</Text>
          <Text>📝 Overdue Updated: {result.overdueCount}</Text>
          <Text>⏰ Reminders Sent: {result.reminderCount}</Text>
          <Text>⚠️ Overdue Notices: {result.overdueNoticeCount}</Text>
        </View>
      )}
    </View>
  );
}
