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
import { db, functions } from "@/firebase/firebaseConfig";
import { httpsCallable } from "firebase/functions";

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
  | "Ondue"
  | "Overdue"
  | "Incomplete"
  | "Incomplete and Ondue"
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

  // 🔔 Notification flags
  ondueNotified?: boolean;
  reminderNotified?: boolean;
  overdueNotified?: boolean;
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
  now.setHours(0, 0, 0, 0);

  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);

  const isOverdue = now > dueDateNormalized;
  const isOndue = now.getTime() === dueDateNormalized.getTime();

  const allReturned = items.every(
    (item) => item.returned && item.returnedQuantity === item.quantity,
  );

  const someReturned = items.some(
    (item) =>
      item.returnedQuantity > 0 && item.returnedQuantity < item.quantity,
  );

  if (currentStatus === "Request") {
    return "Request";
  }

  if (allReturned) {
    return isOverdue ? "Complete and Overdue" : "Complete";
  } else if (someReturned || items.some((item) => item.returnedQuantity > 0)) {
    if (isOverdue) {
      return "Incomplete and Overdue";
    } else if (isOndue) {
      return "Incomplete and Ondue";
    } else {
      return "Incomplete";
    }
  } else {
    if (isOverdue) {
      return "Overdue";
    } else if (isOndue) {
      return "Ondue";
    } else {
      return "Ongoing";
    }
  }
};

/**
 * Calculate the total fine amount based on days overdue
 */
export const calculateOverdueFine = (
  dueDate: Date,
  currentDate: Date = new Date(),
  finePerDay: number = 10,
): number => {
  const currentNormalized = new Date(currentDate);
  currentNormalized.setHours(0, 0, 0, 0);

  const dueNormalized = new Date(dueDate);
  dueNormalized.setHours(0, 0, 0, 0);

  if (currentNormalized <= dueNormalized) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diffInMilliseconds =
    currentNormalized.getTime() - dueNormalized.getTime();
  const daysOverdue = Math.ceil(diffInMilliseconds / millisecondsPerDay);

  return daysOverdue * finePerDay;
};

/**
 * Calculate damage/lost fine for items
 */
export const calculateDamageLostFine = (items: BorrowedItem[]): number => {
  return items.reduce((total, item) => {
    const damagedFine = item.damagedQuantity * item.pricePerQuantity;
    const lostFine = item.lostQuantity * item.pricePerQuantity;
    return total + damagedFine + lostFine;
  }, 0);
};

/**
 * Updates all transaction statuses and fines based on current date
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

/**
 * Optional: Query only potentially overdue transactions for better performance
 */
export const updateOverdueTransactionsOptimized = async () => {
  try {
    const transactionsRef = collection(db, "transactions");

    const q = query(
      transactionsRef,
      where("status", "in", [
        "Ongoing",
        "Ondue",
        "Incomplete",
        "Incomplete and Ondue",
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

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = now.getTime().toString().slice(-6);
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

    const transactionData: Transaction = {
      transactionId,
      studentId,
      studentName,
      studentEmail,
      items,
      borrowedDate: Timestamp.now(),
      dueDate: Timestamp.fromDate(dueDate),
      status: isAdminCreated ? "Ongoing" : "Request",
      totalPrice,
      fineAmount: 0,
      ondueNotified: false,
      reminderNotified: false,
      overdueNotified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const transactionRef = await addDoc(
      collection(db, "transactions"),
      transactionData,
    );

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

    try {
      const manualMaintenance = httpsCallable(
        functions,
        "manualTransactionMaintenance",
      );
      await manualMaintenance({});
      console.log("Maintenance check completed after transaction creation");
    } catch (maintenanceError) {
      console.warn(
        "Maintenance check failed (non-critical):",
        maintenanceError,
      );
    }

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

    await updateDoc(transactionRef, {
      status: "Ongoing",
      borrowedDate: serverTimestamp(),
      ondueNotified: false,
      reminderNotified: false,
      overdueNotified: false,
      updatedAt: serverTimestamp(),
    });

    const equipmentList = transaction.items
      .map((i) => `<li>${i.itemName} (Qty: ${i.quantity})</li>`)
      .join("");

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

    try {
      const manualMaintenance = httpsCallable(
        functions,
        "manualTransactionMaintenance",
      );
      await manualMaintenance({});
      console.log("Maintenance check completed after approval");
    } catch (maintenanceError) {
      console.warn(
        "Maintenance check failed (non-critical):",
        maintenanceError,
      );
    }
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
    [itemId: string]: {
      checked: boolean;
      quantity: number;
      damagedQuantity: number;
      lostQuantity: number;
      damageNotes: string;
    };
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

    const updatedItems = transactionData.items.map((item) => {
      const state = itemReturnStates[item.id];

      // If no state exists for this item, keep it unchanged
      if (!state) {
        return item;
      }

      return {
        ...item,
        returned: state.checked ?? item.returned,
        // CRITICAL: Add new quantities to existing quantities for cumulative tracking
        returnedQuantity: (item.returnedQuantity || 0) + (state.quantity || 0),
        damagedQuantity:
          (item.damagedQuantity || 0) + (state.damagedQuantity || 0),
        lostQuantity: (item.lostQuantity || 0) + (state.lostQuantity || 0),
        damageNotes: state.damageNotes || item.damageNotes || "",
      };
    });

    // Check if all items are fully accounted for (returned + damaged + lost = borrowed)
    const allReturned = updatedItems.every((item) => {
      const totalAccountedFor =
        item.returnedQuantity + item.damagedQuantity + item.lostQuantity;
      return totalAccountedFor === item.quantity;
    });

    const now = new Date();
    const dueDate = transactionData.dueDate.toDate();
    const isOverdue = now > dueDate;

    // Calculate overdue fine
    let overdueFine = 0;
    if (isOverdue) {
      const daysOverdue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      overdueFine = daysOverdue * 10;
    }

    // Calculate damage/lost fine
    const damageLostFine = calculateDamageLostFine(updatedItems);

    // Total fine amount
    const totalFineAmount = overdueFine + damageLostFine;

    let finalStatus: string;

    if (allReturned) {
      finalStatus = isOverdue ? "Complete and Overdue" : "Complete";
    } else {
      finalStatus = isOverdue ? "Incomplete and Overdue" : "Incomplete";
    }

    if (allReturned) {
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
        fineAmount: totalFineAmount,
        notes: "",
        createdAt: transactionData.createdAt || Timestamp.now(),
        archivedAt: Timestamp.now(),
      };

      await addDoc(collection(db, "records"), recordData);
      batch.delete(transactionRef);

      // Send receipt email notification
      await sendReceiptNotification(
        transactionData,
        updatedItems,
        overdueFine,
        damageLostFine,
        totalFineAmount,
      );

      // Create fine record if there's any fine
      if (totalFineAmount > 0) {
        const fineReasons: string[] = [];

        if (overdueFine > 0) {
          const daysOverdue = Math.ceil(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          fineReasons.push(
            `Late return: ${daysOverdue} days overdue (₱${overdueFine.toFixed(2)})`,
          );
        }

        if (damageLostFine > 0) {
          updatedItems.forEach((item) => {
            if (item.damagedQuantity > 0) {
              fineReasons.push(
                `${item.itemName}: ${item.damagedQuantity} damaged (₱${(item.damagedQuantity * item.pricePerQuantity).toFixed(2)})`,
              );
            }
            if (item.lostQuantity > 0) {
              fineReasons.push(
                `${item.itemName}: ${item.lostQuantity} lost (₱${(item.lostQuantity * item.pricePerQuantity).toFixed(2)})`,
              );
            }
          });
        }

        const fineData = {
          transactionId: transactionData.transactionId || transactionId,
          studentId: transactionData.studentId,
          studentName: transactionData.studentName,
          studentEmail: transactionData.studentEmail,
          fineType:
            overdueFine > 0 && damageLostFine > 0
              ? "combined"
              : overdueFine > 0
                ? "late_return"
                : "damage_lost",
          amount: totalFineAmount,
          reason: fineReasons.join("; "),
          overdueFine,
          damageLostFine,
          daysOverdue:
            overdueFine > 0
              ? Math.ceil(
                  (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
                )
              : 0,
          status: "unpaid",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        await addDoc(collection(db, "fines"), fineData);
      }
    } else {
      let transactionStatus: string;

      if (isOverdue) {
        transactionStatus = "Incomplete and Overdue";
      } else {
        transactionStatus = "Incomplete";
      }

      batch.update(transactionRef, {
        items: updatedItems,
        status: transactionStatus,
        fineAmount: totalFineAmount,
        updatedAt: Timestamp.now(),
      });
    }

    // Update equipment quantities - only restore items that were returned in good condition
    for (const item of updatedItems) {
      const originalItem = transactionData.items.find((i) => i.id === item.id);

      // Calculate new quantities returned (good condition only)
      const newReturnedQuantity =
        item.returnedQuantity - (originalItem?.returnedQuantity ?? 0);
      const newDamagedQuantity =
        item.damagedQuantity - (originalItem?.damagedQuantity ?? 0);
      const newLostQuantity =
        item.lostQuantity - (originalItem?.lostQuantity ?? 0);

      // Total items being processed in this update
      const totalProcessed =
        newReturnedQuantity + newDamagedQuantity + newLostQuantity;

      if (totalProcessed > 0) {
        const equipmentRef = doc(db, "equipment", item.equipmentId);
        const equipmentSnap = await getDoc(equipmentRef);

        if (equipmentSnap.exists()) {
          const equipmentData = equipmentSnap.data() as Equipment;

          // Only returned items (good condition) go back to available quantity
          // Damaged and lost items are removed from borrowed but NOT added to available
          batch.update(equipmentRef, {
            availableQuantity:
              equipmentData.availableQuantity + newReturnedQuantity,
            borrowedQuantity: equipmentData.borrowedQuantity - totalProcessed,
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

/**
 * Send receipt notification email when transaction is completed
 */
const sendReceiptNotification = async (
  transactionData: Transaction,
  items: BorrowedItem[],
  overdueFine: number,
  damageLostFine: number,
  totalFineAmount: number,
) => {
  const now = new Date();
  const receiptDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const dueDate = transactionData.dueDate.toDate().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const borrowedDate = transactionData.borrowedDate
    .toDate()
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // Build items list with return details
  const itemsListHTML = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">${item.itemName}</td>
      <td style="padding: 12px; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; text-align: center;">${item.returnedQuantity}</td>
      <td style="padding: 12px; text-align: center;">${item.damagedQuantity || 0}</td>
      <td style="padding: 12px; text-align: center;">${item.lostQuantity || 0}</td>
      <td style="padding: 12px; text-align: right;">₱${item.pricePerQuantity.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  // Build damage/lost details if applicable
  let damageDetailsHTML = "";
  const damagedOrLostItems = items.filter(
    (item) => item.damagedQuantity > 0 || item.lostQuantity > 0,
  );

  if (damagedOrLostItems.length > 0) {
    const damageItemsHTML = damagedOrLostItems
      .map((item) => {
        const damages: string[] = [];
        if (item.damagedQuantity > 0) {
          damages.push(
            `<li><strong>Damaged:</strong> ${item.damagedQuantity} × ₱${item.pricePerQuantity.toFixed(2)} = ₱${(item.damagedQuantity * item.pricePerQuantity).toFixed(2)}</li>`,
          );
        }
        if (item.lostQuantity > 0) {
          damages.push(
            `<li><strong>Lost:</strong> ${item.lostQuantity} × ₱${item.pricePerQuantity.toFixed(2)} = ₱${(item.lostQuantity * item.pricePerQuantity).toFixed(2)}</li>`,
          );
        }
        if (item.damageNotes) {
          damages.push(`<li><em>Notes: ${item.damageNotes}</em></li>`);
        }
        return `
          <div style="margin-bottom: 12px;">
            <strong>${item.itemName}:</strong>
            <ul style="margin: 4px 0 0 20px; padding: 0;">
              ${damages.join("")}
            </ul>
          </div>
        `;
      })
      .join("");

    damageDetailsHTML = `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #dc2626; margin-top: 0; margin-bottom: 12px; font-size: 16px;">⚠️ Damage/Lost Items</h3>
        ${damageItemsHTML}
        <p style="margin: 12px 0 0 0; font-weight: bold; color: #991b1b;">
          Total Damage/Lost Fine: ₱${damageLostFine.toFixed(2)}
        </p>
      </div>
    `;
  }

  // Build overdue fine section if applicable
  let overdueFineHTML = "";
  if (overdueFine > 0) {
    const daysOverdue = Math.ceil(
      (now.getTime() - transactionData.dueDate.toDate().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    overdueFineHTML = `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h3 style="color: #d97706; margin-top: 0; margin-bottom: 8px; font-size: 16px;">⏰ Late Return Fine</h3>
        <p style="margin: 0; color: #92400e;">
          <strong>Days Overdue:</strong> ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}<br>
          <strong>Fine per Day:</strong> ₱10.00<br>
          <strong>Total Late Fine:</strong> ₱${overdueFine.toFixed(2)}
        </p>
      </div>
    `;
  }

  const notificationRef = doc(collection(db, "notifications"));
  await setDoc(notificationRef, {
    to: transactionData.studentEmail,
    message: {
      subject: "📄 Equipment Return Receipt - eLabTrack System",
      text: `Equipment Return Receipt

Dear ${transactionData.studentName},

This is to confirm that your equipment return has been processed successfully.

TRANSACTION DETAILS:
Transaction ID: ${transactionData.transactionId}
Return Date: ${receiptDate}
Borrowed Date: ${borrowedDate}
Due Date: ${dueDate}

ITEMS RETURNED:
${items.map((item) => `- ${item.itemName}: ${item.returnedQuantity}/${item.quantity} returned${item.damagedQuantity > 0 ? `, ${item.damagedQuantity} damaged` : ""}${item.lostQuantity > 0 ? `, ${item.lostQuantity} lost` : ""}`).join("\n")}

FINANCIAL SUMMARY:
Equipment Rental Total: ₱${transactionData.totalPrice.toFixed(2)}
${overdueFine > 0 ? `Late Return Fine: ₱${overdueFine.toFixed(2)}` : ""}
${damageLostFine > 0 ? `Damage/Lost Fine: ₱${damageLostFine.toFixed(2)}` : ""}
${totalFineAmount > 0 ? `TOTAL FINE: ₱${totalFineAmount.toFixed(2)}` : "No fines incurred"}

${totalFineAmount > 0 ? "Please settle your outstanding fine at the laboratory office." : "Thank you for returning the equipment in good condition and on time."}

Best regards,
eLabTrack System`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 6px solid #3b82f6;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
              <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 28px;">📄 Equipment Return Receipt</h1>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">eLabTrack Laboratory Management System</p>
            </div>

            <!-- Greeting -->
            <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
              Dear <strong>${transactionData.studentName}</strong>,
            </p>

            <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              This is to confirm that your equipment return has been processed successfully. Please review the details below and keep this receipt for your records.
            </p>

            <!-- Transaction Info -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">Transaction Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 180px;">Transaction ID:</td>
                  <td style="padding: 8px 0; color: #111827; font-family: monospace; font-size: 15px;">${transactionData.transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Return Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${receiptDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Borrowed Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${borrowedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Due Date:</td>
                  <td style="padding: 8px 0; color: #111827;">${dueDate}</td>
                </tr>
              </table>
            </div>

            <!-- Items Table -->
            <div style="margin-bottom: 24px;">
              <h2 style="color: #1f2937; margin-bottom: 16px; font-size: 18px; border-bottom: 2px solid #d1d5db; padding-bottom: 8px;">Items Returned</h2>
              <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Item</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Borrowed</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Returned</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Damaged</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Lost</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Price/Unit</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHTML}
                </tbody>
              </table>
            </div>

            <!-- Damage/Lost Details -->
            ${damageDetailsHTML}

            <!-- Overdue Fine -->
            ${overdueFineHTML}

            <!-- Financial Summary -->
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <h2 style="color: #1e40af; margin-top: 0; margin-bottom: 16px; font-size: 18px;">💰 Financial Summary</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">Equipment Rental Total:</td>
                  <td style="padding: 8px 0; color: #1f2937; text-align: right; font-family: monospace;">₱${transactionData.totalPrice.toFixed(2)}</td>
                </tr>
                ${
                  overdueFine > 0
                    ? `
                <tr>
                  <td style="padding: 8px 0; color: #d97706; font-weight: 600;">Late Return Fine:</td>
                  <td style="padding: 8px 0; color: #d97706; text-align: right; font-family: monospace; font-weight: bold;">₱${overdueFine.toFixed(2)}</td>
                </tr>
                `
                    : ""
                }
                ${
                  damageLostFine > 0
                    ? `
                <tr>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">Damage/Lost Fine:</td>
                  <td style="padding: 8px 0; color: #dc2626; text-align: right; font-family: monospace; font-weight: bold;">₱${damageLostFine.toFixed(2)}</td>
                </tr>
                `
                    : ""
                }
                ${
                  totalFineAmount > 0
                    ? `
                <tr style="border-top: 2px solid #3b82f6;">
                  <td style="padding: 12px 0; color: #1f2937; font-weight: 700; font-size: 16px;">TOTAL FINE:</td>
                  <td style="padding: 12px 0; color: #dc2626; text-align: right; font-family: monospace; font-weight: 700; font-size: 18px;">₱${totalFineAmount.toFixed(2)}</td>
                </tr>
                `
                    : `
                <tr style="border-top: 2px solid #3b82f6;">
                  <td colspan="2" style="padding: 12px 0; color: #059669; font-weight: 600; text-align: center;">✅ No fines incurred</td>
                </tr>
                `
                }
              </table>
            </div>

            <!-- Action Required / Thank You -->
            ${
              totalFineAmount > 0
                ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">
                ⚠️ <strong>Action Required:</strong> Please settle your outstanding fine of <strong>₱${totalFineAmount.toFixed(2)}</strong> at the laboratory office.
              </p>
            </div>
            `
                : `
            <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-weight: 600;">
                ✅ Thank you for returning the equipment in good condition and on time!
              </p>
            </div>
            `
            }

            <!-- Closing -->
            <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 24px 0 8px 0;">
              If you have any questions or concerns regarding this receipt, please contact the laboratory office.
            </p>

            <p style="font-size: 15px; color: #4b5563; margin: 0 0 32px 0;">
              Best regards,<br>
              <strong>eLabTrack System</strong>
            </p>

            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 20px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
              This is an automated receipt from eLabTrack Laboratory Management System.<br>
              Please do not reply to this email. For assistance, visit the laboratory office.
            </p>
          </div>
        </div>
      `,
    },
    userId: transactionData.studentId,
    type: "transaction_receipt",
    transactionId: transactionData.transactionId,
    createdAt: serverTimestamp(),
  });
};

export const deleteTransaction = async (transactionId: string) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (transactionSnap.exists()) {
      const transactionData = transactionSnap.data() as Transaction;
      const batch = writeBatch(db);

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
