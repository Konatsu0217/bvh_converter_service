import type { NextApiRequest, NextApiResponse } from 'next';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader';
import { convertBVHToVRMAnimation } from '@/lib/bvh-converter/convertBVHToVRMAnimation';
import { randomUUID } from 'crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

const store = new Map<string, { buffer: Buffer; filename: string }>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method === 'POST') {
    try {
      const bvhText: string = await new Promise((resolve, reject) => {
        let data = '';
        req.setEncoding('utf8');
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

      if (!bvhText || bvhText.length === 0) {
        res.status(400).json({ error: 'Missing BVH file content in request body' });
        return;
      }

      const scaleParam = req.query.scale;
      const scale = typeof scaleParam === 'string' ? Number(scaleParam) : 0.01;
      const filenameParam = req.query.filename;
      const filename = typeof filenameParam === 'string' ? filenameParam.replace(/\.[^/.]+$/, '') + '.vrma' : 'converted.vrma';

      const loader = new BVHLoader();
      const bvh = loader.parse(bvhText);
      const arrayBuffer = await convertBVHToVRMAnimation(bvh, { scale: isNaN(scale) ? 0.01 : scale });
      const buffer = Buffer.from(arrayBuffer);

      const token = randomUUID();
      store.set(token, { buffer, filename });

      const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
      const host = req.headers.host || 'localhost:3000';
      const url = `${proto}://${host}/api/convert-bvh?token=${encodeURIComponent(token)}`;

      res.status(200).json({ url });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Conversion failed';
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === 'GET') {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (!token || !store.has(token)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const { buffer, filename } = store.get(token)!;
    store.delete(token);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.status(200).send(buffer);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
