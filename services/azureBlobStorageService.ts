import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import dotenv from 'dotenv';
import path from 'path';

// Ensure local .env is loaded when this module initializes (server may import
// this file before the main app loads dotenv). This guarantees env vars are
// available during module initialization in development.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Azure Storage configuration from environment variables
const AZURE_STORAGE_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const AZURE_STORAGE_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';

// Container names for different data types
const APPLICATIONS_CONTAINER = 'applications';
const FACT_SHEETS_CONTAINER = 'fact-sheets';
const ANALYSIS_CONTAINER = 'analysis';
const POLICIES_CONTAINER = 'policies';
const DATA_CONTAINER = 'data';

let blobServiceClient: BlobServiceClient | null = null;

/**
 * Initialize the Azure Blob Service Client
 */
function getBlobServiceClient(): BlobServiceClient {
  if (blobServiceClient) {
    return blobServiceClient;
  }

  try {
    // Option 1: Use connection string if available
    if (AZURE_STORAGE_CONNECTION_STRING) {
      blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
      console.log('✓ Azure Blob Storage initialized with connection string');
      return blobServiceClient;
    }

    // Option 2: Use account name and key
    if (AZURE_STORAGE_ACCOUNT && AZURE_STORAGE_KEY) {
      const sharedKeyCredential = new StorageSharedKeyCredential(
        AZURE_STORAGE_ACCOUNT,
        AZURE_STORAGE_KEY
      );
      blobServiceClient = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
        sharedKeyCredential
      );
      console.log('✓ Azure Blob Storage initialized with account key');
      return blobServiceClient;
    }

    // Option 3: Use Managed Identity (for Azure App Service)
    if (AZURE_STORAGE_ACCOUNT) {
      const defaultCredential = new DefaultAzureCredential();
      blobServiceClient = new BlobServiceClient(
        `https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
        defaultCredential
      );
      console.log('✓ Azure Blob Storage initialized with Managed Identity');
      return blobServiceClient;
    }

    throw new Error('Azure Storage credentials not configured. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME');
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage:', error);
    throw error;
  }
}

/**
 * Get or create a container
 */
async function getContainerClient(containerName: string): Promise<ContainerClient> {
  const serviceClient = getBlobServiceClient();
  const containerClient = serviceClient.getContainerClient(containerName);
  
  // Create container if it doesn't exist
  try {
    await containerClient.createIfNotExists({
      access: undefined
    });
  } catch (error) {
    console.warn(`Container ${containerName} may already exist:`, error);
  }
  
  return containerClient;
}

/**
 * Upload JSON data to a blob
 */
export async function uploadBlob(containerName: string, blobName: string, data: any): Promise<void> {
  try {
    const containerClient = await getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const jsonString = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/json'
      }
    });
    
    console.log(`✓ Uploaded blob: ${containerName}/${blobName}`);
  } catch (error) {
    console.error(`Failed to upload blob ${containerName}/${blobName}:`, error);
    throw error;
  }
}

/**
 * Download JSON data from a blob
 */
export async function downloadBlob(containerName: string, blobName: string): Promise<any | null> {
  try {
    const containerClient = await getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    const downloadResponse = await blockBlobClient.download(0);
    
    if (!downloadResponse.readableStreamBody) {
      return null;
    }
    
    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    
    const content = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return null; // Blob not found
    }
    console.error(`Failed to download blob ${containerName}/${blobName}:`, error);
    throw error;
  }
}

/**
 * List all blobs in a container
 */
export async function listBlobs(containerName: string): Promise<string[]> {
  try {
    const containerClient = await getContainerClient(containerName);
    const blobNames: string[] = [];
    
    for await (const blob of containerClient.listBlobsFlat()) {
      blobNames.push(blob.name);
    }
    
    return blobNames;
  } catch (error) {
    console.error(`Failed to list blobs in ${containerName}:`, error);
    throw error;
  }
}

/**
 * Delete a blob
 */
export async function deleteBlob(containerName: string, blobName: string): Promise<void> {
  try {
    const containerClient = await getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
    console.log(`✓ Deleted blob: ${containerName}/${blobName}`);
  } catch (error) {
    console.error(`Failed to delete blob ${containerName}/${blobName}:`, error);
    throw error;
  }
}

/**
 * Check if a blob exists
 */
export async function blobExists(containerName: string, blobName: string): Promise<boolean> {
  try {
    const containerClient = await getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    return await blockBlobClient.exists();
  } catch (error) {
    console.error(`Failed to check blob existence ${containerName}/${blobName}:`, error);
    return false;
  }
}

// Application-specific helpers
export const saveApplication = (filename: string, data: any) => 
  uploadBlob(APPLICATIONS_CONTAINER, `${filename}.json`, data);

export const loadApplication = (filename: string) => 
  downloadBlob(APPLICATIONS_CONTAINER, `${filename}.json`);

export const listApplications = () => 
  listBlobs(APPLICATIONS_CONTAINER);

export const deleteApplication = (filename: string) => 
  deleteBlob(APPLICATIONS_CONTAINER, `${filename}.json`);

// Fact sheet-specific helpers
export const saveFactSheet = (filename: string, data: any) => 
  uploadBlob(FACT_SHEETS_CONTAINER, `${filename}.json`, data);

export const loadFactSheet = (filename: string) => 
  downloadBlob(FACT_SHEETS_CONTAINER, `${filename}.json`);

export const listFactSheets = () => 
  listBlobs(FACT_SHEETS_CONTAINER);

export const deleteFactSheet = (filename: string) => 
  deleteBlob(FACT_SHEETS_CONTAINER, `${filename}.json`);

// Analysis-specific helpers
export const saveAnalysis = (filename: string, data: any) => 
  uploadBlob(ANALYSIS_CONTAINER, `${filename}.json`, data);

export const loadAnalysis = (filename: string) => 
  downloadBlob(ANALYSIS_CONTAINER, `${filename}.json`);

export const listAnalyses = () => 
  listBlobs(ANALYSIS_CONTAINER);

export const deleteAnalysis = (filename: string) => 
  deleteBlob(ANALYSIS_CONTAINER, `${filename}.json`);

// Generic data storage helpers
export const saveData = (key: string, data: any) => 
  uploadBlob(DATA_CONTAINER, `${key}.json`, data);

export const loadData = (key: string) => 
  downloadBlob(DATA_CONTAINER, `${key}.json`);

export const deleteData = (key: string) => 
  deleteBlob(DATA_CONTAINER, `${key}.json`);

// Policy document helpers (for .docx files)
export const savePolicyDocument = (filename: string, buffer: Buffer) => 
  uploadBlob(POLICIES_CONTAINER, filename, buffer);

export const loadPolicyDocument = (filename: string) => 
  downloadBlob(POLICIES_CONTAINER, filename);

export const listPolicyDocuments = () => 
  listBlobs(POLICIES_CONTAINER);
