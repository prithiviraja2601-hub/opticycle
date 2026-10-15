import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'OptiCycle Colorimetric Biosensing API',
    version: '1.0.0',
    disclaimer: 'Research prototype. Results are experimental and not clinically validated. Not for diagnosis or treatment.',
    capabilities: [
      'laplacian-variance-blur-detection',
      'specular-glare-detection',
      'affine-least-squares-calibration',
      'trimmed-mean-chromatic-sampling',
      'sqlite-scan-history',
    ],
  });
});

export default router;
