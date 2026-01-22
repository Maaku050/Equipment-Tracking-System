// admin/_layout.tsx
import React from "react";
import { StyleSheet, View, Image, Text } from "react-native";
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
  NotepadText,
  Package,
  UsersRound,
} from "lucide-react-native";
import { Heading } from "@/components/ui/heading";
import { TransactionProvider } from "@/context/TransactionContext";
import { EquipmentProvider } from "@/context/EquipmentContext";

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

  return (
    <TransactionProvider>
      <EquipmentProvider>
        <GluestackUIProvider mode="light">
          <Drawer
            drawerContent={(props: any) => <CustomDrawerContent {...props} />}
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
                  <LayoutDashboard color={color} size={25} className="mr-2" />
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
                    <NotepadText color={"white"} style={{ marginLeft: 10 }} />
                  </>
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
                    <UsersRound color={"white"} style={{ marginLeft: 10 }} />
                  </>
                ),
              }}
            />
          </Drawer>
        </GluestackUIProvider>
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
});
