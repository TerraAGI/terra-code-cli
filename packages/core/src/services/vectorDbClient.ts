// packages/core/src/services/vectorDbClient.ts
import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://13.61.2.7:8000';
// Note: Auth header X-API-Key: NOTNEEDED is not required based on the provided information.

// Interfaces for TypeScript
interface UploadResponse {
  success: boolean;
  data?: {
    chunks_created: number;
  };
  error?: string;
}

interface SearchResult {
  // Define the structure of a search result based on your API's response
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface SearchResponse {
  success: boolean;
  results?: SearchResult[];
  total_results?: number;
  collection_name?: string;
  error?: string;
}

/**
 * Uploads a document file to a specified collection in the vector database.
 * @param fileBuffer - The document file content as a Buffer.
 * @param fileName - The name of the file being uploaded.
 * @param collectionName - The name of the collection to store the document in.
 * @returns A promise that resolves to the API response or an error object.
 */
export async function uploadDocument(
  fileBuffer: Buffer,
  fileName: string,
  collectionName: string
): Promise<UploadResponse> {
  const formData = new FormData();
  // Create a Blob from the Buffer. In Node.js, we need to specify type and size implicitly via the Blob constructor.
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, fileName);
  formData.append('collection_name', collectionName);

  try {
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        // Let axios set Content-Type: multipart/form-data with boundary
        // Do not manually set Content-Type header for FormData
      },
    });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    // Handle network errors, non-2xx responses, etc.
    if (axiosError.response) {
      // Server responded with a status code outside 2xx range
      // Axios responses have data, statusText
      const errorMessage = axiosError.response.data ? JSON.stringify(axiosError.response.data) : axiosError.response.statusText;
      return {
        success: false,
        error: `API Error: ${axiosError.response.status} - ${errorMessage}`,
      };
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        success: false,
        error: `Network Error: No response received.`,
      };
    } else {
      // Something else happened, potentially during request setup
      // The error object itself might have a message
      const generalError = error as Error; // Attempt a safer cast for the base error message
      return {
        success: false,
        error: `Request Setup Error: ${generalError.message || 'Unknown error occurred'}`,
      };
    }
  }
}

/**
 * Searches for documents relevant to a query within a specified collection.
 * @param query - The search text.
 * @param collectionName - The name of the collection to search in.
 * @param limit - Maximum number of results to return.
 * @returns A promise that resolves to the API response or an error object.
 */
export async function searchDocuments(
  query: string,
  collectionName: string,
  limit: number = 5
): Promise<SearchResponse> {
  const payload = {
    query,
    collection_name: collectionName,
    limit,
  };

  try {
    const response = await axios.post(`${BASE_URL}/search`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    // Handle network errors, non-2xx responses, etc.
    if (axiosError.response) {
      // Server responded with a status code outside 2xx range
       // Axios responses have data, statusText
       const errorMessage = axiosError.response.data ? JSON.stringify(axiosError.response.data) : axiosError.response.statusText;
       return {
         success: false,
         error: `API Error: ${axiosError.response.status} - ${errorMessage}`,
       };
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        success: false,
        error: `Network Error: No response received.`,
      };
    } else {
      // Something else happened, potentially during request setup
       // The error object itself might have a message
       const generalError = error as Error; // Attempt a safer cast for the base error message
       return {
         success: false,
         error: `Request Setup Error: ${generalError.message || 'Unknown error occurred'}`,
       };
    }
  }
}