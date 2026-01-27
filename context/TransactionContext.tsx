// context/TransactionContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export type TransactionStatus =
  | "Request"
  | "Ongoing"
  | "Overdue"
  | "Incomplete"
  | "Incomplete and Overdue"
  | "Complete"
  | "Complete and Overdue";

export interface TransactionItem {
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

export interface Transaction {
  id: string;
  transactionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  items: TransactionItem[];
  borrowedDate: Date;
  dueDate: Date;
  status: TransactionStatus;
  totalPrice: number;
  fineAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionStats {
  ongoing: number;
  incomplete: number;
  overdue: number;
  complete: number;
  request: number;
  total: number;
}

interface TransactionContextType {
  transactions: Transaction[];
  stats: TransactionStats;
  loading: boolean;
  error: string | null;
  getTransactionById: (id: string) => Transaction | undefined;
  getTransactionsByStatus: (status: TransactionStatus | "All") => Transaction[];
  getTransactionsByStudent: (studentId: string) => Transaction[];
}

// === CONTEXT ===
const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  stats: {
    ongoing: 0,
    incomplete: 0,
    overdue: 0,
    complete: 0,
    request: 0,
    total: 0,
  },
  loading: true,
  error: null,
  getTransactionById: () => undefined,
  getTransactionsByStatus: () => [],
  getTransactionsByStudent: () => [],
});

export const useTransaction = () => useContext(TransactionContext);

// === PROVIDER ===
export const TransactionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    ongoing: 0,
    incomplete: 0,
    overdue: 0,
    complete: 0,
    request: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from transactions
  const calculateStats = (txns: Transaction[]): TransactionStats => {
    const newStats: TransactionStats = {
      ongoing: 0,
      incomplete: 0,
      overdue: 0,
      complete: 0,
      request: 0,
      total: txns.length,
    };

    txns.forEach((t) => {
      // Count each status
      if (t.status === "Request") newStats.request++;
      if (t.status === "Ongoing") newStats.ongoing++;
      if (t.status === "Incomplete" || t.status === "Incomplete and Overdue") {
        newStats.incomplete++;
      }
      if (t.status === "Overdue") newStats.overdue++;
      if (t.status === "Complete" || t.status === "Complete and Overdue") {
        newStats.complete++;
      }
    });

    return newStats;
  };

  useEffect(() => {
    console.log("✅ TransactionContext Mounted - Loading transactions");

    // Subscribe to transactions collection with real-time updates
    const unsubscribe = onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const list: Transaction[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            transactionId: data.transactionId,
            studentId: data.studentId || "",
            studentName: data.studentName || "Unknown",
            studentEmail: data.studentEmail || "",
            items: (data.items || []).map((item: any) => ({
              id: item.id || "",
              equipmentId: item.equipmentId || "",
              itemName: item.itemName || "",
              quantity: item.quantity || 0,
              pricePerQuantity: item.pricePerQuantity || 0,
              returned: item.returned || false,
              returnedQuantity: item.returnedQuantity || 0,
              damagedQuantity: item.damagedQuantity || 0,
              lostQuantity: item.lostQuantity || 0,
              damageNotes: item.damageNotes || "",
            })),
            borrowedDate: data.borrowedDate?.toDate?.() || new Date(),
            dueDate: data.dueDate?.toDate?.() || new Date(),
            status: data.status as TransactionStatus,
            totalPrice: data.totalPrice || 0,
            fineAmount: data.fineAmount || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
        });

        setTransactions(list);
        setStats(calculateStats(list));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading transactions:", err);
        setError("Failed to load transactions");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      console.log("❌ TransactionContext Unmounted");
    };
  }, []);

  // Helper: Get transaction by ID
  const getTransactionById = (id: string): Transaction | undefined => {
    return transactions.find((t) => t.id === id);
  };

  // Helper: Filter transactions by status
  const getTransactionsByStatus = (
    status: TransactionStatus | "All",
  ): Transaction[] => {
    if (status === "All") {
      return transactions;
    }
    return transactions.filter((t) => t.status === status);
  };

  // Helper: Get transactions by student ID
  const getTransactionsByStudent = (studentId: string): Transaction[] => {
    return transactions.filter((t) => t.studentId === studentId);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        stats,
        loading,
        error,
        getTransactionById,
        getTransactionsByStatus,
        getTransactionsByStudent,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
