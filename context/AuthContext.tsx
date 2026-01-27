// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "@/firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { UserRole, UserStatus } from "@/context/UsersContext";
import { collection, query, where, getDocs } from "firebase/firestore";

interface AuthUser {
  uid: string;
  email: string;
  role: "student" | "staff" | "admin";
  status: "active" | "inactive" | "suspended";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      async (fbUser: FirebaseUser | null) => {
        if (!fbUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "users"),
          where("uid", "==", fbUser.uid),
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          await auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        const data = querySnapshot.docs[0].data();
        setUser({
          uid: fbUser.uid,
          email: fbUser.email || "",
          role: data.role,
          status: data.status,
        });
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
