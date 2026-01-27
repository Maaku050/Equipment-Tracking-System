import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/firebase/firebaseConfig";

export const deleteEquipmentIfNotBorrowed = async (equipmentId: string) => {
  // 🔎 Check transactions where this equipment is used and still active
  const txQuery = query(
    collection(db, "transactions"),
    where("status", "in", [
      "Request",
      "Ongoing",
      "Overdue",
      "Incomplete",
      "Incomplete and Overdue",
    ]),
  );

  const txSnap = await getDocs(txQuery);

  const isBorrowed = txSnap.docs.some((doc) => {
    const data = doc.data();
    return data.items?.some((item: any) => item.equipmentId === equipmentId);
  });

  if (isBorrowed) {
    throw new Error(
      "This equipment is currently used in an active transaction and cannot be deleted.",
    );
  }

  // 🗑️ Safe to delete
  await deleteDoc(doc(db, "equipment", equipmentId));
};
