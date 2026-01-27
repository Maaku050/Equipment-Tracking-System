// components/AdminGuard.tsx
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Center } from "./ui/center";
import { Spinner } from "./ui/spinner";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("Not logged in");
        router.replace("/"); // not logged in
      } else if (user.role !== "admin" && user.role !== "staff") {
        console.log("Not admin");
        router.replace("/"); // non-admins
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <Center className="flex-1">
        <Spinner size="large" />
      </Center>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "staff")) {
    return null; // will redirect
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
