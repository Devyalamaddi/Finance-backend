import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Zorvyn Fintech Backend API",
      version: "1.0.0",
      description: "Finance Data Processing and Access Control Backend",
    },
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["viewer", "analyst", "admin"] },
            status: { type: "string", enum: ["active", "inactive"] },
            created_at: { type: "string", format: "date-time" },
            last_login: { type: ["string", "null"], format: "date-time" },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["email", "password", "role"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            role: { type: "string", enum: ["viewer", "analyst", "admin"] },
            status: { type: "string", enum: ["active", "inactive"] },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            role: { type: "string", enum: ["viewer", "analyst", "admin"] },
            status: { type: "string", enum: ["active", "inactive"] },
          },
        },
        Record: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            amount: { type: "string", example: "2500.00" },
            type: { type: "string", enum: ["income", "expense"] },
            category: { type: "string" },
            date: { type: "string", format: "date-time" },
            description: { type: ["string", "null"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        CreateRecordRequest: {
          type: "object",
          required: ["amount", "type", "category", "date"],
          properties: {
            amount: { type: "number", minimum: 0 },
            type: { type: "string", enum: ["income", "expense"] },
            category: { type: "string" },
            date: { type: "string", format: "date" },
            description: { type: "string" },
          },
        },
        UpdateRecordRequest: {
          type: "object",
          properties: {
            amount: { type: "number", minimum: 0 },
            type: { type: "string", enum: ["income", "expense"] },
            category: { type: "string" },
            date: { type: "string", format: "date" },
            description: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/healthz": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "OK" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Login",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
          },
          responses: {
            "200": {
              description: "Token generated",
              content: { "application/json": { schema: { $ref: "#/components/schemas/LoginResponse" } } },
            },
            "400": { description: "Invalid credentials" },
          },
        },
      },
      "/users": {
        get: {
          summary: "List users",
          tags: ["Users"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "User list" }, "403": { description: "Forbidden" } },
        },
        post: {
          summary: "Create user",
          tags: ["Users"],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateUserRequest" } } },
          },
          responses: {
            "201": {
              description: "User created",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
          },
        },
      },
      "/users/{id}": {
        get: {
          summary: "Get user by id",
          tags: ["Users"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "User details" }, "404": { description: "Not found" } },
        },
        put: {
          summary: "Update user",
          tags: ["Users"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateUserRequest" } } },
          },
          responses: { "200": { description: "Updated user" } },
        },
        delete: {
          summary: "Delete user",
          tags: ["Users"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "204": { description: "Deleted" } },
        },
      },
      "/records": {
        get: {
          summary: "List records",
          tags: ["Records"],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: "query", name: "q", schema: { type: "string" }, description: "Text search over category and description" },
            { in: "query", name: "type", schema: { type: "string", enum: ["income", "expense"] } },
            { in: "query", name: "category", schema: { type: "string" } },
            { in: "query", name: "from", schema: { type: "string", format: "date" } },
            { in: "query", name: "to", schema: { type: "string", format: "date" } },
            { in: "query", name: "page", schema: { type: "integer", default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": { description: "Paginated records" } },
        },
        post: {
          summary: "Create record",
          tags: ["Records"],
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRecordRequest" } } },
          },
          responses: {
            "201": {
              description: "Created record",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Record" } } },
            },
          },
        },
      },
      "/records/{id}": {
        get: {
          summary: "Get record by id",
          tags: ["Records"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "200": { description: "Record" }, "404": { description: "Not found" } },
        },
        put: {
          summary: "Update record",
          tags: ["Records"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateRecordRequest" } } },
          },
          responses: { "200": { description: "Updated record" } },
        },
        delete: {
          summary: "Soft delete record",
          tags: ["Records"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { "204": { description: "Deleted" } },
        },
      },
      "/summary/total": {
        get: {
          summary: "Total summary",
          tags: ["Summary"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Total income, expense, net balance" } },
        },
      },
      "/summary/category": {
        get: {
          summary: "Category totals",
          tags: ["Summary"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Category aggregates" } },
        },
      },
      "/summary/recent": {
        get: {
          summary: "Recent records",
          tags: ["Summary"],
          security: [{ BearerAuth: [] }],
          parameters: [{ in: "query", name: "limit", schema: { type: "integer", default: 10 } }],
          responses: { "200": { description: "Recent records" } },
        },
      },
      "/summary/trends": {
        get: {
          summary: "Weekly or monthly trends",
          tags: ["Summary"],
          security: [{ BearerAuth: [] }],
          parameters: [
            { in: "query", name: "interval", schema: { type: "string", enum: ["weekly", "monthly"], default: "monthly" } },
            { in: "query", name: "from", schema: { type: "string", format: "date" } },
            { in: "query", name: "to", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Time-series aggregates" } },
        },
      },
      "/summary/analytics": {
        get: {
          summary: "Advanced analytics (biggest expense and month-over-month net change)",
          tags: ["Summary"],
          security: [{ BearerAuth: [] }],
          responses: { "200": { description: "Aggregated analytics insights" } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
