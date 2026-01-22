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

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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
      imageUrl: "",
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
  console.log("Request body:", req.body);

  try {
    const { email, password, name, role, course, contactNumber } =
      req.body as CreateUserRequest;

    // Validation
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
      // If user doesn't exist, continue
      if (error.code !== "auth/user-not-found") {
        console.error("❌ Error checking existing user:", error);
        throw error;
      }
    }

    // Create user
    console.log("Creating auth user...");
    const uid = await createAuthUser(email, password, name);

    console.log("Saving to Firestore...");
    await saveUserToFirestore(uid, email, name, role, course, contactNumber);

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
        await saveUserToFirestore(
          uid,
          user.email,
          user.name,
          user.role,
          user.course,
          user.contactNumber,
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
    const updates = req.body;

    // Don't allow updating uid or createdAt
    delete updates.uid;
    delete updates.createdAt;

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
 * Delete user (Auth + Firestore)
 */
app.delete("/deleteUser/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // Delete from Auth
    await auth.deleteUser(uid);

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
