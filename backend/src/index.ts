import 'dotenv/config';
 // @ts-ignore
import express from 'express';
 // @ts-ignore
import multer from 'multer';
 // @ts-ignore
import path from 'path';
 // @ts-ignore
import fs from 'fs';
 // @ts-ignore
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
 // @ts-ignore
import { QdrantVectorStore } from "@langchain/qdrant";
 // @ts-ignore
import { OpenAIEmbeddings } from "@langchain/openai";

// --- Basic Setup ---
const app = express();
const port = process.env.PORT || 3001; // Using a different port to avoid conflict with the chat server

// --- File Upload Configuration (Multer) ---
// Create a directory for uploads if it doesn't exist
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer to store uploaded files in the 'uploads/' directory
const storage = multer.diskStorage({
     // @ts-ignore
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
     // @ts-ignore
    filename: (req, file, cb) => {
        // Use the original filename for the stored file
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });


// --- Core Ingestion Logic ---
/**
 * Processes a PDF file, generates embeddings, and stores them in Qdrant.
 * @param {string} pdfFilePath - The local path to the PDF file.
 * @returns {Promise<boolean>} True if ingestion is successful, false otherwise.
 */
 // @ts-ignore
async function ingestPdf(pdfFilePath) {
    try {
        console.log(`Loading PDF from path: ${pdfFilePath}`);
        const loader = new PDFLoader(pdfFilePath);
        const docs = await loader.load();

        console.log(`Loaded ${docs.length} document(s) from the PDF.`);
        if (docs.length === 0) {
            console.error("No documents were loaded from the PDF. Check the file content.");
            return false;
        }

        console.log("Initializing OpenAI Embeddings...");
        const embeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-large',
          
        });

        console.log("Storing documents in Qdrant...");
        await QdrantVectorStore.fromDocuments(
            docs,
            embeddings, {
                url: process.env.QDRANT_URL || 'http://localhost:6333',
                collectionName: 'testing-collection', // The collection to store the vectors in
            }
        );

        console.log("Successfully ingested PDF and stored vectors in Qdrant.");
        return true;

    } catch (error) {
        console.error('Error during PDF ingestion:', error);
        return false;
    } finally {
        // --- Cleanup ---
        // Optional: Delete the file after processing to save space
        try {
            fs.unlinkSync(pdfFilePath);
            console.log(`Cleaned up uploaded file: ${pdfFilePath}`);
        } catch (cleanupError) {
            console.error(`Error cleaning up file ${pdfFilePath}:`, cleanupError);
        }
    }
}


// --- API Route for PDF Ingestion ---
// This route expects a single file upload with the field name 'pdf'
app.post('/ingest-pdf', upload.single('pdf'), async (req, res) => {
    // Check if a file was uploaded
     // @ts-ignore
    if (!req.file) {
        return res.status(400).json({
            error: 'No PDF file uploaded. Please upload a file with the key "pdf".'
        });
    }
 // @ts-ignore
    const pdfFilePath = req.file.path;

    try {
        const success = await ingestPdf(pdfFilePath);

        if (success) {
            res.json({
                success: true,
                // @ts-ignore
                message: `Successfully ingested ${req.file.originalname} into the vector store.`
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to process and ingest the PDF.'
            });
        }
    } catch (error) {
        console.error("An unexpected error occurred in the ingest-pdf route:", error);
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred.'
        });
    }
});


// --- Start the Server ---
app.listen(port, () => {
    console.log(`PDF Ingestion server is running on http://localhost:${port}`);
});