
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./config";
import type { Category } from "../types";

// Get a reference to the categories subcollection for a given organization
const getCategoriesCollection = (orgId: string) => {
  return collection(db, "organizations", orgId, "categories");
};

// Subscribe to real-time updates for categories
export function subscribeToCategories(
  orgId: string,
  callback: (categories: Category[]) => void
) {
  const categoriesCollection = getCategoriesCollection(orgId);
  const q = query(categoriesCollection);

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const categories = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Category)
    );
    callback(categories);
  });

  return unsubscribe;
}

// Fetch all categories for a given organization (one-time read)
export async function getCategoriesForOrganization(orgId: string): Promise<Category[]> {
    const categoriesCollection = getCategoriesCollection(orgId);
    const q = query(categoriesCollection);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Category));
}

// Add a new category
export async function addCategory(
  orgId: string,
  categoryData: Omit<Category, "id">
) {
  const categoriesCollection = getCategoriesCollection(orgId);
  return await addDoc(categoriesCollection, {
    ...categoryData,
    createdAt: serverTimestamp(),
  });
}

// Update an existing category
export async function updateCategory(
  orgId: string,
  categoryId: string,
  data: Partial<Omit<Category, "id">>
) {
  const categoryDoc = doc(db, "organizations", orgId, "categories", categoryId);
  return await updateDoc(categoryDoc, data);
}

// Delete a category
export async function deleteCategory(orgId: string, categoryId: string) {
  const categoryDoc = doc(db, "organizations", orgId, "categories", categoryId);
  return await deleteDoc(categoryDoc);
}
