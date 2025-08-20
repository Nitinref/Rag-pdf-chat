"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// @ts-ignore
const express_1 = __importDefault(require("express"));
// @ts-ignore
const multer_1 = __importDefault(require("multer"));
// @ts-ignore
const path_1 = __importDefault(require("path"));
// @ts-ignore
const fs_1 = __importDefault(require("fs"));
// @ts-ignore
const pdf_1 = require("@langchain/community/document_loaders/fs/pdf");
// @ts-ignore
const qdrant_1 = require("@langchain/qdrant");
// @ts-ignore
const openai_1 = require("@langchain/openai");
// --- Basic Setup ---
const app = (0, express_1.default)();
const port = process.env.PORT || 3001; // Using a different port to avoid conflict with the chat server
// --- File Upload Configuration (Multer) ---
// Create a directory for uploads if it doesn't exist
const uploadDir = 'uploads/';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir);
}
// Configure multer to store uploaded files in the 'uploads/' directory
const storage = multer_1.default.diskStorage({
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
const upload = (0, multer_1.default)({ storage: storage });
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
        const loader = new pdf_1.PDFLoader(pdfFilePath);
        const docs = await loader.load();
        console.log(`Loaded ${docs.length} document(s) from the PDF.`);
        if (docs.length === 0) {
            console.error("No documents were loaded from the PDF. Check the file content.");
            return false;
        }
        console.log("Initializing OpenAI Embeddings...");
        const embeddings = new openai_1.OpenAIEmbeddings({
            model: 'text-embedding-3-large',
        });
        console.log("Storing documents in Qdrant...");
        await qdrant_1.QdrantVectorStore.fromDocuments(docs, embeddings, {
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            collectionName: 'testing-collection', // The collection to store the vectors in
        });
        console.log("Successfully ingested PDF and stored vectors in Qdrant.");
        return true;
    }
    catch (error) {
        console.error('Error during PDF ingestion:', error);
        return false;
    }
    finally {
        // --- Cleanup ---
        // Optional: Delete the file after processing to save space
        try {
            fs_1.default.unlinkSync(pdfFilePath);
            console.log(`Cleaned up uploaded file: ${pdfFilePath}`);
        }
        catch (cleanupError) {
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
        }
        else {
            res.status(500).json({
                success: false,
                message: 'Failed to process and ingest the PDF.'
            });
        }
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map