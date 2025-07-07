
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./config";
import type { UserProfile } from "@/lib/types";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return { uid, ...userSnap.data() } as UserProfile;
    } else {
        console.warn("No such user profile!");
        return null;
    }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(db, "users", uid);
    return await updateDoc(userRef, data);
}

export async function deleteUserDocument(uid: string) {
    const userRef = doc(db, "users", uid);
    return await deleteDoc(userRef);
}

// Fetch users from an organization, optionally filtering by role
export async function getOrganizationUsers(orgId: string, role?: UserProfile['role']): Promise<UserProfile[]> {
  let q = query(
    collection(db, "users"),
    where("orgId", "==", orgId)
  );

  if (role) {
    q = query(q, where("role", "==", role));
  }
  
  const querySnapshot = await getDocs(q);
  const users = querySnapshot.docs.map(doc => {
      return {
        uid: doc.id,
        ...doc.data(),
      } as UserProfile;
    });
  return users;
}

export function subscribeToOrganizationUsers(
  orgId: string,
  callback: (users: UserProfile[]) => void,
  status?: UserProfile['status']
) {
  let q = query(
    collection(db, "users"),
    where("orgId", "==", orgId)
  );

  if (status) {
    q = query(q, where("status", "==", status));
  }

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => {
      return {
        uid: doc.id,
        ...doc.data(),
      } as UserProfile;
    });
    callback(users);
  });

  return unsubscribe;
}
