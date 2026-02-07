// app/admin/users.tsx | Borrowers Interface
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Plus, Search, Printer, PrinterIcon } from "lucide-react-native";
import React, { useState } from "react";
import {
  Text,
  ScrollView,
  TouchableOpacity,
  View,
  Platform,
  StyleSheet,
} from "react-native";
import { Grid, GridItem } from "@/components/ui/grid";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Badge, BadgeText } from "@/components/ui/badge";
import AddUserModal from "@/_modals/addUserModal";
import UserDetailsModal from "@/_modals/userDetailsModal";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import { useUsers } from "@/context/UsersContext";
import { Center } from "@/components/ui/center";
import { useEffect, useMemo } from "react";
import { db } from "@/firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import AdminGuard from "@/components/AdminGuard";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

export default function UsersInterface() {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userFines, setUserFines] = useState<Record<string, number>>({});
  const [loadingFines, setLoadingFines] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Use the Users Context instead of local state
  const { users, loading, error, refreshUsers } = useUsers();

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      return (
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.course?.toLowerCase().includes(query) ||
        user.contactNumber?.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const handleCardPress = (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleDetailsClose = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
  };

  const handleUserUpdate = () => {
    // Refresh users list after update
    if (refreshUsers) {
      refreshUsers();
    }
  };

  useEffect(() => {
    if (!users || users.length === 0) return;

    const loadFines = async () => {
      try {
        setLoadingFines(true);

        const finesEntries = await Promise.all(
          users.map(async (user) => {
            const fine = await fetchUserFines(user.uid);
            return [user.uid, fine] as const;
          }),
        );

        const finesMap = Object.fromEntries(finesEntries);
        setUserFines(finesMap);
      } catch (error) {
        console.error("Error fetching user fines:", error);
      } finally {
        setLoadingFines(false);
      }
    };

    loadFines();
  }, [users]);

  const fetchUserFines = async (userId: string): Promise<number> => {
    const recordsQuery = query(
      collection(db, "records"),
      where("studentId", "==", userId),
    );

    const snapshot = await getDocs(recordsQuery);

    let totalFine = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fineAmount && data.fineAmount > 0) {
        totalFine += data.fineAmount;
      }
    });

    return totalFine;
  };

  const handlePrint = () => {
    if (Platform.OS === "web") {
      const printContent = generatePrintHTML();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const generatePrintHTML = () => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const usersToPrint = searchQuery.trim() ? filteredUsers : users;

    const usersCardsHTML = usersToPrint
      .map(
        (user) => `
        <div class="user-card">
          <img 
            src="${user.imageUrl || "https://imgs.search.brave.com/D7Fi54QiF7gpiUdo8Jg_FimmtbGGz8iKZf4U51dGGTk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMjE2/ODc3NDExMS92ZWN0/b3IvYXZhdGFyLW9y/LXBlcnNvbi1zaWdu/LXByb2ZpbGUtcGlj/dHVyZS1wb3J0cmFp/dC1pY29uLXVzZXIt/cHJvZmlsZS1zeW1i/b2wuanBnP3M9NjEy/eDYxMiZ3PTAmaz0y/MCZjPTZxdzFMUkc1/M3owMFJYSm5WS1FD/NThXN1huVzJnZFFm/R0JJUjQzRTk3T2M9"}" 
            alt="${user.name}"
            class="user-image"
          />
          <h3 class="user-name">${user.name}</h3>
          <p class="user-email">${user.email}</p>
          ${user.contactNumber ? `<p class="user-detail">📱 ${user.contactNumber}</p>` : ""}
          ${user.course ? `<p class="user-detail">📚 ${user.course}</p>` : ""}
          <div class="badges">
            <span class="badge ${user.status === "active" ? "badge-success" : "badge-error"}">
              ${user.status === "active" ? "✓ ACTIVE" : "✕ INACTIVE"}
            </span>
          </div>
          ${userFines[user.uid] > 0 ? `<p class="user-fines">💸 Fines: ₱${userFines[user.uid].toFixed(2)}</p>` : ""}
        </div>
      `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Students Report - ${currentDate}</title>
        <style>
          @media print {
            body { margin: 0; }
            @page { 
              margin: 0.5cm;
              size: landscape;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 15px;
            margin: 0;
            line-height: 1.3;
            color: #1f2937;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 15px;
          }
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: #1f2937;
          }
          .header p {
            margin: 3px 0;
            color: #6b7280;
            font-size: 12px;
          }
          .users-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-top: 15px;
          }
          .user-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            page-break-inside: avoid;
            text-align: center;
          }
          .user-image {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 4px;
            margin-bottom: 8px;
            background-color: #f3f4f6;
          }
          .user-name {
            font-size: 13px;
            font-weight: 600;
            margin: 0 0 6px 0;
            color: #111827;
            line-height: 1.2;
          }
          .user-email {
            font-size: 10px;
            color: #6b7280;
            margin: 0 0 6px 0;
            word-break: break-all;
          }
          .user-detail {
            font-size: 10px;
            color: #374151;
            margin: 2px 0;
          }
          .badges {
            display: flex;
            justify-content: center;
            gap: 4px;
            margin: 8px 0;
          }
          .badge {
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 9px;
            font-weight: 600;
            color: white;
          }
          .badge-success {
            background-color: #10b981;
          }
          .badge-error {
            background-color: #ef4444;
          }
          .user-fines {
            font-size: 10px;
            font-weight: 600;
            color: #ef4444;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Students Report</h1>
          <p>Generated on ${currentDate}</p>
          <p>Total Students: ${usersToPrint.length}</p>
          ${searchQuery.trim() ? `<p style="font-style: italic;">Search Filter: "${searchQuery}"</p>` : ""}
        </div>
        
        <div class="users-grid">
          ${usersCardsHTML}
        </div>
      </body>
      </html>
    `;
  };

  // Show loading spinner
  if (loading) {
    return (
      <Center className="flex-1">
        <Spinner size="large" />
      </Center>
    );
  }

  // Show error message
  if (error) {
    return (
      <Center className="flex-1">
        <Text className="text-error-500">{error}</Text>
      </Center>
    );
  }

  return (
    <AdminGuard>
      <ScrollView style={{ padding: 15 }}>
        {/* Search Bar and Print Button */}
        <View className="mb-4" style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Input variant="outline" size="md">
              <InputSlot className="pl-3">
                <InputIcon as={Search} />
              </InputSlot>
              <InputField
                placeholder="Search by name, email, course, or contact..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </Input>
          </View>
          <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
            disabled={loading || users.length === 0}
          >
            <PrinterIcon size={20} color="#ffffff" />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>
        </View>

        {users.length === 0 ? (
          <Center className="flex-1 py-20">
            <Text className="text-typography-500 text-lg">No users found</Text>
            <Button
              size="sm"
              onPress={() => setShowAddUserModal(true)}
              className="mt-4"
            >
              <ButtonIcon as={Plus} />
              <ButtonText>Add First Student</ButtonText>
            </Button>
          </Center>
        ) : filteredUsers.length === 0 ? (
          <Center className="flex-1 py-20">
            <Text className="text-typography-500 text-lg">
              No users match your search
            </Text>
            <Text className="text-typography-400 text-sm mt-2">
              Try a different search term
            </Text>
          </Center>
        ) : (
          <Grid
            className="gap-y-1 gap-x-1"
            _extra={{
              className: "grid-cols-4",
            }}
          >
            {filteredUsers.map((user) => (
              <GridItem
                key={user.uid}
                _extra={{
                  className: "col-span-3 md:col-span-1",
                }}
              >
                <TouchableOpacity
                  onPress={() => handleCardPress(user)}
                  activeOpacity={0.7}
                >
                  <Card className="p-5 rounded-lg max-w-[360px] m-3 hover:shadow-lg transition-shadow">
                    <Image
                      source={{
                        uri:
                          user.imageUrl ||
                          "https://imgs.search.brave.com/D7Fi54QiF7gpiUdo8Jg_FimmtbGGz8iKZf4U51dGGTk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5pc3RvY2twaG90/by5jb20vaWQvMjE2/ODc3NDExMS92ZWN0/b3IvYXZhdGFyLW9y/LXBlcnNvbi1zaWdu/LXByb2ZpbGUtcGlj/dHVyZS1wb3J0cmFp/dC1pY29uLXVzZXIt/cHJvZmlsZS1zeW1i/b2wuanBnP3M9NjEy/eDYxMiZ3PTAmaz0y/MCZjPTZxdzFMUkc1/M3owMFJYSm5WS1FD/NThXN1huVzJnZFFm/R0JJUjQzRTk3T2M9",
                      }}
                      className="mb-6 h-[240px] w-full rounded-md aspect-[263/240]"
                      alt={user.name}
                      style={{ backgroundColor: "#f3f4f6" }}
                    />
                    <Heading size="md" className="mb-4">
                      {user.name}
                    </Heading>
                    <Text className="text-sm font-normal mb-2 text-typography-700">
                      {user.email}
                    </Text>
                    {user.contactNumber && (
                      <Text className="text-sm text-typography-600 mb-1">
                        📱 {user.contactNumber}
                      </Text>
                    )}
                    {user.course && (
                      <Text className="text-sm text-typography-600 mb-1">
                        📚 {user.course}
                      </Text>
                    )}

                    {/* Status Badge */}
                    <View className="mt-3 mb-2">
                      <Badge
                        variant="solid"
                        action={user.status === "active" ? "success" : "error"}
                        size="sm"
                      >
                        <BadgeText>
                          {user.status === "active" ? "✓ ACTIVE" : "✕ INACTIVE"}
                        </BadgeText>
                      </Badge>
                    </View>

                    {userFines[user.uid] > 0 && (
                      <Text className="text-sm font-semibold text-error-600 mt-2">
                        💸 Fines: ₱{userFines[user.uid].toFixed(2)}
                      </Text>
                    )}

                    {loadingFines && (
                      <Text className="text-xs text-typography-400 mt-1">
                        Calculating fines…
                      </Text>
                    )}
                  </Card>
                </TouchableOpacity>
              </GridItem>
            ))}
          </Grid>
        )}

        {/* Add User Modal */}
        <AddUserModal
          visible={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            setShowAddUserModal(false);
            if (refreshUsers) {
              refreshUsers();
            }
          }}
        />

        {/* User Details Modal */}
        <UserDetailsModal
          visible={showDetailsModal}
          user={selectedUser}
          onClose={handleDetailsClose}
          onUpdate={handleUserUpdate}
        />
      </ScrollView>

      <Fab
        size="sm"
        placement="bottom right"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
        onPress={() => setShowAddUserModal(true)}
      >
        <FabIcon as={Plus} />
        <FabLabel>Add Student</FabLabel>
      </Fab>
    </AdminGuard>
  );
}

const styles = StyleSheet.create({
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  printButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});
