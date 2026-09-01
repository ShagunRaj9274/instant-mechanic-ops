const bookingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    reference: { type: 'string', example: 'IM-10432' },
    status: {
      type: 'string',
      enum: ['PENDING', 'ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    },
    amount: { type: 'number', example: 2899.5 },
    city: { type: 'string', example: 'Bengaluru' },
    address: { type: 'string' },
    scheduledAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    customer: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
      },
    },
    vehicle: {
      type: 'object',
      properties: {
        make: { type: 'string' },
        model: { type: 'string' },
        year: { type: 'integer' },
        registration: { type: 'string' },
        type: { type: 'string' },
      },
    },
    service: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        category: { type: 'string' },
        durationMinutes: { type: 'integer' },
      },
    },
    mechanic: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        status: { type: 'string' },
        phone: { type: 'string' },
      },
    },
  },
} as const;

const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string' },
        details: {},
      },
    },
  },
} as const;

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
];

const errorResponses = {
  400: { description: 'Request failed validation', content: { 'application/json': { schema: errorSchema } } },
  401: { description: 'Missing or expired token', content: { 'application/json': { schema: errorSchema } } },
  404: { description: 'Resource not found', content: { 'application/json': { schema: errorSchema } } },
  429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: errorSchema } } },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Instant Mechanic — Live Operations API',
    version: '1.0.0',
    description: [
      'REST API behind the Instant Mechanic operations dashboard.',
      '',
      'Every successful response uses the envelope `{ "success": true, "data": ... }`,',
      'and list endpoints add a `meta` object with pagination details. Failures use',
      '`{ "success": false, "error": { code, message, details } }`.',
      '',
      '**Realtime:** a Socket.IO server runs on the same origin at `/socket.io`.',
      'Pass the JWT as `auth.token` in the handshake, then listen for',
      '`booking:created`, `booking:updated`, `mechanic:updated` and `dashboard:stats`.',
      '',
      '**Demo credentials:** `ops@instantmechanic.com` / `instant123`.',
    ].join('\n'),
  },
  servers: [{ url: '/api/v1', description: 'Version 1' }],
  tags: [
    { name: 'Auth', description: 'Sign in and read the current session' },
    { name: 'Dashboard', description: 'Aggregated KPIs, trends and live activity' },
    { name: 'Bookings', description: 'The job list and the dispatch state machine' },
    { name: 'Mechanics', description: 'Field team availability and workload' },
    { name: 'Customers', description: 'Customer book with spend and vehicles' },
    { name: 'Services', description: 'Service catalogue used for filters' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: { Booking: bookingSchema, Error: errorSchema },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange email and password for a JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'ops@instantmechanic.com' },
                  password: { type: 'string', example: 'instant123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Token and profile' },
          401: { description: 'Wrong credentials', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Profile for the current token', responses: { 200: { description: 'Profile' }, ...errorResponses } },
    },
    '/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Everything the overview page needs in one call',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30, minimum: 7, maximum: 180 } },
          { name: 'timezone', in: 'query', schema: { type: 'string', default: 'Asia/Kolkata' } },
        ],
        responses: { 200: { description: 'Summary, timeseries, breakdowns, activity' }, ...errorResponses },
      },
    },
    '/dashboard/summary': {
      get: { tags: ['Dashboard'], summary: 'KPI tiles with trend deltas', responses: { 200: { description: 'Summary' }, ...errorResponses } },
    },
    '/dashboard/timeseries': {
      get: { tags: ['Dashboard'], summary: 'Bookings and revenue per day', responses: { 200: { description: 'Daily series' }, ...errorResponses } },
    },
    '/dashboard/breakdown': {
      get: { tags: ['Dashboard'], summary: 'Split by status, service category and city', responses: { 200: { description: 'Breakdowns' }, ...errorResponses } },
    },
    '/dashboard/activity': {
      get: { tags: ['Dashboard'], summary: 'Most recent status changes', responses: { 200: { description: 'Activity feed' }, ...errorResponses } },
    },
    '/bookings': {
      get: {
        tags: ['Bookings'],
        summary: 'Search, filter, sort and page through bookings',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Matches reference, customer, phone, registration, service or mechanic' },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Comma separated, e.g. PENDING,ASSIGNED' },
          { name: 'serviceId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'mechanicId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'customerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'scheduledAt', 'amount', 'status', 'reference'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: {
            description: 'Paged bookings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: bookingSchema },
                    meta: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasNext: { type: 'boolean' },
                        hasPrev: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          ...errorResponses,
        },
      },
    },
    '/bookings/export': {
      get: { tags: ['Bookings'], summary: 'Download the filtered list as CSV', responses: { 200: { description: 'CSV file', content: { 'text/csv': {} } }, ...errorResponses } },
    },
    '/bookings/filters': {
      get: { tags: ['Bookings'], summary: 'Distinct values for the filter controls', responses: { 200: { description: 'Filter options' }, ...errorResponses } },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'One booking with its full status timeline',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Booking', content: { 'application/json': { schema: bookingSchema } } }, ...errorResponses },
      },
    },
    '/bookings/{id}/status': {
      patch: {
        tags: ['Bookings'],
        summary: 'Move a booking along the dispatch flow',
        description: 'Allowed moves: PENDING → ASSIGNED → ON_THE_WAY → IN_PROGRESS → COMPLETED. Anything except a completed job can be CANCELLED. Illegal jumps return 409. Requires the ADMIN or OPS role.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['ASSIGNED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
                  mechanicId: { type: 'string', format: 'uuid', nullable: true },
                  note: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated booking; also broadcast on the socket' },
          409: { description: 'Illegal status transition', content: { 'application/json': { schema: errorSchema } } },
          ...errorResponses,
        },
      },
    },
    '/mechanics': {
      get: {
        tags: ['Mechanics'],
        summary: 'Field team with their current job',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'AVAILABLE, ON_JOB, OFF_DUTY' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['jobsCompleted', 'rating', 'name', 'status'] } },
        ],
        responses: { 200: { description: 'Paged mechanics' }, ...errorResponses },
      },
    },
    '/mechanics/{id}': {
      get: {
        tags: ['Mechanics'],
        summary: 'One mechanic with stats and recent jobs',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Mechanic' }, ...errorResponses },
      },
    },
    '/mechanics/{id}/status': {
      patch: {
        tags: ['Mechanics'],
        summary: 'Put a mechanic on or off shift',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['AVAILABLE', 'ON_JOB', 'OFF_DUTY'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated mechanic' }, ...errorResponses },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Customer book with lifetime spend',
        parameters: [
          ...paginationParams,
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'name', 'totalSpend', 'bookings'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: { 200: { description: 'Paged customers' }, ...errorResponses },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'One customer with vehicles and spend',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Customer' }, ...errorResponses },
      },
    },
    '/services': {
      get: { tags: ['Services'], summary: 'Service catalogue', responses: { 200: { description: 'Services' }, ...errorResponses } },
    },
  },
} as const;
