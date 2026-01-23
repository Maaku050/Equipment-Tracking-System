// admin/users.tsx
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Plus } from "lucide-react-native";
import React, { useState } from "react";
import { Text, ScrollView, TouchableOpacity } from "react-native";
import { Grid, GridItem } from "@/components/ui/grid";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import AddUserModal from "@/_modals/addUserModal";
import UserDetailsModal from "@/_modals/userDetailsModal";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import { useUsers } from "@/context/UsersContext";
import { Center } from "@/components/ui/center";
import { useEffect } from "react";
import { db } from "@/firebase/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function UsersInterface() {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userFines, setUserFines] = useState<Record<string, number>>({});
  const [loadingFines, setLoadingFines] = useState(false);

  // Use the Users Context instead of local state
  const { users, loading, error, refreshUsers } = useUsers();

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
    <>
      <ScrollView style={{ padding: 15 }}>
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
        ) : (
          <Grid
            className="gap-y-1 gap-x-1"
            _extra={{
              className: "grid-cols-4",
            }}
          >
            {users.map((user) => (
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
                          "https://via.placeholder.com/240/cccccc/ffffff?text=No+Image",
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
                    {/* <Text className="text-xs text-typography-500 mt-2 capitalize">
                      {user.role} • {user.status}
                    </Text> */}
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
        placement="top right"
        isHovered={false}
        isDisabled={false}
        isPressed={false}
        onPress={() => setShowAddUserModal(true)}
      >
        <FabIcon as={Plus} />
        <FabLabel>Add Student</FabLabel>
      </Fab>
    </>
  );
}
