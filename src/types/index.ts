// Message types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// Assistant types
export interface Assistant {
  id: string;
  name: string;
  instructions: string;
  model: string;
  tools: AssistantTool[];
  createdAt: Date;
}

export interface AssistantTool {
  type: 'code_interpreter' | 'retrieval' | 'function';
}

// Thread types
export interface Thread {
  id: string;
  createdAt: Date;
}

// Run types
export interface Run {
  id: string;
  threadId: string;
  assistantId: string;
  status: RunStatus;
  createdAt: Date;
  completedAt?: Date;
}

export type RunStatus = 
  | 'queued' 
  | 'in_progress' 
  | 'requires_action' 
  | 'cancelling' 
  | 'cancelled' 
  | 'failed' 
  | 'completed' 
  | 'expired';

// Vector store types
export interface VectorStore {
  id: string;
  name: string;
  createdAt: Date;
}

// File types
export interface FileObject {
  id: string;
  filename: string;
  purpose: string;
  bytes: number;
  createdAt: Date;
}

// API request types
export interface AssistantApiRequest {
  action: AssistantAction;
  name?: string;
  instructions?: string;
  model?: string;
  threadId?: string;
  assistantId?: string;
  runId?: string;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
}

export type AssistantAction = 
  | 'createAssistant' 
  | 'createThread' 
  | 'addMessage' 
  | 'runAssistant' 
  | 'getRunStatus' 
  | 'getMessages';

export interface VectorStoreApiRequest {
  action: VectorStoreAction;
  name?: string;
  vectorStoreId?: string;
  fileIds?: string[];
  query?: string;
  maxResults?: number;
}

export type VectorStoreAction = 
  | 'createVectorStore' 
  | 'addFiles' 
  | 'search';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}