import { auth, db } from '@/lib/firebase/config';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { deleteUserDocument, getUserProfile, getOrganizationUsers } from './firestore';
import { createNotification } from './notifications';

export async function signUpAndCreateProfile(orgName: string, adminName: string, email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create the organization document. The org's ID is the admin's UID.
    const orgRef = doc(db, "organizations", user.uid); 
    await setDoc(orgRef, {
        name: orgName,
        ownerId: user.uid,
        theme: 'green',
        createdAt: serverTimestamp(),
    });

    // Create the user profile for the admin
    const userRef = doc(db, "users", user.uid);
    const userProfile = {
        email: user.email!,
        name: adminName,
        role: 'admin',
        orgId: user.uid, // Admin's orgId is their own UID
        status: 'active',
        notificationPreferences: {
            ticketUpdates: true,
            newComments: true,
            userApprovals: true,
        },
    };
    await setDoc(userRef, {
        ...userProfile,
        createdAt: serverTimestamp(),
    });

    // --- NEW: Seed default data for a smoother onboarding ---

    // Create a default "General" department
    const departmentsCollection = collection(db, "organizations", user.uid, "departments");
    await addDoc(departmentsCollection, {
        name: 'General',
        supervisorId: user.uid, // Assign the admin as the default supervisor
        supervisorName: adminName,
        createdAt: serverTimestamp(),
    });

    // Assign the admin to the "General" department in their profile
    await setDoc(userRef, { department: 'General' }, { merge: true });


    // Create a default "General Inquiry" category
    const categoriesCollection = collection(db, "organizations", user.uid, "categories");
    await addDoc(categoriesCollection, {
        name: 'General Inquiry',
        description: 'For issues that don\'t fit into other categories.',
        createdAt: serverTimestamp(),
    });

    return userCredential;
}

export async function registerEmployee(fullName: string, email: string, password: string, orgId: string, department: string, phone?: string) {
     const userCredential = await createUserWithEmailAndPassword(auth, email, password);
     const user = userCredential.user;

    const userRef = doc(db, "users", user.uid);
    const userProfile = {
        email: user.email!,
        name: fullName,
        role: 'employee' as const,
        orgId,
        department,
        phone: phone || '',
        status: 'pending' as const,
        notificationPreferences: {
            ticketUpdates: true,
            newComments: true,
        },
        createdAt: serverTimestamp(),
    };
    await setDoc(userRef, userProfile);
    
    // Notify all admins of the new pending user
    try {
        const admins = await getOrganizationUsers(orgId, 'admin');
        const notificationPromises = admins.map(admin => 
            createNotification(admin.uid, orgId, {
                notificationType: 'newUserPending',
                newUserName: fullName,
                userName: admin.name,
                orgName: orgId,
            })
        );
        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Failed to create notifications for admins about new user:", error);
    }

    return userCredential;
}

export async function signIn(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Post-authentication check for user status
    const profile = await getUserProfile(user.uid);

    if (profile?.status === 'inactive') {
        await signOut(auth); // Immediately sign out the inactive user
        throw new Error("Your account has been suspended. Please contact your administrator.");
    }
    
    // For pending users, we allow the login but handle redirection on the client-side.
    return userCredential;
}

export async function signOutUser() {
    return await signOut(auth);
}

export async function updateUserPassword(newPassword: string) {
    const user = auth.currentUser;
    if (user) {
        return await updatePassword(user, newPassword);
    }
    throw new Error("No authenticated user found.");
}

export async function reauthenticate(password: string) {
    const user = auth.currentUser;
    if (!user || !user.email) {
        throw new Error("No authenticated user found or user has no email.");
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    return await reauthenticateWithCredential(user, credential);
}

export async function deleteCurrentUser() {
    const user = auth.currentUser;
    if (user) {
        await deleteUserDocument(user.uid);
        await deleteUser(user);
        return;
    }
    throw new Error("No authenticated user found.");
}
