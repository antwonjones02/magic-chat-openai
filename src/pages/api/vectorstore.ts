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
      case 'createVectorStore':
        const { name } = params;
        if (!name) {
          return res.status(400).json({ error: 'Name is required' });
        }
        result = await OpenAIUtils.createVectorStore(name);
        break;

      case 'addFiles':
        const { vectorStoreId, fileIds } = params;
        if (!vectorStoreId || !fileIds || !Array.isArray(fileIds)) {
          return res.status(400).json({ error: 'VectorStoreId and fileIds array are required' });
        }
        result = await OpenAIUtils.addFilesToVectorStore(vectorStoreId, fileIds);
        break;

      case 'search':
        const { vectorStoreId: searchVectorStoreId, query, maxResults } = params;
        if (!searchVectorStoreId || !query) {
          return res.status(400).json({ error: 'VectorStoreId and query are required' });
        }
        result = await OpenAIUtils.searchVectorStore(searchVectorStoreId, query, maxResults);
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('Error in vector store API:', error);
    return res.status(500).json({ error: error.message || 'An error occurred' });
  }
}