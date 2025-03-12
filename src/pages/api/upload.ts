import { NextApiRequest, NextApiResponse } from 'next';
import OpenAIUtils from '@/utils/openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: true });
    
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const purpose = fields.purpose?.[0] || 'assistants';
    
    if (!files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    // Read the file
    const fileData = fs.readFileSync(file.filepath);
    
    // Create a File object
    const fileObject = new File([fileData], file.originalFilename || 'file', {
      type: file.mimetype || 'application/octet-stream',
    });
    
    // Upload to OpenAI
    const result = await OpenAIUtils.uploadFile(fileObject, purpose as 'assistants' | 'vector_store_file');
    
    // Clean up the temp file
    fs.unlinkSync(file.filepath);
    
    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('Error in upload API:', error);
    return res.status(500).json({ error: error.message || 'An error occurred' });
  }
}