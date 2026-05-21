import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// Configure multer storage in memory
const multerFunc = typeof multer === 'function' ? multer : (multer as any).default;
const storage = multerFunc.memoryStorage();
const upload = multerFunc({ storage }).single('file');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Parse the multipart form-data file upload using multer
  upload(req, res, async (err: any) => {
    if (err) {
      console.error('[EXTRACTION] Multer error:', err);
      return res.status(500).json({ message: 'Error processing file upload', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const fileExtension = originalname.split('.').pop()?.toLowerCase() || '';

    console.log(`[EXTRACTION] Processing file: ${originalname}, Type: ${mimetype}, Ext: ${fileExtension}`);

    try {
      let extractedText = '';

      if (mimetype === 'application/pdf' || fileExtension === 'pdf') {
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        extractedText = parsed.text || '';
        await parser.destroy();
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileExtension === 'docx'
      ) {
        const parsed = await mammoth.extractRawText({ buffer });
        extractedText = parsed.value || '';
      } else if (
        mimetype === 'application/msword' ||
        fileExtension === 'doc'
      ) {
        // Fallback or legacy .doc extraction using mammoth or plain buffer as secondary
        const parsed = await mammoth.extractRawText({ buffer }).catch(() => null);
        if (parsed) {
          extractedText = parsed.value || '';
        } else {
          extractedText = buffer.toString('utf-8');
        }
      } else {
        // Fallback for plain text, csv, Markdown, or rtf files
        extractedText = buffer.toString('utf-8');
      }

      // Check if we managed to extract any valid text contents
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(422).json({
          message: 'Zero-byte extraction: Unable to extract text content from the document format.'
        });
      }

      console.log(`[EXTRACTION] Success! Extracted ${extractedText.length} characters from ${originalname}`);
      return res.status(200).json({ text: extractedText });

    } catch (parseError: any) {
      console.error(`[EXTRACTION] Failed to parse file ${originalname}:`, parseError);
      return res.status(500).json({
        message: `Parser failed during document text extraction: ${parseError.message || parseError}`
      });
    }
  });
}
