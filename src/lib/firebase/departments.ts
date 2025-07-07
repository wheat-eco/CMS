
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
} from "firebase/firestore";
import { db } from "./config";
import type { Department } from "../types";

// Get a reference to the departments subcollection for a given organization
const getDepartmentsCollection = (orgId: string) => {
  return collection(db, "organizations", orgId, "departments");
};

// Subscribe to real-time updates for departments
export function subscribeToDepartments(
  orgId: string,
  callback: (departments: Department[]) => void
) {
  const departmentsCollection = getDepartmentsCollection(orgId);
  const q = query(departmentsCollection);

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const departments = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Department)
    );
    callback(departments);
  });

  return unsubscribe;
}

// Fetch all departments for a given organization (one-time read)
export async function getDepartmentsForOrganization(orgId: string): Promise<Department[]> {
    const departmentsCollection = getDepartmentsCollection(orgId);
    const q = query(departmentsCollection);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Department));
}

// Add a new department
export async function addDepartment(
  orgId: string,
  departmentData: Omit<Department, "id">
) {
  const departmentsCollection = getDepartmentsCollection(orgId);
  return await addDoc(departmentsCollection, {
    ...departmentData,
    createdAt: serverTimestamp(),
  });
}

// Update an existing department
export async function updateDepartment(
  orgId: string,
  departmentId: string,
  data: Partial<Omit<Department, "id">>
) {
  const departmentDoc = doc(db, "organizations", orgId, "departments", departmentId);
  return await updateDoc(departmentDoc, data);
}

// Delete a department
export async function deleteDepartment(orgId: string, departmentId: string) {
  const departmentDoc = doc(db, "organizations", orgId, "departments", departmentId);
  return await deleteDoc(departmentDoc);
}
