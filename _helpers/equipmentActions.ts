// _helpers/equipmentActions.ts
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/firebase/firebaseConfig";

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

  // 🗑️ Get equipment data to access imagePath
  const equipmentDoc = await getDoc(doc(db, "equipment", equipmentId));

  if (equipmentDoc.exists()) {
    const equipmentData = equipmentDoc.data();
    const imagePath = equipmentData.imagePath;

    // Delete the image from storage if it exists
    if (imagePath) {
      try {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
        console.log("✅ Equipment image deleted from storage:", imagePath);
      } catch (error: any) {
        // If the file doesn't exist, that's fine
        if (error.code === "storage/object-not-found") {
          console.log("ℹ️ Equipment image not found in storage:", imagePath);
        } else {
          console.error("⚠️ Error deleting equipment image:", error);
          // Don't throw - we still want to delete the document
        }
      }
    }
  }

  // Delete the equipment document
  await deleteDoc(doc(db, "equipment", equipmentId));
  console.log("✅ Equipment document deleted:", equipmentId);
};
