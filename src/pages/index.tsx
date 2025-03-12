import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Alert, 
  Snackbar,
  Button,
  Divider
} from '@mui/material';
import Layout from '../components/Layout';
import ChatInput from '../components/ChatInput';
import ChatMessage from '../components/ChatMessage';
import FileUpload from '../components/FileUpload';
import Loading from '../components/Loading';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export default function Home() {
  // State variables
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [vectorStoreId, setVectorStoreId] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize assistant on component mount
  useEffect(() => {
    initializeAssistant();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize the assistant and thread
  const initializeAssistant = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Create assistant
      const assistantResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createAssistant',
          name: 'Magic Chat AI',
          instructions: 'You are a helpful AI assistant with access to vector stores, web search, and file search capabilities.',
          model: 'gpt-4o',
        }),
      });
      
      if (!assistantResponse.ok) {
        throw new Error('Failed to create assistant');
      }
      
      const assistantData = await assistantResponse.json();
      setAssistantId(assistantData.id);
      
      // Create thread
      const threadResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createThread',
        }),
      });
      
      if (!threadResponse.ok) {
        throw new Error('Failed to create thread');
      }
      
      const threadData = await threadResponse.json();
      setThreadId(threadData.id);
      
      // Create vector store
      const vectorStoreResponse = await fetch('/api/vectorstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createVectorStore',
          name: 'Magic Chat Vector Store',
        }),
      });
      
      if (!vectorStoreResponse.ok) {
        throw new Error('Failed to create vector store');
      }
      
      const vectorStoreData = await vectorStoreResponse.json();
      setVectorStoreId(vectorStoreData.id);
      
      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am Magic Chat AI, your intelligent assistant. I can help you with various tasks, answer questions, and process files. How can I assist you today?',
          createdAt: new Date(),
        },
      ]);
      
      showNotification('System initialized successfully', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      showNotification(`Error: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!assistantId || !threadId) {
      showNotification('System not initialized yet', 'error');
      return;
    }
    
    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      // Add message to thread
      const addMessageResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addMessage',
          threadId,
          role: 'user',
          content,
        }),
      });
      
      if (!addMessageResponse.ok) {
        throw new Error('Failed to add message to thread');
      }
      
      // Run the assistant
      const runResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'runAssistant',
          threadId,
          assistantId,
        }),
      });
      
      if (!runResponse.ok) {
        throw new Error('Failed to run assistant');
      }
      
      const runData = await runResponse.json();
      const runId = runData.id;
      
      // Poll for completion
      await pollRunStatus(threadId, runId);
      
      // Get messages
      const messagesResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getMessages',
          threadId,
        }),
      });
      
      if (!messagesResponse.ok) {
        throw new Error('Failed to get messages');
      }
      
      const messagesData = await messagesResponse.json();
      
      // Find the assistant's response (should be the most recent message)
      const assistantResponse = messagesData.data.find(
        (msg: any) => msg.role === 'assistant' && new Date(msg.created_at).getTime() > userMessage.createdAt.getTime()
      );
      
      if (assistantResponse) {
        const assistantMessage: Message = {
          id: assistantResponse.id,
          role: 'assistant',
          content: assistantResponse.content[0].text.value,
          createdAt: new Date(assistantResponse.created_at),
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      showNotification(`Error: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Poll for run status
  const pollRunStatus = async (threadId: string, runId: string) => {
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // Timeout after 30 attempts (30 seconds)
    
    while (!completed && attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getRunStatus',
            threadId,
            runId,
          }),
        });
        
        if (!statusResponse.ok) {
          throw new Error('Failed to get run status');
        }
        
        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          completed = true;
        } else if (statusData.status === 'failed' || statusData.status === 'cancelled') {
          throw new Error(`Run ${statusData.status}`);
        } else {
          // Wait 1 second before polling again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        throw new Error(`Error polling run status: ${errorMessage}`);
      }
    }
    
    if (!completed) {
      throw new Error('Run timed out');
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!vectorStoreId) {
      showNotification('Vector store not initialized', 'error');
      return;
    }
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');
      
      // Upload file to OpenAI
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      const uploadData = await uploadResponse.json();
      const fileId = uploadData.id;
      
      // Add file to vector store
      const addToVectorStoreResponse = await fetch('/api/vectorstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addFiles',
          vectorStoreId,
          fileIds: [fileId],
        }),
      });
      
      if (!addToVectorStoreResponse.ok) {
        throw new Error('Failed to add file to vector store');
      }
      
      showNotification(`File "${file.name}" uploaded and added to vector store`, 'success');
      
      // Add system message about the file
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `File "${file.name}" has been uploaded and added to the vector store. You can now ask questions about its contents.`,
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, systemMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      showNotification(`Error: ${errorMessage}`, 'error');
    }
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };

  return (
    <Layout title="Magic Chat OpenAI">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Chat" />
            <Tab label="Upload Files" />
          </Tabs>
          
          {tabValue === 0 && (
            <Box sx={{ height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
                {messages.length === 0 && !loading && (
                  <Box sx={{ textAlign: 'center', mt: 10 }}>
                    <Typography variant="h5" color="textSecondary">
                      Start a conversation
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                      Send a message to begin chatting with the AI assistant
                    </Typography>
                  </Box>
                )}
                
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                
                {loading && <Loading message="AI is thinking..." />}
                
                <div ref={messagesEndRef} />
              </Box>
              
              <Divider />
              
              <Box sx={{ p: 2 }}>
                <ChatInput 
                  onSendMessage={handleSendMessage} 
                  disabled={loading || !assistantId || !threadId}
                />
              </Box>
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upload Files to Vector Store
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Upload documents to the vector store to enable the AI to search and reference their contents during conversations.
              </Typography>
              
              <FileUpload onFileUpload={handleFileUpload} />
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button 
                  variant="contained" 
                  onClick={() => setTabValue(0)}
                  sx={{ mt: 2 }}
                >
                  Return to Chat
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Container>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
}