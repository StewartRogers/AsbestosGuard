import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AsbestosGuard API',
      version: '1.0.0',
      description:
        'REST API for the AsbestosGuard asbestos abatement licence management system. ' +
        'All protected endpoints require a valid JWT token (set automatically as an HTTP-only cookie upon login).',
      contact: {
        name: 'WorkSafeBC Licensing',
        email: 'licensing@worksafebc.com',
      },
    },
    servers: [
      { url: '/api', description: 'Main API' },
      { url: '/__api', description: 'AI / internal API' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'employer'] },
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            companyName: { type: 'string' },
            applicantName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: {
              type: 'string',
              enum: ['submitted', 'under_review', 'approved', 'rejected'],
            },
            submissionDate: { type: 'string', format: 'date' },
            lastUpdated: { type: 'string', format: 'date' },
          },
        },
        FactSheet: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            employerId: { type: 'string' },
            companyName: { type: 'string' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and session management' },
      { name: 'Applications', description: 'Licence application CRUD' },
      { name: 'Fact Sheets', description: 'Employer fact sheet CRUD (admin only)' },
      { name: 'Analysis', description: 'Stored AI analysis results (admin only)' },
      { name: 'AI', description: 'AI-powered analysis endpoints' },
      { name: 'Data', description: 'Generic key-value data store' },
      { name: 'System', description: 'Health check and system info' },
    ],
  },
  apis: ['./routes/*.ts', './routes/*.js', './server.ts', './server.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
