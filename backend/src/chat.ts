import 'dotenv/config';
// @ts-ignore
import express from 'express';
// @ts-ignore
import cors from 'cors'; // Import the cors middleware
// @ts-ignore
import { OpenAIEmbeddings } from "@langchain/openai";
// @ts-ignore
import { QdrantVectorStore } from "@langchain/qdrant";
// @ts-ignore
import { OpenAI } from "openai";

// --- Basic Setup ---
const app = express();
const port = process.env.PORT || 3002;
const client = new OpenAI();

// --- Middleware ---

// 1. Enable CORS for all routes
// This will allow your frontend (e.g., http://localhost:5173) to communicate with this server.
app.use(cors()); 

// 2. This allows the server to understand JSON in the body of requests
app.use(express.json());

// --- Core Chat Logic ---
/**
 * Handles the chat request by retrieving context and generating a response.
 * @param {string} userQuery - The query from the user.
 * @returns {Promise<string | null>} The AI-generated response or null on error.
 */
async function getChatResponse(userQuery: string): Promise<string | null> {
    try {
        // 1. --- Initialize Embeddings ---
        const embeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-large',
    
        });

        // 2. --- Connect to Qdrant Vector Store ---
        const vectorStore = await QdrantVectorStore.fromExistingCollection(
            embeddings, {
                url: process.env.QDRANT_URL || 'http://localhost:6333',
                collectionName: 'testing-collection',
            }
        );

        // 3. --- Create a Retriever ---
        const vectorSearcher = vectorStore.asRetriever({
            k: 3, // Number of relevant chunks to retrieve
        });

        // 4. --- Retrieve Relevant Chunks ---
        const relevantChunks = await vectorSearcher.invoke(userQuery);
        console.log("Retrieved Chunks:", JSON.stringify(relevantChunks, null, 2));

        // 5. --- Construct the System Prompt ---
        const SYSTEM_PROMPT = `
            You are an AI assistant who helps resolving user query based on the 
            context available to you from a PDF file with the content and page number.
            
            Only answer based on the available context from the file. If the information
            is not in the context, say that you cannot find the answer in the provided document.
            
            Context:
            ${JSON.stringify(relevantChunks)}
        `;

        // 6. --- Call OpenAI Chat Completions API ---
        const response = await client.chat.completions.create({
            model: 'gpt-4',
            messages: [{
                role: 'system',
                content: SYSTEM_PROMPT,
            }, {
                role: 'user',
                content: userQuery,
            }, ],
        });

        // 7. --- Return the AI's Message ---
        return response.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    } catch (error) {
        console.error('Error in getChatResponse:', error);
        return null;
    }
}


// --- API Route ---
// @ts-ignore
app.post('/chat', async (req, res) => {
    // Destructure the 'query' from the request body
    const { userQuery } = req.body;

    // Check if the userQuery was provided
    if (!userQuery) {
        return res.status(400).json({ error: 'userQuery is required in the request body.' });
    }

    // Get the response from our core logic function
    const responseContent = await getChatResponse(userQuery);

    // Handle potential errors from the chat logic
    if (!responseContent) {
        return res.status(500).json({ error: 'Failed to get a response from the AI model.' });
    }

    // Send the successful response back to the client
    res.json({
        response: responseContent
    });
});



// --- Start the Server ---



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
