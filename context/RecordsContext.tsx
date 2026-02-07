// context/RecordsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export type RecordStatus =
  | "Complete"
  | "Incomplete"
  | "Overdue"
  | "Incomplete and Overdue"
  | "Complete and Overdue";

export interface BorrowedItem {
  id: string;
  equipmentId: string;
  itemName: string;
  quantity: number;
  pricePerQuantity: number;
  returned: boolean;
  returnedQuantity: number;
}

export interface Record {
  id: string;
  transactionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  items: BorrowedItem[];
  borrowedDate: Date;
  dueDate: Date;
  returnedDate: Date;
  completedDate: Date;
  finalStatus: RecordStatus;
  totalPrice: number;
  fineAmount: number;
  notes?: string;
  archivedAt: Date;
}

export interface RecordsStats {
  complete: number;
  incomplete: number;
  overdue: number;
  incompleteAndOverdue: number;
  completeAndOverdue: number;
  total: number;
  totalFines: number;
  totalTransactions: number;
}

interface RecordsContextType {
  records: Record[];
  stats: RecordsStats;
  loading: boolean;
  error: string | null;
  getRecordById: (id: string) => Record | undefined;
  getRecordsByStatus: (status: RecordStatus | "All") => Record[];
  getRecordsByStudent: (studentId: string) => Record[];
  getRecordsByDateRange: (startDate: Date, endDate: Date) => Record[];
  searchRecords: (query: string) => Record[];
}

// === CONTEXT ===
const RecordsContext = createContext<RecordsContextType>({
  records: [],
  stats: {
    complete: 0,
    incomplete: 0,
    overdue: 0,
    incompleteAndOverdue: 0,
    completeAndOverdue: 0,
    total: 0,
    totalFines: 0,
    totalTransactions: 0,
  },
  loading: true,
  error: null,
  getRecordById: () => undefined,
  getRecordsByStatus: () => [],
  getRecordsByStudent: () => [],
  getRecordsByDateRange: () => [],
  searchRecords: () => [],
});

export const useRecords = () => useContext(RecordsContext);

// === PROVIDER ===
export const RecordsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [records, setRecords] = useState<Record[]>([]);
  const [stats, setStats] = useState<RecordsStats>({
    complete: 0,
    incomplete: 0,
    overdue: 0,
    incompleteAndOverdue: 0,
    completeAndOverdue: 0,
    total: 0,
    totalFines: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from records
  const calculateStats = (recordsList: Record[]): RecordsStats => {
    const newStats: RecordsStats = {
      complete: 0,
      incomplete: 0,
      overdue: 0,
      incompleteAndOverdue: 0,
      completeAndOverdue: 0,
      total: recordsList.length,
      totalFines: 0,
      totalTransactions: 0,
    };

    recordsList.forEach((record) => {
      // Count by status
      switch (record.finalStatus) {
        case "Complete":
          newStats.complete++;
          break;
        case "Incomplete":
          newStats.incomplete++;
          break;
        case "Overdue":
          newStats.overdue++;
          break;
        case "Incomplete and Overdue":
          newStats.incompleteAndOverdue++;
          break;
        case "Complete and Overdue":
          newStats.completeAndOverdue++;
          break;
      }

      // Sum fines
      newStats.totalFines += record.fineAmount || 0;

      // Count unique transactions
      newStats.totalTransactions++;
    });

    return newStats;
  };

  useEffect(() => {
    console.log("✅ RecordsContext Mounted - Loading records");

    // Subscribe to records collection with real-time updates
    const unsubscribe = onSnapshot(
      query(collection(db, "records"), orderBy("completedDate", "desc")),
      (snapshot) => {
        const list: Record[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            transactionId: data.transactionId || "",
            studentId: data.studentId || "",
            studentName: data.studentName || "",
            studentEmail: data.studentEmail || "",
            items: data.items || [],
            borrowedDate: data.borrowedDate?.toDate?.() || new Date(),
            dueDate: data.dueDate?.toDate?.() || new Date(),
            returnedDate: data.returnedDate?.toDate?.() || new Date(),
            completedDate: data.completedDate?.toDate?.() || new Date(),
            finalStatus: (data.finalStatus as RecordStatus) || "Complete",
            totalPrice: data.totalPrice ?? 0,
            fineAmount: data.fineAmount ?? 0,
            notes: data.notes || "",
            archivedAt: data.archivedAt?.toDate?.() || new Date(),
          };
        });

        setRecords(list);
        setStats(calculateStats(list));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading records:", err);
        setError("Failed to load records");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      console.log("❌ RecordsContext Unmounted");
    };
  }, []);

  // Helper: Get record by ID
  const getRecordById = (id: string): Record | undefined => {
    return records.find((record) => record.id === id);
  };

  // Helper: Filter records by status
  const getRecordsByStatus = (status: RecordStatus | "All"): Record[] => {
    if (status === "All") {
      return records;
    }
    return records.filter((record) => record.finalStatus === status);
  };

  // Helper: Get records by student ID
  const getRecordsByStudent = (studentId: string): Record[] => {
    return records.filter((record) => record.studentId === studentId);
  };

  // Helper: Get records within date range
  const getRecordsByDateRange = (startDate: Date, endDate: Date): Record[] => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return records.filter((record) => {
      const borrowedDate = record.borrowedDate;
      return borrowedDate >= start && borrowedDate <= end;
    });
  };

  // Helper: Search records by name, email, or transaction ID
  const searchRecords = (searchQuery: string): Record[] => {
    if (!searchQuery.trim()) {
      return records;
    }

    const query = searchQuery.toLowerCase();
    return records.filter(
      (record) =>
        record.studentName.toLowerCase().includes(query) ||
        record.studentEmail.toLowerCase().includes(query) ||
        record.transactionId.toLowerCase().includes(query),
    );
  };

  return (
    <RecordsContext.Provider
      value={{
        records,
        stats,
        loading,
        error,
        getRecordById,
        getRecordsByStatus,
        getRecordsByStudent,
        getRecordsByDateRange,
        searchRecords,
      }}
    >
      {children}
    </RecordsContext.Provider>
  );
};
