import firebase from "firebase/compat/app"; // Using compat for v8 syntax
import "firebase/compat/auth"; // ADDED: For Firebase Authentication
import "firebase/compat/firestore";
// Using firebase from "firebase/compat/app" for Timestamp type

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyAy-bIstBgMuphF23POhPWwrG1b_vaKDFA",
  authDomain: "ai-app-61cc3.firebaseapp.com",
  projectId: "ai-app-61cc3",
  storageBucket: "ai-app-61cc3.firebasestorage.app",
  messagingSenderId: "301537158920",
  appId: "1:301537158920:web:80fcf54d0472cda6a2eebd",
  measurementId: "G-1ZMV0YCVDY"
};

let app: firebase.app.App;

export const initializeFirebase = () => {
  if (!firebase.apps.length) {
    console.log("Attempting to initialize Firebase with config:", firebaseConfig);
    app = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized");
  } else {
    app = firebase.app(); // if already initialized, use that one
    console.log("Firebase already initialized");
  }
  return app;
};

export const auth = () => firebase.auth();
export const firestore = () => {
  return firebase.firestore();
};
// --- End Firebase Initialization ---


// --- Firestore Data Interfaces ---
// Defined directly in this file to avoid issues with symlinked types.ts

/**
 * Represents a user profile stored in the 'users' collection.
 */
export interface UserProfileData {
  id: string; // Firebase Auth User UID
  email: string | null;
  name?: string;
  credits: number;
  subscriptionStatus: "free" | "premium_monthly" | "premium_annual"; // Example statuses
  stripeCustomerId?: string; // To link with Stripe for subscriptions/payments
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

/**
 * Represents a record of content generation stored in the 'generations' collection.
 */
export interface GenerationRecordData {
  id?: string; // Firestore document ID
  userId: string;
  contentType: "image" | "video" | "voice" | "text";
  promptText?: string;
  referenceFileUrl?: string;
  resultStoragePath: string; // Path in Firebase Storage
  resultUrl: string; // Publicly accessible URL (e.g., Firebase downloadURL)
  creditsUsed: number;
  modelUsed?: string;
  parameters?: {
    size?: string;
    style?: string;
    quality?: string;
    [key: string]: any;
  };
  revisedPrompt?: string | null;
  status: "pending" | "processing" | "completed" | "failed"; // Added processing state
  isPublic?: boolean;
  createdAt?: firebase.firestore.Timestamp;
  updatedAt?: firebase.firestore.Timestamp;
}

/**
 * Represents a payment transaction stored in the 'payments' collection.
 */
export interface PaymentRecordData {
  id?: string; // Firestore document ID (auto-generated if not provided on creation)
  userId: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  amount: number; // Amount paid, in cents
  currency: string; // e.g., 'usd'
  creditsPurchased?: number;
  subscriptionType?: "premium_monthly" | "premium_annual";
  status: "pending" | "succeeded" | "failed";
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}

// Original content continues below, ensure firebase import is present and correct.


// IMPORTANT: Firebase must be initialized before this service is used.
// This is typically done in a central firebaseConfig.ts file.
// e.g., import { initializeApp } from './firebaseConfig'; initializeApp();

// Replace the local db constant with the exported firestore function for consistency
// const db = () => firebase.firestore(); 

// --- User Profile Functions ---

/**
 * Creates a new user profile document in Firestore.
 * This should be called when a new user signs up.
 * Assigns default credits and free subscription status.
 */
export const createUserProfile = async (
  userId: string,
  data: { email: string | null; name?: string }
): Promise<void> => {
  const userRef = firestore().collection("users").doc(userId);
  const now = firebase.firestore.Timestamp.now();
  const profileData: UserProfileData = {
    id: userId,
    email: data.email,
    name: data.name || "",
    credits: 10, // Default starting credits
    subscriptionStatus: "free",
    createdAt: now,
    updatedAt: now,
    // stripeCustomerId will be set upon first payment/subscription
  };
  try {
    await userRef.set(profileData);
    console.log(`User profile created for ${userId} with email ${data.email}`);
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

/**
 * Fetches a user profile from Firestore.
 */
export const getUserProfile = async (userId: string): Promise<UserProfileData | null> => {
  const userRef = firestore().collection("users").doc(userId);
  try {
    const doc = await userRef.get();
    if (!doc.exists) {
      console.warn(`No profile found for user ${userId}`);
      return null;
    }
    return doc.data() as UserProfileData;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

/**
 * Updates a user profile in Firestore.
 * Ensures `updatedAt` is set.
 */
export const updateUserProfile = async (
  userId: string,
  data: Partial<Omit<UserProfileData, "id" | "createdAt">>
): Promise<void> => {
  const userRef = firestore().collection("users").doc(userId);
  try {
    await userRef.update({
      ...data,
      updatedAt: firebase.firestore.Timestamp.now(),
    });
    console.log(`User profile updated for ${userId}`);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// --- Firestore Credit Deduction ---
/**
 * Atomically deducts a specified amount of credits from a user's profile.
 */
export const deductCreditsFromUser = async (userId: string, amountToDeduct: number): Promise<void> => {
  if (amountToDeduct <= 0) {
    console.warn("Amount to deduct must be positive.");
    return; // Or throw error
  }
  const userRef = firestore().collection("users").doc(userId);
  try {
    // Atomically decrement the credits field
    // Note: This doesn't prevent credits from going below zero on its own
    // Additional checks might be needed in the UI or a Cloud Function trigger if strict non-negative is required.
    await userRef.update({
      credits: firebase.firestore.FieldValue.increment(-amountToDeduct),
      updatedAt: firebase.firestore.Timestamp.now(), // Also update the updatedAt timestamp
    });
    console.log(`Successfully deducted ${amountToDeduct} credits from user ${userId}.`);
  } catch (error) {
    console.error(`Error deducting credits from user ${userId}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

// --- Generation Record Functions ---

/**
 * Adds a new content generation record to Firestore.
 * Assigns `createdAt`, `updatedAt`, and a unique ID.
 */
export const addGenerationRecord = async (
  // The data object now directly matches Omit<GenerationRecordData, 'id' | 'createdAt' | 'updatedAt'> but must include userId.
  generationData: Omit<GenerationRecordData, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }
): Promise<string> => {
  const now = firebase.firestore.Timestamp.now();
  const recordRef = firestore().collection("generations").doc(); // Auto-generate ID
  
  const newRecord: GenerationRecordData = {
    ...generationData, // Spread all incoming data first
    id: recordRef.id,    // Override/set specific fields
    status: generationData.status || "completed", // Default to completed if not provided
    createdAt: now,
    updatedAt: now,
  };

  try {
    await recordRef.set(newRecord);
    console.log(`Generation record ${recordRef.id} added for user ${generationData.userId}`);
    return recordRef.id;
  } catch (error) {
    console.error("Error adding generation record:", error);
    throw error;
  }
};

/**
 * Fetches all generation records for a user, ordered by creation date (descending).
 */
export const getUserGenerations = async (userId: string): Promise<GenerationRecordData[]> => {
  const generationsRef = firestore().collection("generations").where("userId", "==", userId).orderBy("createdAt", "desc");
  try {
    const snapshot = await generationsRef.get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => doc.data() as GenerationRecordData);
  } catch (error) {
    console.error("Error fetching user generations:", error);
    throw error;
  }
};

// --- Payment Record Functions ---

/**
 * Adds a new payment record to Firestore.
 * Assigns `createdAt`, `updatedAt`, and a unique ID.
 */
export const addPaymentRecord = async (
  userId: string,
  paymentData: Omit<PaymentRecordData, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> => {
  const now = firebase.firestore.Timestamp.now();
  const recordRef = firestore().collection("payments").doc(); // Auto-generate ID
  const newRecord: PaymentRecordData = {
    id: recordRef.id,
    userId,
    ...paymentData,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await recordRef.set(newRecord);
    console.log(`Payment record ${recordRef.id} added for user ${userId}`);
    return recordRef.id;
  } catch (error) {
    console.error("Error adding payment record:", error);
    throw error;
  }
};

/**
 * Fetches all payment records for a user, ordered by creation date (descending).
 */
export const getUserPayments = async (userId: string): Promise<PaymentRecordData[]> => {
  const paymentsRef = firestore().collection("payments").where("userId", "==", userId).orderBy("createdAt", "desc");
  try {
    const snapshot = await paymentsRef.get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => doc.data() as PaymentRecordData);
  } catch (error) {
    console.error("Error fetching user payments:", error);
    throw error;
  }
};

/*
 Reminder: Firebase Initialization has been moved to the top of this file.

 Then, in your main application entry point (e.g., `ui/src/main.tsx` or `ui/src/components/AppProvider.tsx`),
 import and call `initializeFirebase();` before any Firestore operations are attempted.
 */
