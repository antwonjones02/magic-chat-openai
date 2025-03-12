import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Message } from '@/utils/openai';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        mb: 2,
        maxWidth: '100%',
      }}
    >
      <Avatar
        sx={{
          bgcolor: isUser ? 'primary.main' : 'secondary.main',
          width: 40,
          height: 40,
          mr: isUser ? 0 : 2,
          ml: isUser ? 2 : 0,
        }}
      >
        {isUser ? 'U' : 'AI'}
      </Avatar>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '80%',
          borderRadius: 2,
          bgcolor: isUser ? 'primary.50' : 'secondary.50',
          borderTopRightRadius: isUser ? 0 : 16,
          borderTopLeftRadius: isUser ? 16 : 0,
        }}
      >
        <Typography variant="body1" component="div">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={atomDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {message.createdAt.toLocaleTimeString()}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChatMessage;