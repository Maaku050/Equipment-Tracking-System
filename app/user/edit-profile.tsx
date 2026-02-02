// app/user/edit-profile.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  Text,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { router } from "expo-router";
import { auth, db, storage } from "@/firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react-native";
import { useUsers } from "@/context/UsersContext";

export default function EditProfileScreen() {
  const currentUser = auth.currentUser;
  const { getUserByUid } = useUsers();
  const studentData = currentUser ? getUserByUid(currentUser.uid) : null;

  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (studentData) {
      setName(studentData.name);
      setCourse(studentData.course || "");
      setContactNumber(studentData.contactNumber || "");
      setImageUri(studentData.imageUrl || null);
    }
  }, [studentData]);

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (course && course.trim().length < 2) {
      newErrors.course = "Course name must be at least 2 characters";
    }

    if (contactNumber) {
      if (!/^(\+63|0)?9\d{9}$/.test(contactNumber)) {
        newErrors.contactNumber = "Invalid phone number format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (
    uri: string,
    userId: string,
  ): Promise<{ url: string; path: string }> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const path = `user-profiles/${userId}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return { url: downloadURL, path };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const deleteOldImage = async (imagePath: string) => {
    try {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log("Old image deleted successfully");
    } catch (error) {
      console.error("Error deleting old image:", error);
      // Don't throw - continue even if delete fails
    }
  };

  const handleSave = async () => {
    if (!currentUser || !studentData) {
      Alert.alert("Error", "User not found");
      return;
    }

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      let imageUrl = studentData.imageUrl || "";
      let imagePath = studentData.imagePath;

      // Upload new image if changed
      if (imageUri && imageUri !== studentData.imageUrl) {
        // Delete old image if path exists
        if (studentData.imagePath) {
          await deleteOldImage(studentData.imagePath);
        }

        // Upload new image
        const uploadResult = await uploadImage(imageUri, currentUser.uid);
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
      }

      // Update Firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        name,
        course,
        contactNumber,
        imageUrl,
        imagePath, // Store the path
        updatedAt: new Date(),
      });

      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !studentData) {
    return (
      <Box style={styles.centerContainer}>
        <Text style={styles.errorText}>User not found</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      {/* Header */}
      <Box style={styles.header}>
        <HStack style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <ArrowLeft size={24} color="#1f2937" />
            <Heading size="lg" style={{ marginLeft: 10 }}>
              Edit Profile
            </Heading>
          </TouchableOpacity>
        </HStack>
      </Box>

      <ScrollView style={styles.scrollView}>
        <VStack style={styles.content}>
          {/* Profile Image */}
          <VStack style={{ alignItems: "center", gap: 16 }}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={{
                  uri:
                    imageUri ||
                    "https://via.placeholder.com/150/cccccc/ffffff?text=No+Image",
                }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
            <Button variant="outline" onPress={pickImage}>
              <ButtonText>Change Photo</ButtonText>
            </Button>
          </VStack>

          {/* Email (Read-only) */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Email Address</Text>
            <Box style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{studentData.email}</Text>
            </Box>
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </VStack>

          {/* Name */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Full Name *</Text>
            <Input isInvalid={!!errors.name}>
              <InputField
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors({ ...errors, name: "" });
                }}
                placeholder="Enter your full name"
              />
            </Input>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </VStack>

          {/* Course */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Course</Text>
            <Input isInvalid={!!errors.course}>
              <InputField
                value={course}
                onChangeText={(text) => {
                  setCourse(text);
                  setErrors({ ...errors, course: "" });
                }}
                placeholder="e.g., Computer Science"
              />
            </Input>
            {errors.course && (
              <Text style={styles.errorText}>{errors.course}</Text>
            )}
          </VStack>

          {/* Contact Number */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Contact Number</Text>
            <Input isInvalid={!!errors.contactNumber}>
              <InputField
                value={contactNumber}
                onChangeText={(text) => {
                  setContactNumber(text);
                  setErrors({ ...errors, contactNumber: "" });
                }}
                placeholder="+639123456789"
                keyboardType="phone-pad"
              />
            </Input>
            {errors.contactNumber && (
              <Text style={styles.errorText}>{errors.contactNumber}</Text>
            )}
            <Text style={styles.helperText}>
              Format: +639XXXXXXXXX or 09XXXXXXXXX
            </Text>
          </VStack>

          {/* Role (Read-only) */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Role</Text>
            <Box style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>
                {studentData.role.charAt(0).toUpperCase() +
                  studentData.role.slice(1)}
              </Text>
            </Box>
          </VStack>

          {/* Status (Read-only) */}
          <VStack style={{ gap: 8 }}>
            <Text style={styles.label}>Status</Text>
            <Box style={styles.readOnlyField}>
              <Text
                style={[
                  styles.readOnlyText,
                  studentData.status === "active" && styles.activeStatus,
                ]}
              >
                {studentData.status.charAt(0).toUpperCase() +
                  studentData.status.slice(1)}
              </Text>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Action Buttons */}
      <Box style={styles.footer}>
        <HStack style={{ gap: 12 }}>
          <Button
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => router.back()}
            disabled={loading}
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button style={{ flex: 1 }} onPress={handleSave} disabled={loading}>
            <ButtonText>{loading ? "Saving..." : "Save Changes"}</ButtonText>
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingTop: 10,
    paddingLeft: 5,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#2563eb",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  helperText: {
    fontSize: 12,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
  },
  readOnlyField: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  readOnlyText: {
    fontSize: 14,
    color: "#6b7280",
  },
  activeStatus: {
    color: "#10b981",
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
});
