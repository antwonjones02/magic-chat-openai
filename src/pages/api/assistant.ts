import { NextApiRequest, NextApiResponse } from 'next';
import OpenAIUtils from '@/utils/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, ...params } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    let result;

    switch (action) {
      case 'createAssistant':
        const { name, instructions, model } = params;
        if (!name || !instructions) {
          return res.status(400).json({ error: 'Name and instructions are required' });
        }
        result = await OpenAIUtils.createAssistant(name, instructions, model);
        break;

      case 'createThread':
        result = await OpenAIUtils.createThread();
        break;

      case 'addMessage':
        const { threadId, content, role } = params;
        if (!threadId || !content) {
          return res.status(400).json({ error: 'ThreadId and content are required' });
        }
        result = await OpenAIUtils.addMessageToThread(threadId, content, role);
        break;

      case 'runAssistant':
        const { threadId: runThreadId, assistantId, instructions: runInstructions } = params;
        if (!runThreadId || !assistantId) {
          return res.status(400).json({ error: 'ThreadId and assistantId are required' });
        }
        result = await OpenAIUtils.runAssistant(runThreadId, assistantId, runInstructions);
        break;

      case 'getRunStatus':
        const { threadId: statusThreadId, runId } = params;
        if (!statusThreadId || !runId) {
          return res.status(400).json({ error: 'ThreadId and runId are required' });
        }
        result = await OpenAIUtils.getRunStatus(statusThreadId, runId);
        break;

      case 'getMessages':
        const { threadId: messagesThreadId } = params;
        if (!messagesThreadId) {
          return res.status(400).json({ error: 'ThreadId is required' });
        }
        result = await OpenAIUtils.getThreadMessages(messagesThreadId);
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('Error in assistant API:', error);
    return res.status(500).json({ error: error.message || 'An error occurred' });
  }
}