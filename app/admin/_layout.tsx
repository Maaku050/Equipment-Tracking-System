// admin/_layout.tsx
import React from "react";
import {
  StyleSheet,
  View,
  Image,
  Text,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useWindowDimensions } from "react-native";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerToggleButton,
} from "@react-navigation/drawer";
import "@/global.css";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  NotepadText,
  Package,
  UsersRound,
} from "lucide-react-native";
import { Heading } from "@/components/ui/heading";
import { TransactionProvider } from "@/context/TransactionContext";
import { EquipmentProvider } from "@/context/EquipmentContext";
import { RecordsProvider } from "@/context/RecordsContext";
import { UsersProvider } from "@/context/UsersContext";
import { useState } from "react";
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";

// Custom Drawer Content
function CustomDrawerContent(props: any) {
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
      style={{ backgroundColor: "#3a4451" }}
    >
      {/* Logo Section */}
      <View
        style={{
          padding: 20,
          alignItems: "center",
          paddingTop: 20,
          paddingBottom: 20,
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <Image
          source={require("@/assets/images/sksu-logo.png")}
          style={{ width: 70, height: 70 }}
          resizeMode="contain"
        />
      </View>

      {/* Drawer Items */}
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

export default function RootLayout() {
  const dimensions = useWindowDimensions();

  const isLargeScreen = dimensions.width >= 1280;
  const isMediumScreen = dimensions.width <= 1280 && dimensions.width > 768;

  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Define theme colors matching the provided design
  const theme = {
    background: "#ecf0f5", // Light gray background
    drawerBackground: "#3a4451", // Dark sidebar
    headerBg: "#0078d4", // Blue header
    text: "#fff",
    drawerActive: "#fff",
    drawerInactive: "#b8c1cc",
    drawerActiveBg: "#1e88e5", // Light blue for active items
    borderColor: "#2d3541",
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      router.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  return (
    <TransactionProvider>
      <EquipmentProvider>
        <RecordsProvider>
          <UsersProvider>
            <GluestackUIProvider mode="light">
              <Modal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
              >
                <ModalBackdrop />
                <ModalContent>
                  <ModalHeader>
                    <Heading size="md">Confirm Logout</Heading>
                  </ModalHeader>

                  <ModalBody>
                    <Text style={{ color: "#374151", fontSize: 14 }}>
                      Are you sure you want to log out of your account?
                    </Text>
                  </ModalBody>

                  <ModalFooter style={{ gap: 12 }}>
                    <Button
                      variant="outline"
                      action="secondary"
                      onPress={() => setShowLogoutModal(false)}
                    >
                      <ButtonText>Cancel</ButtonText>
                    </Button>

                    <Button action="negative" onPress={confirmLogout}>
                      <ButtonText>Logout</ButtonText>
                    </Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
              <Drawer
                drawerContent={(props: any) => (
                  <CustomDrawerContent {...props} />
                )}
                screenOptions={{
                  drawerType: isLargeScreen
                    ? "permanent"
                    : isMediumScreen
                      ? "slide"
                      : "slide",
                  drawerStyle: isLargeScreen
                    ? {
                        width: 200,
                        backgroundColor: theme.background,
                        borderRightWidth: 0,
                      }
                    : {
                        width: "70%",
                        backgroundColor: theme.background,
                      },
                  headerShown: true,
                  headerLeft: () => null,
                  drawerActiveTintColor: theme.drawerActive,
                  drawerInactiveTintColor: theme.drawerInactive,
                  drawerActiveBackgroundColor: theme.drawerActiveBg,
                  drawerInactiveBackgroundColor: "transparent",
                  drawerItemStyle: {
                    borderRadius: 8,
                    marginHorizontal: 0,
                    marginVertical: 4,
                    paddingLeft: 0,
                  },
                  drawerLabelStyle: {
                    fontSize: 15,
                    fontWeight: "600",
                    marginLeft: -16,
                  },
                  overlayColor: "transparent",
                  sceneStyle: { backgroundColor: "transparent" },
                  headerStyle: {
                    backgroundColor: theme.headerBg,
                    borderColor: theme.headerBg,
                  },
                  headerTitleStyle: {
                    fontWeight: "bold",
                    fontSize: 24,
                    color: theme.text,
                  },
                  headerTintColor: theme.text,
                }}
              >
                <Drawer.Screen
                  name="index"
                  options={{
                    title: "Dashboard",
                    drawerIcon: ({ color }) => (
                      <LayoutDashboard
                        color={color}
                        size={25}
                        className="mr-2"
                      />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Dashboard
                      </Heading>
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                    headerLeft: () => (
                      <>
                        <LayoutDashboard
                          color={"white"}
                          style={{ marginLeft: 10 }}
                        />
                      </>
                    ),
                    headerRight: () => (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                      >
                        <LogOut size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ),
                  }}
                />
                <Drawer.Screen
                  name="reports"
                  options={{
                    title: "Report",
                    drawerIcon: ({ color }) => (
                      <NotepadText color={color} size={25} className="mr-2" />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Report
                      </Heading>
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                    headerLeft: () => (
                      <>
                        <NotepadText
                          color={"white"}
                          style={{ marginLeft: 10 }}
                        />
                      </>
                    ),
                    headerRight: () => (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                      >
                        <LogOut size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ),
                  }}
                />
                <Drawer.Screen
                  name="inventory"
                  options={{
                    title: "Inventory",
                    drawerIcon: ({ color }) => (
                      <Boxes color={color} size={25} className="mr-2" />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Inventory
                      </Heading>
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                    headerLeft: () => (
                      <>
                        <Boxes color={"white"} style={{ marginLeft: 10 }} />
                      </>
                    ),
                    headerRight: () => (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                      >
                        <LogOut size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ),
                  }}
                />
                <Drawer.Screen
                  name="users"
                  options={{
                    title: "Borrowers",
                    drawerIcon: ({ color }) => (
                      <UsersRound color={color} size={25} className="mr-2" />
                    ),
                    headerTitle: () => (
                      <Heading size="md" style={{ color: "white" }}>
                        Borrowers
                      </Heading>
                    ),
                    headerStyle: {
                      ...styles.headerSpace,
                      backgroundColor: theme.headerBg,
                    },
                    headerLeft: () => (
                      <>
                        <UsersRound
                          color={"white"}
                          style={{ marginLeft: 10 }}
                        />
                      </>
                    ),
                    headerRight: () => (
                      <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                      >
                        <LogOut size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ),
                  }}
                />
              </Drawer>
            </GluestackUIProvider>
          </UsersProvider>
        </RecordsProvider>
      </EquipmentProvider>
    </TransactionProvider>
  );
}

const styles = StyleSheet.create({
  headerSpace: {
    paddingTop: 16,
    paddingBottom: 16,
    alignContent: "center",
    alignItems: "center",
    height: 50,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginRight: 10,
  },
});
