import { create } from 'zustand';
import {
  GenerationRecordData,
  addGenerationRecord as addGenerationRecordToDb,
  getUserGenerations as fetchUserGenerationsFromDb,
} from './firestoreService'; // Assuming firestoreService.ts is in the same directory

interface GenerationsState {
  generations: GenerationRecordData[];
  isLoading: boolean;
  error: Error | null;
  fetchUserGenerations: (userId: string) => Promise<void>;
  // Adds a new generation to DB and then adds it to the store
  addGeneration: (
    // userId is now part of the data object to align with GenerationRecordData
    data: Omit<GenerationRecordData, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }
  ) => Promise<string | undefined>; // Returns the ID of the new record or undefined on error
  clearGenerations: () => void;
}

export const useGenerationsStore = create<GenerationsState>((set, get) => ({
  generations: [],
  isLoading: false,
  error: null,

  fetchUserGenerations: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const generationRecords = await fetchUserGenerationsFromDb(userId);
      set({ generations: generationRecords, isLoading: false });
    } catch (error) {
      console.error('Error fetching user generations in store:', error);
      set({ error: error as Error, isLoading: false });
    }
  },

  addGeneration: async (
    data: Omit<GenerationRecordData, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }
  ) => {
    set({ isLoading: true, error: null });
    try {
      // Pass the data object (which now includes userId) directly to addGenerationRecordToDb
      const newRecordId = await addGenerationRecordToDb(data);
      
      // Re-fetch to update the store with the new record including server-generated fields
      // Use userId from the data object for re-fetching
      await get().fetchUserGenerations(data.userId);
      set({ isLoading: false });

      console.log(`Generation record ${newRecordId} processed, store updated by re-fetching for user ${data.userId}.`);
      return newRecordId;

    } catch (error) {
      console.error('Error adding generation record in store:', error);
      set({ error: error as Error, isLoading: false });
      return undefined;
    }
  },

  clearGenerations: () => {
    set({ generations: [], isLoading: false, error: null });
  },
}));

// Example usage:
// const { generations, isLoading, fetchUserGenerations, addGeneration } = useGenerationsStore();
// useEffect(() => {
//   if (userProfile?.id) { // Assuming userProfile is available from useUserStore
//     fetchUserGenerations(userProfile.id);
//   }
// }, [userProfile, fetchUserGenerations]);
