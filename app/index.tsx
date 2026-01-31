// app/index.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  Image,
  useWindowDimensions,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ButtonText, Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const dimensions = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Responsive breakpoints
  const isMobile = dimensions.width < 768;
  const isDesktop = dimensions.width >= 768;

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Query Firestore users collection by uid
      const q = query(collection(db, "users"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("User profile not found");
        await auth.signOut();
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.status !== "active") {
        setError(
          "Your account is not active. Please contact the administrator.",
        );
        await auth.signOut();
        return;
      }

      // Route based on role
      const userRole = userData.role;
      if (userRole === "admin" || userRole === "staff") {
        router.replace("/admin");
      } else if (userRole === "student") {
        router.replace("/user");
      } else {
        setError("Invalid user role");
        await auth.signOut();
      }
    } catch (err: any) {
      console.error("Login error:", err);
      switch (err.code) {
        case "auth/invalid-email":
          setError("Invalid email address");
          break;
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/wrong-password":
          setError("Incorrect password");
          break;
        case "auth/invalid-credential":
          setError("Invalid email or password");
          break;
        default:
          setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          flexDirection: isMobile ? "column" : "row",
          minHeight: "100%",
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Branding Section - Hidden on mobile */}
        {!isMobile && (
          <View
            style={{
              flex: 1,
              backgroundColor: "#3a4451",
              justifyContent: "center",
              alignItems: "center",
              padding: 40,
              minWidth: 400,
            }}
          >
            <View
              style={{
                maxWidth: 400,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  marginBottom: 32,
                  padding: 10,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 100,
                }}
              >
                <Image
                  source={require("@/assets/images/FSMO_Logo.png")}
                  style={{ width: 150, height: 150 }}
                  resizeMode="contain"
                />
              </View>
              <Heading
                style={{
                  fontSize: 48,
                  fontWeight: "700",
                  color: "#ffffff",
                  marginBottom: 12,
                  letterSpacing: -1,
                }}
              >
                eLabTrack
              </Heading>
              <Text
                style={{
                  fontSize: 18,
                  color: "#b8c1cc",
                  textAlign: "center",
                  marginBottom: 32,
                  lineHeight: 26,
                }}
              >
                Laboratory Equipment Borrowing System
              </Text>
              <View
                style={{
                  width: 60,
                  height: 3,
                  backgroundColor: "#0078d4",
                  marginBottom: 24,
                  borderRadius: 2,
                }}
              />
              <Text
                style={{
                  fontSize: 15,
                  color: "#8a94a0",
                  textAlign: "center",
                  lineHeight: 24,
                }}
              >
                Streamlined equipment management with real-time tracking and
                automated notifications
              </Text>
            </View>
          </View>
        )}

        {/* Login Form Section */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: isMobile ? 20 : 40,
            minWidth: isMobile ? "100%" : 400,
          }}
        >
          <View style={{ width: "100%", maxWidth: 440 }}>
            {/* Mobile Logo Header */}
            {isMobile && (
              <View
                style={{
                  alignItems: "center",
                  marginBottom: 32,
                  paddingTop: 20,
                }}
              >
                <Image
                  source={require("@/assets/images/FSMO_Logo.png")}
                  style={{ width: 100, height: 100, marginBottom: 16 }}
                  resizeMode="contain"
                />
                <Heading
                  style={{
                    fontSize: 32,
                    fontWeight: "700",
                    color: "#0078d4",
                    marginBottom: 8,
                  }}
                >
                  eLabTrack
                </Heading>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    textAlign: "center",
                    paddingHorizontal: 20,
                  }}
                >
                  Laboratory Equipment Borrowing System
                </Text>
              </View>
            )}

            <VStack
              style={{
                backgroundColor: "#ffffff",
                borderRadius: isMobile ? 12 : 16,
                padding: isMobile ? 24 : 40,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              {/* Form Header */}
              <VStack style={{ marginBottom: 32 }}>
                <Heading
                  style={{
                    fontSize: isMobile ? 24 : 28,
                    fontWeight: "700",
                    color: "#1f2937",
                    marginBottom: 8,
                  }}
                >
                  Welcome Back
                </Heading>
                <Text style={{ fontSize: 15, color: "#6b7280" }}>
                  Sign in to your account to continue
                </Text>
              </VStack>

              {/* Error Message */}
              {error && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#fee2e2",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    marginBottom: 24,
                    gap: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: "#dc2626",
                  }}
                >
                  <AlertCircle size={20} color="#dc2626" />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: "#991b1b",
                      fontWeight: "500",
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* Login Form */}
              <VStack style={{ gap: 20 }}>
                <VStack style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Email Address
                  </Text>
                  <Input
                    style={{
                      borderWidth: 2,
                      borderColor: "#e5e7eb",
                      borderRadius: 10,
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <InputField
                      placeholder="your.email@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      style={{ fontSize: 15, color: "#1f2937" }}
                    />
                  </Input>
                </VStack>

                <VStack style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    Password
                  </Text>
                  <Input
                    style={{
                      borderWidth: 2,
                      borderColor: "#e5e7eb",
                      borderRadius: 10,
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <InputField
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      style={{ fontSize: 15, color: "#1f2937" }}
                    />
                  </Input>
                </VStack>

                <Button
                  onPress={handleLogin}
                  disabled={loading}
                  style={{
                    backgroundColor: "#0078d4",
                    borderRadius: 10,
                    paddingVertical: 16,
                    marginTop: 8,
                    shadowColor: "#0078d4",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <ButtonText style={{ fontSize: 16, fontWeight: "600" }}>
                    {loading ? "Signing in..." : "Sign In"}
                  </ButtonText>
                </Button>
              </VStack>

              {/* Footer */}
              <View style={{ marginTop: 32, alignItems: "center" }}>
                <View
                  style={{
                    width: "100%",
                    height: 1,
                    backgroundColor: "#e5e7eb",
                    marginBottom: 20,
                  }}
                />
                <Text style={{ fontSize: 13, color: "#9ca3af" }}>
                  FSMO Organization • v1.0.0
                </Text>
              </View>
            </VStack>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecf0f5",
  },
});
