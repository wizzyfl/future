import { create } from 'zustand';
import {
  UserProfileData,
  getUserProfile as fetchUserProfileFromDb,
  updateUserProfile as updateUserProfileInDb,
  createUserProfile as createUserProfileInDb,
  deductCreditsFromUser as deductCreditsFromUserInDb, // Import the new function
} from './firestoreService'; // Assuming firestoreService.ts is in the same directory

interface UserState {
  userProfile: UserProfileData | null;
  isLoading: boolean;
  error: Error | null;
  fetchUserProfile: (userId: string) => Promise<void>;
  // Creates a new profile in DB and then sets it in the store
  initializeNewUserProfile: (userId: string, data: { email: string | null; name?: string }) => Promise<void>;
  // Updates profile in DB and then updates it in the store
  updateUserProfile: (userId: string, data: Partial<Omit<UserProfileData, 'id' | 'createdAt'>>) => Promise<void>;
  clearUserProfile: () => void;
  // Local optimistic update for credits, should be followed by a backend-validated update
  decrementCredits: (amount: number) => void;
  incrementCredits: (amount: number) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userProfile: null,
  isLoading: false,
  error: null,

  fetchUserProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await fetchUserProfileFromDb(userId);
      set({ userProfile: profile, isLoading: false });
      if (!profile) {
        console.log(`No profile found for ${userId}, user might need to complete profile creation.`);
      }
    } catch (error) {
      console.error('Error fetching user profile in store:', error);
      set({ error: error as Error, isLoading: false });
    }
  },

  initializeNewUserProfile: async (userId: string, data: { email: string | null; name?: string }) => {
    set({ isLoading: true, error: null });
    try {
      // Create in DB first
      await createUserProfileInDb(userId, data);
      // Then fetch the newly created profile to ensure we have all default fields (like credits)
      const profile = await fetchUserProfileFromDb(userId);
      set({ userProfile: profile, isLoading: false });
      console.log('User profile initialized and set in store:', profile);
    } catch (error) {
      console.error('Error initializing new user profile in store:', error);
      set({ error: error as Error, isLoading: false });
      throw error; // Re-throw to be caught by UI if needed
    }
  },

  updateUserProfile: async (userId: string, data: Partial<Omit<UserProfileData, 'id' | 'createdAt'>>) => {
    set({ isLoading: true, error: null });
    const currentProfile = get().userProfile;
    try {
      await updateUserProfileInDb(userId, data);
      // Optimistically update or re-fetch
      const updatedProfileData = { ...currentProfile, ...data, id: userId } as UserProfileData;
      // Ensure updatedAt is part of data or re-fetch for accurate timestamp
      // For simplicity here, we're doing an optimistic update. For critical fields, re-fetch.
      set({ userProfile: updatedProfileData, isLoading: false });
      console.log('User profile updated in store:', updatedProfileData);
    } catch (error) {
      console.error('Error updating user profile in store:', error);
      set({ error: error as Error, isLoading: false });
      throw error; // Re-throw to be caught by UI if needed
    }
  },

  clearUserProfile: () => {
    set({ userProfile: null, isLoading: false, error: null });
  },

  decrementCredits: async (amount: number): Promise<void> => {
    const currentProfile = get().userProfile;
    if (!currentProfile || currentProfile.credits < amount) {
      console.warn(
        'Attempted to decrement credits below available amount or no user profile.',
      );
      // Optionally throw an error to be caught by the UI
      throw new Error("Insufficient credits or no user profile.");
    }

    // Optimistic update first
    set(state => ({
      userProfile: state.userProfile
        ? {
            ...state.userProfile,
            credits: state.userProfile.credits - amount,
          }
        : null,
    }));

    try {
      // Then, call Firestore to make the actual deduction
      await deductCreditsFromUserInDb(currentProfile.id, amount);
      console.log(`Successfully persisted credit deduction for user ${currentProfile.id}`);
      // Optionally, re-fetch profile to ensure sync, though atomic op should be fine
      // get().fetchUserProfile(currentProfile.id);
    } catch (error) {
      console.error(
        `Failed to persist credit deduction for user ${currentProfile.id}:`,
        error,
      );
      // Revert optimistic update on failure
      set(state => ({
        userProfile: state.userProfile
          ? {
              ...state.userProfile,
              credits: state.userProfile.credits + amount, // Add back the deducted amount
            }
          : null,
      }));
      throw error; // Re-throw to allow UI to handle
    }
  },

  incrementCredits: (amount: number) => {
    set(state => {
      if (state.userProfile) {
        return {
          userProfile: {
            ...state.userProfile,
            credits: state.userProfile.credits + amount,
          },
        };
      }
      console.warn('Attempted to increment credits with no user profile.');
      return state;
    });
  },
}));

// Example usage:
// const { userProfile, isLoading, fetchUserProfile, clearUserProfile, decrementCredits } = useUserStore();
// useEffect(() => {
//   if (firebaseUser?.uid && !userProfile) {
//     fetchUserProfile(firebaseUser.uid);
//   }
// }, [firebaseUser, userProfile, fetchUserProfile]);
