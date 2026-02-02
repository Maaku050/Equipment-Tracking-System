// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import { FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" })); // Increase limit for base64 images

// ============================================
// TYPES
// ============================================

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "student" | "staff" | "admin";
  course: string;
  contactNumber: string;
  imageBase64?: string; // Optional base64 encoded image
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Philippine format)
 */
function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+63|0)?9\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Upload image to Firebase Storage
 * @param imageBase64 Base64 encoded image string
 * @param uid User ID for file naming
 * @returns Public download URL
 */
async function uploadUserImage(
  imageBase64: string,
  uid: string,
): Promise<{ url: string; path: string }> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");

    // Detect image type from base64 header
    let contentType = "image/jpeg"; // default
    if (imageBase64.startsWith("/9j/")) {
      contentType = "image/jpeg";
    } else if (imageBase64.startsWith("iVBORw")) {
      contentType = "image/png";
    } else if (imageBase64.startsWith("R0lGOD")) {
      contentType = "image/gif";
    }

    // Get file extension
    const extension = contentType.split("/")[1];

    // Create file reference
    const bucket = storage.bucket();
    const fileName = `user-profiles/${uid}.${extension}`;
    const file = bucket.file(fileName);

    // Upload file
    await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          firebaseStorageDownloadTokens: uid,
        },
      },
      public: true,
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`✓ Image uploaded: ${publicUrl}`);
    return { url: publicUrl, path: fileName };
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    throw new Error("Failed to upload image");
  }
}

/**
 * Delete user image from Firebase Storage using path
 */
async function deleteUserImageByPath(imagePath: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    const file = bucket.file(imagePath);

    await file.delete();
    console.log(`✓ Deleted image: ${imagePath}`);
  } catch (error) {
    console.error("❌ Error deleting image:", error);
    // Don't throw - we want to continue even if delete fails
  }
}

/**
 * Delete user image from Firebase Storage
 */
async function deleteUserImage(uid: string): Promise<void> {
  try {
    const bucket = storage.bucket();
    const extensions = ["jpg", "jpeg", "png", "gif"];

    for (const ext of extensions) {
      const fileName = `user-profiles/${uid}.${ext}`;
      const file = bucket.file(fileName);

      try {
        await file.delete();
        console.log(`✓ Deleted image: ${fileName}`);
      } catch (error) {
        // File doesn't exist, continue
      }
    }
  } catch (error) {
    console.error("❌ Error deleting image:", error);
  }
}

/**
 * Create Firebase Auth user
 */
async function createAuthUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    console.log(`✓ Auth user created: ${userRecord.uid}`);
    return userRecord.uid;
  } catch (error) {
    console.error("❌ Error creating auth user:", error);
    throw error;
  }
}

/**
 * Save user data to Firestore
 */
async function saveUserToFirestore(
  uid: string,
  email: string,
  name: string,
  role: "student" | "staff" | "admin",
  course: string,
  contactNumber: string,
  imageUrl: string,
  imagePath: string, // Add this parameter
): Promise<void> {
  try {
    const userData = {
      uid,
      email,
      name,
      role,
      course,
      contactNumber,
      status: "active",
      imageUrl,
      imagePath, // Store the path
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    console.log("Saving user data to Firestore...", { uid, email, name });
    await db.collection("users").doc(uid).set(userData);
    console.log(`✓ User saved to Firestore: ${name} (${uid})`);
  } catch (error) {
    console.error("❌ Error saving to Firestore:", error);
    throw error;
  }
}

/**
 * Set custom claims for role-based access
 */
async function setUserClaims(
  uid: string,
  role: "student" | "staff" | "admin",
): Promise<void> {
  try {
    await auth.setCustomUserClaims(uid, { role });
    console.log(`✓ Custom claims set: ${role}`);
  } catch (error) {
    console.error("❌ Error setting custom claims:", error);
    throw error;
  }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /createUser
 * Create a new user account
 */
app.post("/createUser", async (req, res) => {
  console.log("=== Create New User ===");
  console.log("Request body:", {
    ...req.body,
    imageBase64: req.body.imageBase64 ? "[IMAGE DATA]" : undefined,
  });

  let createdUid: string | null = null;

  try {
    const { email, password, name, role, course, contactNumber, imageBase64 } =
      req.body as CreateUserRequest;

    // Validation (keeping existing validation code)
    if (!email || !password || !name || !role || !course || !contactNumber) {
      console.log("❌ Missing required fields");
      res.status(400).json({
        status: "error",
        message: "Missing required fields",
        required: [
          "email",
          "password",
          "name",
          "role",
          "course",
          "contactNumber",
        ],
      });
      return;
    }

    if (!isValidEmail(email)) {
      console.log("❌ Invalid email format");
      res.status(400).json({
        status: "error",
        message: "Invalid email format",
      });
      return;
    }

    if (password.length < 6) {
      console.log("❌ Password too short");
      res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters",
      });
      return;
    }

    if (!["student", "staff", "admin"].includes(role)) {
      console.log("❌ Invalid role");
      res.status(400).json({
        status: "error",
        message: "Invalid role. Must be: student, staff, or admin",
      });
      return;
    }

    if (!isValidPhoneNumber(contactNumber)) {
      console.log("❌ Invalid phone number");
      res.status(400).json({
        status: "error",
        message:
          "Invalid phone number format. Use Philippine format: +639XXXXXXXXX or 09XXXXXXXXX",
      });
      return;
    }

    // Check if user already exists
    try {
      await auth.getUserByEmail(email);
      console.log("❌ User already exists");
      res.status(409).json({
        status: "error",
        message: "User with this email already exists",
      });
      return;
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        console.error("❌ Error checking existing user:", error);
        throw error;
      }
    }

    // Create user
    console.log("Creating auth user...");
    const uid = await createAuthUser(email, password, name);
    createdUid = uid;

    // Upload image if provided
    let imageUrl = "";
    let imagePath = "";
    if (imageBase64) {
      console.log("Uploading user image...");
      try {
        const uploadResult = await uploadUserImage(imageBase64, uid);
        imageUrl = uploadResult.url;
        imagePath = uploadResult.path;
      } catch (error) {
        console.error("Failed to upload image, continuing without it");
      }
    }

    console.log("Saving to Firestore...");
    await saveUserToFirestore(
      uid,
      email,
      name,
      role,
      course,
      contactNumber,
      imageUrl,
      imagePath, // Pass the path
    );

    console.log("Setting custom claims...");
    await setUserClaims(uid, role);

    console.log("✅ User created successfully");
    res.status(201).json({
      status: "success",
      message: `User '${name}' registered successfully`,
      data: {
        uid,
        email,
        name,
        role,
        course,
        contactNumber,
        imageUrl,
        imagePath,
        status: "active",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error in createUser:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Rollback: Delete created auth user if exists
    if (createdUid) {
      try {
        await auth.deleteUser(createdUid);
        await deleteUserImage(createdUid);
        console.log("✓ Rolled back auth user and image");
      } catch (rollbackError) {
        console.error("Failed to rollback:", rollbackError);
      }
    }

    // Handle specific Firebase errors
    if (error instanceof Error) {
      const errorCode = (error as any).code;

      if (errorCode === "auth/email-already-exists") {
        res.status(409).json({
          status: "error",
          message: "Email already exists",
        });
        return;
      }

      if (errorCode === "auth/invalid-password") {
        res.status(400).json({
          status: "error",
          message: "Invalid password format",
        });
        return;
      }
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create user",
      error: error instanceof Error ? error.message : "Unknown error",
      details: (error as any)?.code || undefined,
    });
  }
});

/**
 * POST /createBulkUsers
 * Create multiple users at once
 */
app.post("/createBulkUsers", async (req, res) => {
  console.log("=== Create Bulk Users ===");

  try {
    const { users } = req.body as { users: CreateUserRequest[] };

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({
        status: "error",
        message: "Invalid request. Provide array of users.",
      });
      return;
    }

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const user of users) {
      try {
        const uid = await createAuthUser(user.email, user.password, user.name);

        let imageUrl = "";
        let imagePath = "";
        if (user.imageBase64) {
          try {
            const uploadResult = await uploadUserImage(user.imageBase64, uid);
            imageUrl = uploadResult.url;
            imagePath = uploadResult.path;
          } catch (error) {
            console.error(
              `Failed to upload image for ${user.email}, continuing without it`,
            );
          }
        }

        await saveUserToFirestore(
          uid,
          user.email,
          user.name,
          user.role,
          user.course,
          user.contactNumber,
          imageUrl,
          imagePath, // Pass the path
        );
        await setUserClaims(uid, user.role);

        results.successful.push(user.email);
      } catch (error) {
        results.failed.push({
          email: user.email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      status: "success",
      message: `Processed ${users.length} users`,
      data: {
        total: users.length,
        successful: results.successful.length,
        failed: results.failed.length,
        successfulUsers: results.successful,
        failedUsers: results.failed,
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create bulk users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /getUser/:uid
 * Get user by UID
 */
app.get("/getUser/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({
        status: "error",
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      status: "success",
      data: {
        uid: userDoc.id,
        ...userDoc.data(),
      },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /updateUser/:uid
 * Update user data
 */
app.patch("/updateUser/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { imageBase64, ...updates } = req.body;

    // Don't allow updating uid or createdAt
    delete updates.uid;
    delete updates.createdAt;

    // Upload new image if provided
    if (imageBase64) {
      console.log("Uploading new user image...");
      try {
        // Get current user data to find old image path
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();

        // Delete old image using stored path (if exists)
        if (userData?.imagePath) {
          await deleteUserImageByPath(userData.imagePath);
        }

        // Upload new image
        const uploadResult = await uploadUserImage(imageBase64, uid);
        updates.imageUrl = uploadResult.url;
        updates.imagePath = uploadResult.path;
      } catch (error) {
        console.error("Failed to update image");
        throw new Error("Failed to update image");
      }
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await db.collection("users").doc(uid).update(updates);

    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      data: { uid, updates },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /deleteUser/:uid
 * Delete user (Auth + Firestore + Storage)
 */
app.delete("/deleteUser/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // Get user data to find image path
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    // Delete from Auth
    await auth.deleteUser(uid);

    // Delete image from Storage using stored path
    if (userData?.imagePath) {
      await deleteUserImageByPath(userData.imagePath);
    } else {
      // Fallback to old method if path not stored
      await deleteUserImage(uid);
    }

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();

    res.status(200).json({
      status: "success",
      message: "User deleted successfully",
      data: { uid },
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================
// EXPORT CLOUD FUNCTION
// ============================================

export const userManagement = functions.https.onRequest(app);
