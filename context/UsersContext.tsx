// context/UsersContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export type UserRole = "student" | "staff" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  course?: string;
  contactNumber?: string;
  status: UserStatus;
  imageUrl?: string;
  imagePath: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserStats {
  students: number;
  staff: number;
  admins: number;
  active: number;
  inactive: number;
  suspended: number;
  total: number;
}

interface UsersContextType {
  users: User[];
  stats: UserStats;
  loading: boolean;
  error: string | null;
  getUserById: (id: string) => User | undefined;
  getUserByUid: (uid: string) => User | undefined;
  getUsersByRole: (role: UserRole | "All") => User[];
  getUsersByStatus: (status: UserStatus | "All") => User[];
  getActiveUsers: () => User[];
  refreshUsers: () => void;
}

// === CONTEXT ===
const UsersContext = createContext<UsersContextType>({
  users: [],
  stats: {
    students: 0,
    staff: 0,
    admins: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    total: 0,
  },
  loading: true,
  error: null,
  getUserById: () => undefined,
  getUserByUid: () => undefined,
  getUsersByRole: () => [],
  getUsersByStatus: () => [],
  getActiveUsers: () => [],
  refreshUsers: () => {},
});

export const useUsers = () => useContext(UsersContext);

// === PROVIDER ===
export const UsersProvider = ({ children }: { children: React.ReactNode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    students: 0,
    staff: 0,
    admins: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from users
  const calculateStats = (userList: User[]): UserStats => {
    const newStats: UserStats = {
      students: 0,
      staff: 0,
      admins: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
      total: userList.length,
    };

    userList.forEach((user) => {
      // Count by role
      if (user.role === "student") newStats.students++;
      if (user.role === "staff") newStats.staff++;
      if (user.role === "admin") newStats.admins++;

      // Count by status
      if (user.status === "active") newStats.active++;
      if (user.status === "inactive") newStats.inactive++;
      if (user.status === "suspended") newStats.suspended++;
    });

    return newStats;
  };

  useEffect(() => {
    console.log("✅ UsersContext Mounted - Loading users");

    // Subscribe to users collection with real-time updates
    const unsubscribe = onSnapshot(
      query(collection(db, "users"), orderBy("name", "asc")),
      (snapshot) => {
        const list: User[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();

            return {
              id: data.id || doc.id,
              uid: doc.id,
              email: data.email || "",
              name: data.name || "",
              role: (data.role as UserRole) || "student",
              course: data.course || "",
              contactNumber: data.contactNumber || "",
              status: (data.status as UserStatus) || "active",
              imageUrl: data.imageUrl || "",
              imagePath: data.imagePath || "",
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            };
          })
          .filter((user) => user.role !== "admin"); // Filter out admins

        setUsers(list);
        setStats(calculateStats(list));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ Error loading users:", err);
        setError("Failed to load users");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      console.log("❌ UsersContext Unmounted");
    };
  }, []);

  // Helper: Get user by ID
  const getUserById = (id: string): User | undefined => {
    return users.find((user) => user.id === id);
  };

  // Helper: Get user by UID
  const getUserByUid = (uid: string): User | undefined => {
    return users.find((user) => user.uid === uid);
  };

  // Helper: Filter users by role
  const getUsersByRole = (role: UserRole | "All"): User[] => {
    if (role === "All") {
      return users;
    }
    return users.filter((user) => user.role === role);
  };

  // Helper: Filter users by status
  const getUsersByStatus = (status: UserStatus | "All"): User[] => {
    if (status === "All") {
      return users;
    }
    return users.filter((user) => user.status === status);
  };

  // Helper: Get only active users
  const getActiveUsers = (): User[] => {
    return users.filter((user) => user.status === "active");
  };

  // Helper: Manual refresh (for compatibility with existing code)
  const refreshUsers = () => {
    // With real-time listener, this is handled automatically
    // But we keep this for API compatibility
    console.log("🔄 Manual refresh requested (handled by real-time listener)");
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        stats,
        loading,
        error,
        getUserById,
        getUserByUid,
        getUsersByRole,
        getUsersByStatus,
        getActiveUsers,
        refreshUsers,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};
