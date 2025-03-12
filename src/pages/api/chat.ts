import { NextApiRequest, NextApiResponse } from 'next';
import OpenAIUtils from '@/utils/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const completion = await OpenAIUtils.generateChatCompletion(messages);
    
    return res.status(200).json({
      message: completion.choices[0].message,
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ error: error.message || 'An error occurred' });
  }
}