// functions/src/index.ts
import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// UTILITY FUNCTIONS (Server-side versions)
// ============================================

type TransactionStatus =
  | "Request"
  | "Ongoing"
  | "Incomplete"
  | "Overdue"
  | "Incomplete and Overdue"
  | "Complete"
  | "Complete and Overdue";

interface BorrowedItem {
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

interface Transaction {
  studentId: string;
  studentName: string;
  studentEmail: string;
  items: BorrowedItem[];
  borrowedDate: admin.firestore.Timestamp;
  dueDate: admin.firestore.Timestamp;
  status: TransactionStatus;
  totalPrice: number;
  fineAmount?: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

const determineTransactionStatus = (
  items: BorrowedItem[],
  dueDate: Date,
  currentStatus: TransactionStatus,
): TransactionStatus => {
  const now = new Date();
  const isOverdue = now > dueDate;

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
    return isOverdue ? "Incomplete and Overdue" : "Incomplete";
  } else {
    return isOverdue ? "Overdue" : "Ongoing";
  }
};

const calculateOverdueFine = (
  dueDate: Date,
  currentDate = new Date(),
  finePerDay = 10,
): number => {
  if (currentDate < dueDate) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diffInMilliseconds = currentDate.getTime() - dueDate.getTime();
  const daysOverdue = Math.ceil(diffInMilliseconds / millisecondsPerDay);

  return daysOverdue * finePerDay;
};

// ============================================
// VALIDATION HELPER
// ============================================

function hasRequiredFields(transaction: Transaction): boolean {
  return !!(
    transaction.studentId &&
    transaction.studentEmail &&
    transaction.studentName
  );
}

// ============================================
// SCHEDULED FUNCTION - Runs Daily
// ============================================

export const dailyTransactionMaintenance = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Manila",
  },
  async (_event) => {
    console.log("Starting daily transaction maintenance...");

    try {
      const overdueCount = await updateOverdueTransactions();
      const reminderCount = await sendReturnReminders();
      const overdueNoticeCount = await sendOverdueNotices();

      console.log(`Daily maintenance complete:
        - Updated ${overdueCount} overdue transactions
        - Sent ${reminderCount} return reminders
        - Sent ${overdueNoticeCount} overdue notices`);
    } catch (error) {
      console.error("Error in daily maintenance:", error);
      throw error;
    }
  },
);

// ============================================
// HELPER: Update Overdue Transactions
// ============================================

async function updateOverdueTransactions(): Promise<number> {
  try {
    const transactionsRef = db.collection("transactions");

    const snapshot = await transactionsRef
      .where("status", "in", [
        "Ongoing",
        "Incomplete",
        "Overdue",
        "Incomplete and Overdue",
      ])
      .get();

    const batch = db.batch();
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
        const updates: {
          updatedAt: admin.firestore.FieldValue;
          status?: TransactionStatus;
          fineAmount?: number;
        } = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (needsStatusUpdate) {
          updates.status = correctStatus;
        }

        if (needsFineUpdate) {
          updates.fineAmount = correctFineAmount;
        }

        batch.update(docSnap.ref, updates);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    console.log(`Updated ${updatedCount} overdue transactions`);
    return updatedCount;
  } catch (error) {
    console.error("Error updating overdue transactions:", error);
    throw error;
  }
}

// ============================================
// HELPER: Send Return Reminders (Due Tomorrow)
// ============================================

async function sendReturnReminders(): Promise<number> {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDay = new Date(tomorrow);
    nextDay.setDate(nextDay.getDate() + 1);

    const transactionsRef = db.collection("transactions");
    const snapshot = await transactionsRef
      .where("status", "in", ["Ongoing", "Incomplete"])
      .where("dueDate", ">=", admin.firestore.Timestamp.fromDate(tomorrow))
      .where("dueDate", "<", admin.firestore.Timestamp.fromDate(nextDay))
      .get();

    const batch = db.batch();
    let reminderCount = 0;
    let skippedCount = 0;

    for (const docSnap of snapshot.docs) {
      const transaction = docSnap.data() as Transaction;

      // Skip if missing required fields
      if (!hasRequiredFields(transaction)) {
        console.warn(
          `Skipping transaction ${docSnap.id}: Missing student information`,
        );
        skippedCount++;
        continue;
      }

      const equipmentNames = transaction.items
        .map((item) => `${item.itemName} (Qty: ${item.quantity})`)
        .join(", ");

      const notificationRef = db.collection("notifications").doc();

      const dueDate = transaction.dueDate.toDate().toLocaleDateString();

      const message =
        `Hi ${transaction.studentName},\n\n` +
        "This is a friendly reminder that your borrowed equipment " +
        `is due tomorrow:\n\n${equipmentNames}\n\n` +
        `Due Date: ${dueDate}\n` +
        `Transaction ID: ${docSnap.id}\n\n` +
        "Please return the equipment on time to avoid penalties " +
        "(₱10/day).\n\nThank you!";

      batch.set(notificationRef, {
        userId: transaction.studentId,
        email: transaction.studentEmail,
        type: "return_reminder",
        subject: "⏰ Equipment Return Reminder - Due Tomorrow",
        message,
        transactionId: docSnap.id,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      reminderCount++;
    }

    if (reminderCount > 0) {
      await batch.commit();
    }

    console.log(
      `Sent ${reminderCount} return reminders, skipped ${skippedCount}`,
    );
    return reminderCount;
  } catch (error) {
    console.error("Error sending return reminders:", error);
    throw error;
  }
}

// ============================================
// HELPER: Send Overdue Notices
// ============================================

async function sendOverdueNotices(): Promise<number> {
  try {
    const transactionsRef = db.collection("transactions");
    const snapshot = await transactionsRef
      .where("status", "in", ["Overdue", "Incomplete and Overdue"])
      .get();

    const batch = db.batch();
    let noticeCount = 0;
    let skippedCount = 0;
    const now = new Date();

    for (const docSnap of snapshot.docs) {
      const transaction = docSnap.data() as Transaction;

      // Skip if missing required fields
      if (!hasRequiredFields(transaction)) {
        console.warn(
          `Skipping transaction ${docSnap.id}: Missing student information`,
        );
        skippedCount++;
        continue;
      }

      const dueDate = transaction.dueDate.toDate();

      const daysOverdue = Math.ceil(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const fineAmount = transaction.fineAmount || 0;

      const equipmentNames = transaction.items
        .map((item) => `${item.itemName} (Qty: ${item.quantity})`)
        .join(", ");

      const notificationRef = db.collection("notifications").doc();

      const dueDateStr = dueDate.toLocaleDateString();

      const message =
        `Hi ${transaction.studentName},\n\n` +
        "Your borrowed equipment is now OVERDUE:\n\n" +
        `${equipmentNames}\n\n` +
        `Due Date: ${dueDateStr}\n` +
        `Days Overdue: ${daysOverdue}\n` +
        `Current Fine: ₱${fineAmount}\n` +
        `Transaction ID: ${docSnap.id}\n\n` +
        "Please return the equipment immediately to avoid " +
        "additional penalties.\n\nThank you for your cooperation.";

      batch.set(notificationRef, {
        userId: transaction.studentId,
        email: transaction.studentEmail,
        type: "overdue_notice",
        subject: "⚠️ OVERDUE: Equipment Return Required",
        message,
        transactionId: docSnap.id,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      noticeCount++;
    }

    if (noticeCount > 0) {
      await batch.commit();
    }

    console.log(`Sent ${noticeCount} overdue notices, skipped ${skippedCount}`);
    return noticeCount;
  } catch (error) {
    console.error("Error sending overdue notices:", error);
    throw error;
  }
}

// ============================================
// SIMPLE TEST FUNCTION
// ============================================

export const testFunction = onCall(async (_request) => {
  console.log("Test function called");
  return {
    message: "Function is working!",
    timestamp: new Date().toISOString(),
  };
});

// ============================================
// MANUAL TRIGGER (Optional - for testing)
// ============================================

export const manualTransactionMaintenance = onCall(async (_request) => {
  console.log("Manual maintenance triggered");

  try {
    const overdueCount = await updateOverdueTransactions();
    const reminderCount = await sendReturnReminders();
    const overdueNoticeCount = await sendOverdueNotices();

    return {
      success: true,
      overdueCount,
      reminderCount,
      overdueNoticeCount,
    };
  } catch (error: any) {
    console.error("Error in manual maintenance:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Maintenance failed: ${error.message}`,
    );
  }
});
