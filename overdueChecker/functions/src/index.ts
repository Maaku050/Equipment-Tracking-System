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
// SCHEDULED FUNCTION - Runs Daily at Midnight
// ============================================

export const dailyTransactionMaintenance = onSchedule(
  {
    schedule: "0 0 * * *", // Every day at midnight Manila time
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

      const equipmentList = transaction.items
        .map((item) => `<li>${item.itemName} (Qty: ${item.quantity})</li>`)
        .join("");

      const notificationRef = db.collection("notifications").doc();
      const dueDate = transaction.dueDate.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Trigger Email Extension format
      batch.set(notificationRef, {
        // Required by Trigger Email extension
        to: transaction.studentEmail,
        message: {
          subject: "⏰ Equipment Return Reminder - Due Tomorrow",
          text: `Hi ${transaction.studentName},\n\nThis is a friendly reminder that your borrowed equipment is due tomorrow:\n\n${transaction.items.map((item) => `- ${item.itemName} (Qty: ${item.quantity})`).join("\n")}\n\nDue Date: ${dueDate}\nTransaction ID: ${docSnap.id}\n\nPlease return the equipment on time to avoid penalties (₱10/day).\n\nThank you!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #2563eb; margin-top: 0;">⏰ Equipment Return Reminder</h2>
                
                <p>Hi <strong>${transaction.studentName}</strong>,</p>
                
                <p>This is a friendly reminder that your borrowed equipment is <strong style="color: #dc2626;">due tomorrow</strong>:</p>
                
                <ul style="background-color: #f3f4f6; padding: 15px 15px 15px 35px; border-radius: 4px; margin: 15px 0;">
                  ${equipmentList}
                </ul>
                
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Due Date:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${dueDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${docSnap.id}</td>
                  </tr>
                </table>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #991b1b;">
                    <strong>⚠️ Important:</strong> Please return the equipment on time to avoid penalties (₱10/day).
                  </p>
                </div>
                
                <p>Thank you for your cooperation!</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  This is an automated message from eLabTrack System. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        },

        // Custom tracking fields (optional, for your records)
        userId: transaction.studentId,
        type: "return_reminder",
        transactionId: docSnap.id,
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

      const equipmentList = transaction.items
        .map((item) => `<li>${item.itemName} (Qty: ${item.quantity})</li>`)
        .join("");

      const notificationRef = db.collection("notifications").doc();

      const dueDateStr = dueDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Trigger Email Extension format
      batch.set(notificationRef, {
        // Required by Trigger Email extension
        to: transaction.studentEmail,
        message: {
          subject: "⚠️ OVERDUE: Equipment Return Required",
          text: `Hi ${transaction.studentName},\n\nYour borrowed equipment is now OVERDUE:\n\n${transaction.items.map((item) => `- ${item.itemName} (Qty: ${item.quantity})`).join("\n")}\n\nDue Date: ${dueDateStr}\nDays Overdue: ${daysOverdue}\nCurrent Fine: ₱${fineAmount}\nTransaction ID: ${docSnap.id}\n\nPlease return the equipment immediately to avoid additional penalties.\n\nThank you for your cooperation.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef2f2;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-top: 4px solid #dc2626;">
                <h2 style="color: #dc2626; margin-top: 0;">⚠️ OVERDUE: Equipment Return Required</h2>
                
                <p>Hi <strong>${transaction.studentName}</strong>,</p>
                
                <p style="color: #991b1b;">Your borrowed equipment is now <strong>OVERDUE</strong>:</p>
                
                <ul style="background-color: #fef2f2; padding: 15px 15px 15px 35px; border-radius: 4px; margin: 15px 0; border-left: 3px solid #dc2626;">
                  ${equipmentList}
                </ul>
                
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse; background-color: #fef2f2; border-radius: 4px;">
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca;"><strong>Due Date:</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca;">${dueDateStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca;"><strong>Days Overdue:</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold;">${daysOverdue} day${daysOverdue > 1 ? "s" : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca;"><strong>Current Fine:</strong></td>
                    <td style="padding: 12px; border-bottom: 1px solid #fecaca; color: #dc2626; font-weight: bold; font-size: 18px;">₱${fineAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 12px; font-family: monospace;">${docSnap.id}</td>
                  </tr>
                </table>
                
                <div style="background-color: #7f1d1d; color: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; font-size: 16px;">
                    ⚠️ URGENT: Please return the equipment immediately to avoid additional penalties.
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 14px;">
                    Fines increase by ₱10 per day until the equipment is returned.
                  </p>
                </div>
                
                <p>If you have any questions or concerns, please contact the laboratory office immediately.</p>
                
                <p>Thank you for your cooperation.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  This is an automated message from eLabTrack System. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        },

        // Custom tracking fields (optional, for your records)
        userId: transaction.studentId,
        type: "overdue_notice",
        transactionId: docSnap.id,
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
