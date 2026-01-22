import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export type EquipmentCondition = "good" | "fair" | "needs repair";
export type EquipmentStatus = "available" | "unavailable" | "maintenance";

export interface Equipment {
  id: string;
  name: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  borrowedQuantity: number;
  pricePerUnit: number;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentStats {
  available: number;
  unavailable: number;
  maintenance: number;
  total: number;
  totalBorrowed: number;
  totalAvailable: number;
}

interface EquipmentContextType {
  equipment: Equipment[];
  stats: EquipmentStats;
  loading: boolean;
  error: string | null;
  getEquipmentById: (id: string) => Equipment | undefined;
  getEquipmentByStatus: (status: EquipmentStatus | "All") => Equipment[];
  getEquipmentByCondition: (
    condition: EquipmentCondition | "All",
  ) => Equipment[];
  getAvailableEquipment: () => Equipment[];
}

// === CONTEXT ===
const EquipmentContext = createContext<EquipmentContextType>({
  equipment: [],
  stats: {
    available: 0,
    unavailable: 0,
    maintenance: 0,
    total: 0,
    totalBorrowed: 0,
    totalAvailable: 0,
  },
  loading: true,
  error: null,
  getEquipmentById: () => undefined,
  getEquipmentByStatus: () => [],
  getEquipmentByCondition: () => [],
  getAvailableEquipment: () => [],
});

export const useEquipment = () => useContext(EquipmentContext);

// === PROVIDER ===
export const EquipmentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [stats, setStats] = useState<EquipmentStats>({
    available: 0,
    unavailable: 0,
    maintenance: 0,
    total: 0,
    totalBorrowed: 0,
    totalAvailable: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from equipment
  const calculateStats = (equipmentList: Equipment[]): EquipmentStats => {
    const newStats: EquipmentStats = {
      available: 0,
      unavailable: 0,
      maintenance: 0,
      total: equipmentList.length,
      totalBorrowed: 0,
      totalAvailable: 0,
    };

    equipmentList.forEach((eq) => {
      // Count by status
      if (eq.status === "available") newStats.available++;
      if (eq.status === "unavailable") newStats.unavailable++;
      if (eq.status === "maintenance") newStats.maintenance++;

      // Sum quantities
      newStats.totalBorrowed += eq.borrowedQuantity;
      newStats.totalAvailable += eq.availableQuantity;
    });

    return newStats;
  };

  useEffect(() => {
    console.log("✅ EquipmentContext Mounted - Loading equipment");

    // Subscribe to equipment collection with real-time updates
    const unsubscribe = onSnapshot(
      query(collection(db, "equipment"), orderBy("name", "asc")),
      (snapshot) => {
        const list: Equipment[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            totalQuantity: data.totalQuantity ?? 0,
            availableQuantity: data.availableQuantity ?? 0,
            borrowedQuantity: data.borrowedQuantity ?? 0,
            pricePerUnit: data.pricePerUnit ?? 0,
            condition: (data.condition as EquipmentCondition) || "good",
            status: (data.status as EquipmentStatus) || "available",
            imageUrl: data.imageUrl || "",
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
          };
        });

        console.log("✅ Equipment loaded:", list.length);
        setEquipment(list);
        setStats(calculateStats(list));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading equipment:", err);
        setError("Failed to load equipment");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      console.log("❌ EquipmentContext Unmounted");
    };
  }, []);

  // Helper: Get equipment by ID
  const getEquipmentById = (id: string): Equipment | undefined => {
    return equipment.find((eq) => eq.id === id);
  };

  // Helper: Filter equipment by status
  const getEquipmentByStatus = (
    status: EquipmentStatus | "All",
  ): Equipment[] => {
    if (status === "All") {
      return equipment;
    }
    return equipment.filter((eq) => eq.status === status);
  };

  // Helper: Filter equipment by condition
  const getEquipmentByCondition = (
    condition: EquipmentCondition | "All",
  ): Equipment[] => {
    if (condition === "All") {
      return equipment;
    }
    return equipment.filter((eq) => eq.condition === condition);
  };

  // Helper: Get only available equipment with stock
  const getAvailableEquipment = (): Equipment[] => {
    return equipment.filter(
      (eq) => eq.status === "available" && eq.availableQuantity > 0,
    );
  };

  return (
    <EquipmentContext.Provider
      value={{
        equipment,
        stats,
        loading,
        error,
        getEquipmentById,
        getEquipmentByStatus,
        getEquipmentByCondition,
        getAvailableEquipment,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
};
