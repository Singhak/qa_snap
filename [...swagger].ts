import { readFileSync } from 'fs';
import { join } from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

// Load the OpenAPI specification
const openApiSpecPath = join(process.cwd(), 'openapi.yaml');
const openApiSpec = yaml.load(readFileSync(openApiSpecPath, 'utf8')) as any;

// Initialize swagger-ui-express middleware
const swaggerUiMiddleware = swaggerUi.setup(openApiSpec, {
  explorer: true,
});

// This is a catch-all API route for Swagger UI
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // swagger-ui-express expects a Node.js http.ServerResponse object,
  // but Next.js provides a wrapped NextApiResponse.
  // We need to cast it to the expected type.
  // The `swaggerUi.serve` function handles the routing for all Swagger UI assets.
  const serveHandlers = Array.isArray(swaggerUi.serve) ? swaggerUi.serve : [swaggerUi.serve];

  const runServeHandler = (index = 0) => {
    const handler = serveHandlers[index];
    if (!handler) {
      // If swaggerUi.serve doesn't handle the request (e.g., it's the root /api/docs path),
      // then we pass it to the setup middleware.
      return swaggerUiMiddleware(req as any, res as any, () => {});
    }

    handler(req as any, res as any, () => runServeHandler(index + 1));
  };

  runServeHandler();
}

// Disable body parsing for this route as swagger-ui-express handles it
export const config = {
  api: {
    bodyParser: false,
  },
};
