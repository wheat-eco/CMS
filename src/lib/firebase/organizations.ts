
import { collection, getDocs, query, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";
import type { Organization } from "../types";

export async function getOrganizations(): Promise<Organization[]> {
    const orgsCollection = collection(db, "organizations");
    const q = query(orgsCollection);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
    }));
}

export async function getOrganizationById(orgId: string): Promise<Organization | null> {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);

    if (orgSnap.exists()) {
        const data = orgSnap.data();
        return {
            id: orgSnap.id,
            ...data
        } as Organization;
    }
    return null;
}

export async function updateOrganization(orgId: string, data: Partial<Omit<Organization, 'id'>>) {
    const orgRef = doc(db, "organizations", orgId);
    return await updateDoc(orgRef, data);
}
