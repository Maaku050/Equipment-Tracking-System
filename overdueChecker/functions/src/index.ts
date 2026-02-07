// functions/src/index.ts
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

// ============================================
// UTILITY FUNCTIONS (Server-side versions)
// ============================================

type TransactionStatus =
  | "Request"
  | "Ongoing"
  | "Ondue"
  | "Overdue"
  | "Incomplete"
  | "Incomplete and Ondue"
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

  // 🔔 Notification flags
  ondueNotified?: boolean;
  reminderNotified?: boolean;
  overdueNotified?: boolean;
}

const determineTransactionStatus = (
  items: BorrowedItem[],
  dueDate: Date,
  currentStatus: TransactionStatus,
): TransactionStatus => {
  const now = getManilaToday();

  const dueDateNormalized = new Date(
    dueDate.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
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

  if (currentStatus === "Request") return "Request";

  if (allReturned) {
    return isOverdue ? "Complete and Overdue" : "Complete";
  }

  if (someReturned) {
    if (isOverdue) return "Incomplete and Overdue";
    if (isOndue) return "Incomplete and Ondue";
    return "Incomplete";
  }

  if (isOverdue) return "Overdue";
  if (isOndue) return "Ondue";
  return "Ongoing";
};

const calculateOverdueFine = (
  dueDate: Date,
  currentDate = new Date(),
  finePerDay = 10,
): number => {
  // Normalize dates to start of day
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

function getManilaToday(): Date {
  const now = new Date();

  const manila = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );

  manila.setHours(0, 0, 0, 0);
  return manila;
}

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
      const ondueNoticeCount = await sendOndueNotices();

      console.log(`Daily maintenance complete:
        - Updated ${overdueCount} overdue transactions
        - Sent ${reminderCount} return reminders
        - Sent ${overdueNoticeCount} overdue notices
        - Sent ${ondueNoticeCount} ondue notices`);
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
        "Ondue",
        "Incomplete",
        "Incomplete and Ondue",
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
// HELPER: Send Ondue Notices (Due Today)
// ============================================

async function sendOndueNotices(): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transactionsRef = db.collection("transactions");
    const snapshot = await transactionsRef
      .where("dueDate", ">=", admin.firestore.Timestamp.fromDate(today))
      .where("dueDate", "<", admin.firestore.Timestamp.fromDate(tomorrow))
      .where("ondueNotified", "!=", true)
      .get();

    const batch = db.batch();
    let noticeCount = 0;
    let skippedCount = 0;

    for (const docSnap of snapshot.docs) {
      const transaction = docSnap.data() as Transaction;

      if (!hasRequiredFields(transaction)) {
        console.warn(
          `Skipping transaction ${docSnap.id}: Missing student information`,
        );
        skippedCount++;
        continue;
      }

      if (transaction.ondueNotified === true) {
        skippedCount++;
        continue;
      }

      const equipmentList = transaction.items
        .map((item) => `<li>${item.itemName} (Qty: ${item.quantity})</li>`)
        .join("");

      const notificationRef = db.collection("notifications").doc();

      batch.set(notificationRef, {
        to: transaction.studentEmail,
        message: {
          subject: "📅 Equipment Due Today - Return Required",
          text: `Hi ${transaction.studentName},\n\nThis is a reminder that your borrowed equipment is DUE TODAY:\n\n${transaction.items.map((item) => `- ${item.itemName} (Qty: ${item.quantity})`).join("\n")}\n\nTransaction ID: ${docSnap.id}\n\nPlease return the equipment today to avoid penalties (₱10/day starting tomorrow).\n\nThank you!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fffbeb;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 4px solid #f59e0b;">
                <h2 style="color: #f59e0b; margin-top: 0;">📅 Equipment Due Today</h2>
                
                <p>Hi <strong>${transaction.studentName}</strong>,</p>
                
                <p>This is a reminder that your borrowed equipment is <strong style="color: #d97706;">DUE TODAY</strong>:</p>
                
                <ul style="background-color: #fef3c7; padding: 15px 15px 15px 35px; border-radius: 4px; margin: 15px 0; border-left: 3px solid #f59e0b;">
                  ${equipmentList}
                </ul>
                
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${docSnap.id}</td>
                  </tr>
                </table>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e;">
                    <strong>⏰ Important:</strong> Please return the equipment today to avoid penalties (₱10/day starting tomorrow).
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
        userId: transaction.studentId,
        type: "ondue_notice",
        transactionId: docSnap.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(docSnap.ref, {
        ondueNotified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      noticeCount++;
    }

    if (noticeCount > 0) {
      await batch.commit();
    }

    console.log(`Sent ${noticeCount} ondue notices, skipped ${skippedCount}`);
    return noticeCount;
  } catch (error) {
    console.error("Error sending ondue notices:", error);
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

      if (!hasRequiredFields(transaction)) {
        console.warn(
          `Skipping transaction ${docSnap.id}: Missing student information`,
        );
        skippedCount++;
        continue;
      }

      if (transaction.reminderNotified === true) {
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

      batch.set(notificationRef, {
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
        userId: transaction.studentId,
        type: "return_reminder",
        transactionId: docSnap.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(docSnap.ref, {
        reminderNotified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

      if (!hasRequiredFields(transaction)) {
        console.warn(
          `Skipping transaction ${docSnap.id}: Missing student information`,
        );
        skippedCount++;
        continue;
      }

      if (transaction.overdueNotified === true) {
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

      batch.set(notificationRef, {
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
        userId: transaction.studentId,
        type: "overdue_notice",
        transactionId: docSnap.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      batch.update(docSnap.ref, {
        overdueNotified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
// CALLABLE FUNCTIONS
// ============================================

export const testFunction = onCall(
  {
    region: "asia-southeast1",
  },
  async () => {
    console.log("Test function called");
    return {
      message: "Function is working!",
      timestamp: new Date().toISOString(),
    };
  },
);

// ============================================
// MANUAL TRIGGER (for testing and after transaction creation)
// ============================================

export const manualTransactionMaintenance = onCall(
  {
    region: "asia-southeast1",
  },
  async ({ auth }) => {
    if (!auth) {
      throw new HttpsError("unauthenticated", "Login required");
    }

    console.log("Manual maintenance triggered by user:", auth.uid);

    try {
      const overdueCount = await updateOverdueTransactions();
      const reminderCount = await sendReturnReminders();
      const overdueNoticeCount = await sendOverdueNotices();
      const ondueNoticeCount = await sendOndueNotices();

      return {
        success: true,
        overdueCount,
        reminderCount,
        overdueNoticeCount,
        ondueNoticeCount,
      };
    } catch (error: any) {
      console.error("Error in manual maintenance:", error);
      throw new HttpsError("internal", `Maintenance failed: ${error.message}`);
    }
  },
);
