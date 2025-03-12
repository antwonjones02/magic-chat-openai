import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for messages
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

// Types for vector store
export interface VectorStoreDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
}

// Create a new assistant
export const createAssistant = async (name: string, instructions: string, model: string = 'gpt-4o') => {
  try {
    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      model,
      tools: [
        { type: 'file_search' },
        { type: 'code_interpreter' },
        {
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for real-time information',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query',
                },
              },
              required: ['query'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'file_browser',
            description: 'Browse files on the computer',
            parameters: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'The path to browse',
                },
              },
              required: ['path'],
            },
          },
        },
      ],
    });
    return assistant;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
};

// Create a new thread
export const createThread = async () => {
  try {
    const thread = await openai.beta.threads.create();
    return thread;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

// Add a message to a thread
export const addMessageToThread = async (threadId: string, content: string, role: MessageRole = 'user') => {
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role,
      content,
    });
    return message;
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
};

// Run the assistant on a thread
export const runAssistant = async (
  threadId: string,
  assistantId: string,
  instructions?: string
) => {
  try {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions,
    });
    return run;
  } catch (error) {
    console.error('Error running assistant:', error);
    throw error;
  }
};

// Get the status of a run
export const getRunStatus = async (threadId: string, runId: string) => {
  try {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    return run;
  } catch (error) {
    console.error('Error getting run status:', error);
    throw error;
  }
};

// Get messages from a thread
export const getThreadMessages = async (threadId: string) => {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data.map((message) => ({
      id: message.id,
      role: message.role as MessageRole,
      content: message.content[0].type === 'text' ? message.content[0].text.value : '',
      createdAt: new Date(message.created_at * 1000),
    }));
  } catch (error) {
    console.error('Error getting thread messages:', error);
    throw error;
  }
};

// Create a vector store
export const createVectorStore = async (name: string) => {
  try {
    const vectorStore = await openai.beta.vectorStores.create({
      name,
    });
    return vectorStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
};

// Add files to a vector store
export const addFilesToVectorStore = async (vectorStoreId: string, fileIds: string[]) => {
  try {
    const files = await openai.beta.vectorStores.files.createBatch(vectorStoreId, {
      file_ids: fileIds,
    });
    return files;
  } catch (error) {
    console.error('Error adding files to vector store:', error);
    throw error;
  }
};

// Upload a file
export const uploadFile = async (file: File, purpose: 'assistants' | 'vector_store_file' = 'assistants') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', purpose);

    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading file: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Search a vector store
export const searchVectorStore = async (
  vectorStoreId: string,
  query: string,
  maxResults: number = 10
) => {
  try {
    const search = await openai.beta.vectorStores.query(vectorStoreId, {
      query,
      max_results: maxResults,
    });
    return search;
  } catch (error) {
    console.error('Error searching vector store:', error);
    throw error;
  }
};

// Generate a chat completion (for direct chat without assistants)
export const generateChatCompletion = async (messages: { role: MessageRole; content: string }[]) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
    });
    return completion;
  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw error;
  }
};

// Create a new message object
export const createMessage = (role: MessageRole, content: string): Message => {
  return {
    id: uuidv4(),
    role,
    content,
    createdAt: new Date(),
  };
};

export default {
  createAssistant,
  createThread,
  addMessageToThread,
  runAssistant,
  getRunStatus,
  getThreadMessages,
  createVectorStore,
  addFilesToVectorStore,
  uploadFile,
  searchVectorStore,
  generateChatCompletion,
  createMessage,
};