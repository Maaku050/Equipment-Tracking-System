import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Plus } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Text, View, ScrollView, Alert } from "react-native";
import { User } from "@/_helpers/firebaseHelpers";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";
import { Grid, GridItem } from "@/components/ui/grid";
import { Card } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import AddUserModal from "@/_modals/addUserModal";
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab";
import { AddIcon } from "@/components/ui/icon";

export default function UsersInterface() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);

      const fetchedUsers: User[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          uid: doc.id, // map id → uid
          email: data.email as string,
          name: data.name as string,
          role: data.role ?? "student", // default if missing
          course: data.course as string,
          contactNumber: data.contactNumber as string,
          status: data.status ?? "active",
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      setUsers(fetchedUsers);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      Alert.alert("Error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView style={{ padding: 15 }}>
        {/* <Box
          style={{
            alignItems: "flex-end",
            borderWidth: 0,
            borderColor: "red",
          }}
        >
          <Button size="sm" onPress={() => setShowAddUserModal(true)}>
            <ButtonIcon as={Plus} />
            <ButtonText>Add a student</ButtonText>
          </Button>
        </Box> */}

        {!users || users.length === 0 ? (
          <Spinner />
        ) : (
          <Grid
            className="gap-y-1 gap-x-1"
            _extra={{
              className: "grid-cols-4",
            }}
          >
            {users.map((t) => (
              <GridItem
                key={t.id}
                _extra={{
                  className: "col-span-3 md:col-span-1",
                }}
              >
                <Card className="p-5 rounded-lg max-w-[360px] m-3">
                  <Image
                    source={{
                      uri:
                        t.imageUrl ||
                        "https://imgs.search.brave.com/Phs4SaVGkpkAX3vKTiKToN0MPPFYHPPYJJsgZZ4BvNQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMDUv/NzIwLzQwOC9zbWFs/bC9jcm9zc2VkLWlt/YWdlLWljb24tcGlj/dHVyZS1ub3QtYXZh/aWxhYmxlLWRlbGV0/ZS1waWN0dXJlLXN5/bWJvbC1mcmVlLXZl/Y3Rvci5qcGc",
                    }}
                    className="mb-6 h-[240px] w-full rounded-md aspect-[263/240]"
                    alt={t.name}
                  />
                  <Heading size="md" className="mb-4">
                    {t.name}
                  </Heading>
                  <Text className="text-sm font-normal mb-2 text-typography-700">
                    {t.email}
                  </Text>

                  <Text className="text-sm text-typography-600">
                    {t.contactNumber}
                  </Text>
                </Card>
              </GridItem>
            ))}
          </Grid>
        )}

        <AddUserModal
          visible={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={fetchUsers}
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
