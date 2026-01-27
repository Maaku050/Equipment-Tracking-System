// _helpers/firebaseHelpers.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BorrowedItem {
  id: string;
  equipmentId: string;
  itemName: string;
  quantity: number;
  pricePerQuantity: number;
  returned: boolean;
  returnedQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  damageNotes: string;
}

export type TransactionStatus =
  | "Request"
  | "Ongoing"
  | "Overdue"
  | "Incomplete"
  | "Incomplete and Overdue"
  | "Complete"
  | "Complete and Overdue"
  | "All";

export interface Transaction {
  transactionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  items: BorrowedItem[];
  borrowedDate: Timestamp;
  dueDate: Timestamp;
  status: TransactionStatus;
  totalPrice: number;
  fineAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Equipment {
  name: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  borrowedQuantity: number;
  pricePerUnit: number;
  condition: "good" | "fair" | "needs repair";
  status: "available" | "unavailable" | "maintenance";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: "student" | "staff" | "admin";
  course: string;
  contactNumber: string;
  status: "active" | "suspended" | "inactive";
  imageUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determines the correct status based on transaction state and due date
 */
export const determineTransactionStatus = (
  items: BorrowedItem[],
  dueDate: Date,
  currentStatus: TransactionStatus,
): TransactionStatus => {
  const now = new Date();
  const isOverdue = now > dueDate;

  // Check if all items are fully returned
  const allReturned = items.every(
    (item) => item.returned && item.returnedQuantity === item.quantity,
  );

  // Check if any items are partially returned
  const someReturned = items.some(
    (item) =>
      item.returnedQuantity > 0 && item.returnedQuantity < item.quantity,
  );

  // If this is a request, don't change status based on due date
  if (currentStatus === "Request") {
    return "Request";
  }

  // Determine status based on return state and due date
  if (allReturned) {
    return isOverdue ? "Complete and Overdue" : "Complete";
  } else if (someReturned || items.some((item) => item.returnedQuantity > 0)) {
    return isOverdue ? "Incomplete and Overdue" : "Incomplete";
  } else {
    return isOverdue ? "Overdue" : "Ongoing";
  }
};

/**
 * Calculate the total fine amount based on days overdue
 * @param dueDate - The original due date
 * @param currentDate - The current date (defaults to now)
 * @param finePerDay - Fine amount per day (defaults to 10)
 * @returns Total fine amount
 */
export const calculateOverdueFine = (
  dueDate: Date,
  currentDate: Date = new Date(),
  finePerDay: number = 10,
): number => {
  // If not overdue, no fine
  if (currentDate < dueDate) {
    return 0;
  }

  // Calculate days overdue (rounded up to include partial days)
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diffInMilliseconds = currentDate.getTime() - dueDate.getTime();
  const daysOverdue = Math.ceil(diffInMilliseconds / millisecondsPerDay);

  // Calculate total fine
  return daysOverdue * finePerDay;
};

/**
 * Updates all transaction statuses and fines based on current date
 * This should be called periodically or on app load
 */
export const updateOverdueTransactions = async () => {
  try {
    const transactionsRef = collection(db, "transactions");
    const snapshot = await getDocs(transactionsRef);
    const batch = writeBatch(db);
    let updatedCount = 0;

    const now = new Date();

    for (const docSnap of snapshot.docs) {
      const transaction = docSnap.data() as Transaction;
      const dueDate = transaction.dueDate.toDate();

      // Calculate what the status should be
      const correctStatus = determineTransactionStatus(
        transaction.items,
        dueDate,
        transaction.status,
      );

      // Calculate the correct fine amount based on days overdue
      const correctFineAmount = calculateOverdueFine(dueDate, now, 10);

      // Check if we need to update status or fine amount
      const needsStatusUpdate = correctStatus !== transaction.status;
      const needsFineUpdate =
        correctFineAmount !== (transaction.fineAmount || 0);

      // Only update if something has changed
      if (needsStatusUpdate || needsFineUpdate) {
        const transactionRef = doc(db, "transactions", docSnap.id);
        const updates: any = {
          updatedAt: Timestamp.now(),
        };

        if (needsStatusUpdate) {
          updates.status = correctStatus;
        }

        if (needsFineUpdate) {
          updates.fineAmount = correctFineAmount;
        }

        batch.update(transactionRef, updates);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return updatedCount;
  } catch (error) {
    console.error("Error updating overdue transactions:", error);
    throw error;
  }
};

/**
 * Optional: Query only potentially overdue transactions for better performance
 * Use this if you have a large number of transactions
 */
export const updateOverdueTransactionsOptimized = async () => {
  try {
    const transactionsRef = collection(db, "transactions");

    // Query only transactions that are not completed and might be overdue
    const q = query(
      transactionsRef,
      where("status", "in", [
        "Ongoing",
        "Incomplete",
        "Overdue",
        "Incomplete and Overdue",
      ]),
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let updatedCount = 0;

    const now = new Date();

    for (const docSnap of snapshot.docs) {
      const transaction = docSnap.data() as Transaction;
      const dueDate = transaction.dueDate.toDate();

      const correctStatus = determineTransactionStatus(
        transaction.items,
        dueDate,
        transaction.status,
      );

      const correctFineAmount = calculateOverdueFine(dueDate, now, 10);

      const needsStatusUpdate = correctStatus !== transaction.status;
      const needsFineUpdate =
        correctFineAmount !== (transaction.fineAmount || 0);

      if (needsStatusUpdate || needsFineUpdate) {
        const transactionRef = doc(db, "transactions", docSnap.id);
        const updates: any = {
          updatedAt: Timestamp.now(),
        };

        if (needsStatusUpdate) {
          updates.status = correctStatus;
        }

        if (needsFineUpdate) {
          updates.fineAmount = correctFineAmount;
        }

        batch.update(transactionRef, updates);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return updatedCount;
  } catch (error) {
    console.error("Error updating overdue transactions:", error);
    throw error;
  }
};

// ============================================
// USER FUNCTIONS
// ============================================

export const createUser = async (
  userData: Omit<User, "createdAt" | "updatedAt">,
) => {
  try {
    const userRef = doc(db, "users", userData.uid);
    await updateDoc(userRef, {
      ...userData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return userRef.id;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const getUser = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User & { id: string };
    }
    return null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
};

// ============================================
// EQUIPMENT FUNCTIONS
// ============================================

export const createEquipment = async (
  equipmentData: Omit<Equipment, "createdAt" | "updatedAt">,
) => {
  try {
    const docRef = await addDoc(collection(db, "equipment"), {
      ...equipmentData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating equipment:", error);
    throw error;
  }
};

export const updateEquipmentQuantities = async (
  equipmentId: string,
  quantityChange: number,
) => {
  try {
    const equipmentRef = doc(db, "equipment", equipmentId);
    const equipmentSnap = await getDoc(equipmentRef);

    if (equipmentSnap.exists()) {
      const data = equipmentSnap.data() as Equipment;

      await updateDoc(equipmentRef, {
        availableQuantity: data.availableQuantity + quantityChange,
        borrowedQuantity: data.borrowedQuantity - quantityChange,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Error updating equipment quantities:", error);
    throw error;
  }
};

export const getAllEquipment = async () => {
  try {
    const equipmentRef = collection(db, "equipment");
    const snapshot = await getDocs(equipmentRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (Equipment & { id: string })[];
  } catch (error) {
    console.error("Error getting equipment:", error);
    throw error;
  }
};

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

export const createTransaction = async (
  studentId: string,
  studentName: string,
  studentEmail: string,
  selectedEquipment: {
    equipmentId: string;
    name: string;
    quantity: number;
    pricePerUnit: number;
  }[],
  isAdminCreated: boolean = false,
  dueDate: Date,
) => {
  try {
    const batch = writeBatch(db);

    // Generate unique transaction ID
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
    const timeStr = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
    const transactionId = `TXN-${dateStr}-${timeStr}`;

    const items: BorrowedItem[] = selectedEquipment.map((equipment, index) => ({
      id: `item-${Date.now()}-${index}`,
      equipmentId: equipment.equipmentId,
      itemName: equipment.name,
      quantity: equipment.quantity,
      pricePerQuantity: equipment.pricePerUnit,
      returned: false,
      returnedQuantity: 0,
      damagedQuantity: 0,
      lostQuantity: 0,
      damageNotes: "",
    }));

    const totalPrice = items.reduce(
      (sum, item) => sum + item.pricePerQuantity * item.quantity,
      0,
    );

    // const dueDate = new Date();
    // dueDate.setDate(dueDate.getDate() + 7);

    const transactionData: Transaction = {
      transactionId, // Add the generated transaction ID
      studentId,
      studentName,
      studentEmail,
      items,
      borrowedDate: Timestamp.now(),
      dueDate: Timestamp.fromDate(dueDate),
      status: isAdminCreated ? "Ongoing" : "Request",
      totalPrice,
      fineAmount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const transactionRef = await addDoc(
      collection(db, "transactions"),
      transactionData,
    );

    // Update equipment quantities (reserve for both Request and Ongoing)
    for (const equipment of selectedEquipment) {
      const equipmentRef = doc(db, "equipment", equipment.equipmentId);
      const equipmentSnap = await getDoc(equipmentRef);

      if (equipmentSnap.exists()) {
        const data = equipmentSnap.data() as Equipment;
        batch.update(equipmentRef, {
          availableQuantity: data.availableQuantity - equipment.quantity,
          borrowedQuantity: data.borrowedQuantity + equipment.quantity,
          updatedAt: Timestamp.now(),
        });
      }
    }

    await batch.commit();
    return { id: transactionRef.id, transactionId };
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};

export const approveTransaction = async (transactionId: string) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const snap = await getDoc(transactionRef);

    if (!snap.exists()) throw new Error("Transaction not found");

    const transaction = snap.data() as Transaction;

    // Update transaction
    await updateDoc(transactionRef, {
      status: "Ongoing",
      borrowedDate: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Build equipment list
    const equipmentList = transaction.items
      .map((i) => `<li>${i.itemName} (Qty: ${i.quantity})</li>`)
      .join("");

    // Create notification
    const notificationRef = doc(collection(db, "notifications"));
    await setDoc(notificationRef, {
      to: transaction.studentEmail,
      message: {
        subject: "✅ Equipment Request Approved",
        text: `Hi ${transaction.studentName},

Your equipment request has been APPROVED and is now ready for pickup.

Items:
${transaction.items.map((i) => `- ${i.itemName} (Qty: ${i.quantity})`).join("\n")}

Transaction ID: ${transactionId}

Please collect the items and return them on or before the due date.

Thank you!`,
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto; background:#f9fafb; padding:20px;">
            <div style="background:white; padding:30px; border-radius:8px;">
              <h2 style="color:#16a34a;">✅ Equipment Request Approved</h2>
              <p>Hi <strong>${transaction.studentName}</strong>,</p>
              <p>Your request has been <strong>approved</strong>. The following items are ready for pickup:</p>
              <ul style="background:#ecfdf5; padding:15px 15px 15px 35px; border-radius:4px;">
                ${equipmentList}
              </ul>
              <p><strong>Transaction ID:</strong> <code>${transactionId}</code></p>
              <p>Please return the equipment on or before the due date to avoid penalties.</p>
              <hr>
              <p style="font-size:12px;color:#6b7280;">Automated message from eLabTrack System.</p>
            </div>
          </div>
        `,
      },
      userId: transaction.studentId,
      type: "transaction_approved",
      transactionId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error approving transaction:", error);
    throw error;
  }
};

export const denyTransaction = async (transactionId: string) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const snap = await getDoc(transactionRef);

    if (!snap.exists()) return;

    const transaction = snap.data() as Transaction;
    const batch = writeBatch(db);

    // Return quantities to equipment
    for (const item of transaction.items) {
      const equipmentRef = doc(db, "equipment", item.equipmentId);
      const equipmentSnap = await getDoc(equipmentRef);

      if (equipmentSnap.exists()) {
        const equipmentData = equipmentSnap.data() as Equipment;

        batch.update(equipmentRef, {
          availableQuantity: equipmentData.availableQuantity + item.quantity,
          borrowedQuantity: equipmentData.borrowedQuantity - item.quantity,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Create notification
    const equipmentList = transaction.items
      .map((i) => `<li>${i.itemName} (Qty: ${i.quantity})</li>`)
      .join("");

    const notificationRef = doc(collection(db, "notifications"));
    batch.set(notificationRef, {
      to: transaction.studentEmail,
      message: {
        subject: "❌ Equipment Request Denied",
        text: `Hi ${transaction.studentName},

Unfortunately, your equipment request has been DENIED.

Items:
${transaction.items.map((i) => `- ${i.itemName} (Qty: ${i.quantity})`).join("\n")}

Transaction ID: ${transactionId}

Please contact the lab office if you need clarification.

Thank you.`,
        html: `
          <div style="font-family: Arial; max-width:600px; margin:auto; background:#fef2f2; padding:20px;">
            <div style="background:white; padding:30px; border-radius:8px; border-top:4px solid #dc2626;">
              <h2 style="color:#dc2626;">❌ Equipment Request Denied</h2>
              <p>Hi <strong>${transaction.studentName}</strong>,</p>
              <p>Your request has been <strong>denied</strong> for the following items:</p>
              <ul style="background:#fee2e2; padding:15px 15px 15px 35px; border-radius:4px;">
                ${equipmentList}
              </ul>
              <p><strong>Transaction ID:</strong> <code>${transactionId}</code></p>
              <p>If you believe this is a mistake, please contact the laboratory office.</p>
              <hr>
              <p style="font-size:12px;color:#6b7280;">Automated message from eLabTrack System.</p>
            </div>
          </div>
        `,
      },
      userId: transaction.studentId,
      type: "transaction_denied",
      transactionId,
      createdAt: serverTimestamp(),
    });

    batch.delete(transactionRef);
    await batch.commit();
  } catch (error) {
    console.error("Error denying transaction:", error);
    throw error;
  }
};

export const updateTransactionStatus = async (
  transactionId: string,
  newStatus: TransactionStatus,
) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    await updateDoc(transactionRef, {
      status: newStatus,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
};

export const completeTransaction = async (
  transactionId: string,
  itemReturnStates: {
    [itemId: string]: { checked: boolean; quantity: number };
  },
) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (!transactionSnap.exists()) {
      throw new Error("Transaction not found");
    }

    const transactionData = transactionSnap.data() as Transaction;
    const batch = writeBatch(db);

    // Update items with return status
    const updatedItems = transactionData.items.map((item) => ({
      ...item,
      returned: itemReturnStates[item.id]?.checked || item.returned,
      returnedQuantity:
        itemReturnStates[item.id]?.quantity || item.returnedQuantity,
    }));

    // Check if all items are fully returned
    const allReturned = updatedItems.every(
      (item) => item.returned && item.returnedQuantity === item.quantity,
    );

    // Check if overdue
    const now = new Date();
    const dueDate = transactionData.dueDate.toDate();
    const isOverdue = now > dueDate;

    // Calculate fine if overdue
    let fineAmount = 0;
    if (isOverdue) {
      const daysOverdue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      fineAmount = daysOverdue * 10; // ₱10 per day overdue
    }

    // Determine final status based on completion and overdue state
    let finalStatus: string;

    if (allReturned) {
      // All items returned
      finalStatus = isOverdue ? "Complete and Overdue" : "Complete";
    } else {
      // Some items not returned
      finalStatus = isOverdue ? "Incomplete and Overdue" : "Incomplete";
    }

    if (allReturned) {
      // Move to records collection - transaction is complete
      const recordData = {
        transactionId: transactionData.transactionId || transactionId,
        studentId: transactionData.studentId,
        studentName: transactionData.studentName,
        studentEmail: transactionData.studentEmail,
        items: updatedItems,
        borrowedDate: transactionData.borrowedDate,
        dueDate: transactionData.dueDate,
        returnedDate: Timestamp.now(),
        completedDate: Timestamp.now(),
        finalStatus: finalStatus,
        totalPrice: transactionData.totalPrice,
        fineAmount,
        notes: "",
        createdAt: transactionData.createdAt || Timestamp.now(),
        archivedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "records"), recordData);
      batch.delete(transactionRef);

      // Create fine document if overdue
      if (isOverdue && fineAmount > 0) {
        const fineData = {
          transactionId: transactionData.transactionId || transactionId,
          studentId: transactionData.studentId,
          studentName: transactionData.studentName,
          studentEmail: transactionData.studentEmail,
          fineType: "late_return",
          amount: fineAmount,
          reason: `${Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days overdue`,
          daysOverdue: Math.ceil(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
          status: "unpaid",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, "fines"), fineData);
      }
    } else {
      // Partial return - update transaction with new status
      // Determine current transaction status
      let transactionStatus: string;

      if (isOverdue) {
        transactionStatus = "Incomplete and Overdue";
      } else {
        transactionStatus = "Incomplete";
      }

      batch.update(transactionRef, {
        items: updatedItems,
        status: transactionStatus,
        fineAmount,
        updatedAt: Timestamp.now(),
      });
    }

    // Update equipment quantities for returned items
    for (const item of updatedItems) {
      const originalItem = transactionData.items.find((i) => i.id === item.id);
      const quantityReturned =
        item.returnedQuantity - (originalItem?.returnedQuantity || 0);

      if (quantityReturned > 0) {
        const equipmentRef = doc(db, "equipment", item.equipmentId);
        const equipmentSnap = await getDoc(equipmentRef);

        if (equipmentSnap.exists()) {
          const equipmentData = equipmentSnap.data() as Equipment;

          batch.update(equipmentRef, {
            availableQuantity:
              equipmentData.availableQuantity + quantityReturned,
            borrowedQuantity: equipmentData.borrowedQuantity - quantityReturned,
            updatedAt: Timestamp.now(),
          });
        }
      }
    }

    await batch.commit();
    return finalStatus;
  } catch (error) {
    console.error("Error completing transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId: string) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (transactionSnap.exists()) {
      const transactionData = transactionSnap.data() as Transaction;
      const batch = writeBatch(db);

      // Return quantities to equipment
      for (const item of transactionData.items) {
        const equipmentRef = doc(db, "equipment", item.equipmentId);
        const equipmentSnap = await getDoc(equipmentRef);

        if (equipmentSnap.exists()) {
          const equipmentData = equipmentSnap.data() as Equipment;
          const unreturned = item.quantity - item.returnedQuantity;

          batch.update(equipmentRef, {
            availableQuantity: equipmentData.availableQuantity + unreturned,
            borrowedQuantity: equipmentData.borrowedQuantity - unreturned,
            updatedAt: Timestamp.now(),
          });
        }
      }

      batch.delete(transactionRef);
      await batch.commit();
    }
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

export const getTransactionsByStatus = async (
  status: TransactionStatus | "All",
) => {
  try {
    const transactionsRef = collection(db, "transactions");
    let q;

    if (status === "All") {
      q = query(transactionsRef);
    } else {
      q = query(transactionsRef, where("status", "==", status));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
};

export const getStudentTransactions = async (studentId: string) => {
  try {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, where("studentId", "==", studentId));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting student transactions:", error);
    throw error;
  }
};

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

export const createNotification = async (
  userId: string,
  email: string,
  type:
    | "borrow_confirmation"
    | "return_reminder"
    | "overdue_notice"
    | "approval_notification",
  subject: string,
  message: string,
  transactionId: string,
) => {
  try {
    const notificationData = {
      userId,
      email,
      type,
      subject,
      message,
      transactionId,
      status: "pending",
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, "notifications"),
      notificationData,
    );
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// ============================================
// SETTINGS FUNCTIONS
// ============================================

export const getSettings = async () => {
  try {
    const settingsRef = doc(db, "settings", "general");
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
      return settingsSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting settings:", error);
    throw error;
  }
};
