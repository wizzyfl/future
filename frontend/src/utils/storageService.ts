import firebase from "firebase/compat/app";
import "firebase/compat/storage"; // Import the Firebase Storage SDK

// IMPORTANT: Firebase must be initialized before this service is used, including Storage.
// This is typically done in a central firebaseConfig.ts file.
// e.g., import { initializeFirebase } from './firebaseConfig'; initializeFirebase();

const storage = () => firebase.storage();

/**
 * Uploads a file to Firebase Storage.
 *
 * @param userId - The ID of the user uploading the file, for path organization.
 * @param file - The File object to upload.
 * @param contentType - A string indicating the type of content (e.g., 'image', 'video', 'audio') for path organization.
 * @param onProgress - Optional callback function to track upload progress (receives a number 0-100).
 * @returns Promise<{ downloadURL: string, storagePath: string }>
 *          An object containing the public download URL of the uploaded file
 *          and its path within Firebase Storage.
 */
export const uploadFileToFirebase = async (
  userId: string,
  file: File,
  contentType: "image" | "video" | "audio" | "text_file" | "other", // More specific content types
  onProgress?: (progress: number) => void
): Promise<{ downloadURL: string; storagePath: string }> => {
  if (!userId) {
    throw new Error("User ID is required for uploading files.");
  }
  if (!file) {
    throw new Error("File object is required for uploading.");
  }

  // Create a unique file name to avoid collisions, including a timestamp
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
  const fileName = `${timestamp}_${sanitizedFileName}`;
  
  // Define the storage path
  // Example: generations/images/userId/timestamp_filename.jpg
  const storagePath = `generations/${contentType}/${userId}/${fileName}`;
  const fileRef = storage().ref(storagePath);

  console.log(`Uploading file to: ${storagePath}`);

  return new Promise((resolve, reject) => {
    const uploadTask = fileRef.put(file);

    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED,
      (snapshot) => {
        // Observe state change events such as progress, pause, and resume
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress}% done`);
        if (onProgress) {
          onProgress(progress);
        }
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log('Upload is paused');
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            console.log('Upload is running');
            break;
        }
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error("Firebase Storage upload error:", error);
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error("User doesn\'t have permission to access the object"));
            break;
          case 'storage/canceled':
            reject(new Error("User canceled the upload"));
            break;
          case 'storage/unknown':
            reject(new Error("Unknown error occurred, inspect error.serverResponse"));
            break;
          default:
            reject(error);
        }
      },
      async () => {
        // Handle successful uploads on complete
        try {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          console.log('File available at', downloadURL);
          resolve({ downloadURL, storagePath });
        } catch (error) {
          console.error("Error getting download URL:", error);
          reject(error);
        }
      }
    );
  });
};

/**
 * Deletes a file from Firebase Storage using its full storage path.
 *
 * @param storagePath - The full path to the file in Firebase Storage (e.g., 'generations/images/userId/filename.jpg').
 * @returns Promise<void>
 */
export const deleteFileFromFirebase = async (storagePath: string): Promise<void> => {
  if (!storagePath) {
    throw new Error("Storage path is required to delete a file.");
  }
  const fileRef = storage().ref(storagePath);

  try {
    await fileRef.delete();
    console.log(`File deleted successfully: ${storagePath}`);
  } catch (error) {
    console.error(`Error deleting file ${storagePath}:`, error);
    // Handle specific errors if needed, e.g., object-not-found
    if ((error as firebase.storage.FirebaseStorageError).code === 'storage/object-not-found') {
      console.warn(`File not found at path: ${storagePath}, skipping deletion.`);
      return; // Or rethrow if this is unexpected
    }
    throw error; // Re-throw other errors
  }
};

// Example Usage (Conceptual - to be used in actual generation flows):
/*
const handleFileUpload = async (userId: string, file: File, type: "image" | "video" | "audio") => {
  try {
    const { downloadURL, storagePath } = await uploadFileToFirebase(userId, file, type, (progress) => {
      console.log('Upload Progress:', progress);
      // Update UI with progress
    });

    // Now save `downloadURL` and `storagePath` to Firestore
    // e.g., using addGenerationRecord from firestoreService.ts
    await addGenerationRecord(userId, {
      contentType: type,
      promptText: "User prompt here", // Or get from input
      resultStoragePath: storagePath,
      creditsUsed: 1, // Example
      status: "completed",
      thumbnailUrl: type === 'image' || type === 'video' ? downloadURL : undefined,
      // other relevant fields
    });
    console.log('File uploaded and record saved!');

  } catch (error) {
    console.error('Upload and save process failed:', error);
    // Handle error in UI
  }
};
*/
