import { getFileStream } from '../services/storage.js';
import { Readable } from 'stream';

export const serveFile = async (req, res) => {
  try {
    const fileName = req.params.filename;

    // We must await getFileStream because it is an async function
    const readStream = await getFileStream(fileName);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    if (typeof readStream.pipe === 'function') {
      // It's a standard Node.js Readable stream
      readStream.pipe(res);
      readStream.on('error', (err) => {
        console.error('Stream error while piping:', err);
        if (!res.headersSent) res.status(500).send('Error reading stream');
      });
    } else if (readStream.transformToByteArray) {
      // If AWS SDK returns a Web Stream object
      const bytes = await readStream.transformToByteArray();
      res.send(Buffer.from(bytes));
    } else {
      throw new Error("Unknown stream type returned from R2");
    }

  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).send('File not found');
    }
    console.error('Serve File Error:', error);
    res.status(500).send('Internal Server Error');
  }
};
