const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Backend API',
    description:
      'Fastify + PostgreSQL API documentation. Role policy: superadmin is limited to access-control APIs such as registering admins and changing user roles; admin owns all business operations APIs.',
    version: '1.0.0',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Admin Auth', description: 'Admin authentication APIs' },
    { name: 'Public Auth', description: 'Public authentication APIs' },
    { name: 'Admin Category', description: 'Admin-only category management APIs' },
    { name: 'Public Category', description: 'Public category APIs' },
    { name: 'Admin Product', description: 'Admin-only product management APIs' },
    { name: 'Public Product', description: 'Public product APIs' },
    { name: 'Admin Discount', description: 'Admin-only discount management APIs' },
    { name: 'Public Offer', description: 'Public coupon and offers APIs' },
    { name: 'Public Marketing', description: 'Public new arrivals email notification APIs' },
    { name: 'Admin Inventory', description: 'Admin-only inventory management APIs' },
    { name: 'Admin Dashboard', description: 'Admin-only dashboard analytics APIs' },
    { name: 'Public Dashboard', description: 'Public storefront dashboard APIs' },
    { name: 'Cart', description: 'Customer cart management APIs' },
    { name: 'Wishlist', description: 'Customer wishlist management APIs' },
    { name: 'Order', description: 'Customer order and payment APIs' },
    { name: 'Admin Order', description: 'Admin-only order listing and order analytics APIs' },
    { name: 'Rating', description: 'Product rating and review APIs' },
    { name: 'Contact', description: 'Public contact enquiry APIs' },
    { name: 'Address', description: 'Customer saved delivery address APIs' },

  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
        '/api/v1/auth/register': {
          post: {
            tags: ['Public Auth'],
            summary: 'User register',
            description:
              'Registers a new user, sends email verification OTP, returns user data in response body and JWT token in Authorization response header.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'email', 'password'],
                    properties: {
                      name: { type: 'string', example: 'user' },
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                      phone: { type: 'string', example: '9911223344' },
                      password: {
                        type: 'string',
                        minLength: 8,
                        example: 'user@1234',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description:
                  'Registration success. OTP is sent to email. JWT is returned in the Authorization response header.',
                headers: {
                  Authorization: {
                    description: 'Bearer access token',
                    schema: { type: 'string' },
                  },
                },
              },
              400: { description: 'Validation error' },
              409: { description: 'User already exists' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/verify-email': {
          post: {
            tags: ['Public Auth'],
            summary: 'Verify email OTP',
            description: 'Verifies the OTP sent to the user email after registration.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'otp'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                      otp: {
                        type: 'string',
                        minLength: 6,
                        maxLength: 6,
                        example: '123456',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Email verified successfully' },
              400: { description: 'Invalid OTP or OTP expired' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/resend-email-otp': {
          post: {
            tags: ['Public Auth'],
            summary: 'Resend email OTP',
            description: 'Sends a new email verification OTP to an unverified user email.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Email verification OTP sent to email' },
              400: { description: 'Email is already verified or validation error' },
              404: { description: 'User not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/login': {
          post: {
            tags: ['Public Auth'],
            summary: 'Login',
            description:
              'Logs in a verified user. Returns user data in response body and JWT token in Authorization response header.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                      password: {
                        type: 'string',
                        example: 'user@1234',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Login success. JWT is returned in the Authorization response header.',
                headers: {
                  Authorization: {
                    description: 'Bearer access token',
                    schema: { type: 'string' },
                  },
                },
              },
              401: { description: 'Invalid credentials or email not verified' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/me': {
          get: {
            tags: ['Public Auth'],
            summary: 'Get current user profile',
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: 'Current user fetched successfully' },
              401: { description: 'Unauthorized' },
              500: { description: 'Internal server error' },
            },
          },
          patch: {
            tags: ['Public Auth'],
            summary: 'Update current user profile',
            description:
              'Updates the logged-in user profile. Email is read-only and cannot be updated from this API.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    minProperties: 1,
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 2,
                        maxLength: 150,
                        example: 'Sowmya',
                      },
                      phone: {
                        type: 'string',
                        example: '9876543210',
                        description: '10-digit mobile number',
                      },
                    },
                    additionalProperties: false,
                  },
                  examples: {
                    updateNameAndPhone: {
                      summary: 'Update name and mobile number',
                      value: {
                        name: 'Sowmya',
                        phone: '9876543210',
                      },
                    },
                    updateNameOnly: {
                      summary: 'Update name only',
                      value: {
                        name: 'Sowmya',
                      },
                    },
                    updatePhoneOnly: {
                      summary: 'Update mobile number only',
                      value: {
                        phone: '9876543210',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Profile updated successfully' },
              400: { description: 'Validation error' },
              401: { description: 'Unauthorized' },
              409: { description: 'Mobile number already exists' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/change-password': {
          post: {
            tags: ['Public Auth'],
            summary: 'Change current user password',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['currentPassword', 'newPassword'],
                    properties: {
                      currentPassword: {
                        type: 'string',
                        example: 'user@1234',
                      },
                      newPassword: {
                        type: 'string',
                        minLength: 8,
                        example: 'user@5678',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Password changed successfully' },
              400: { description: 'Invalid current password or validation error' },
              401: { description: 'Unauthorized' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/forget-password': {
          post: {
            tags: ['Public Auth'],
            summary: 'Request password reset OTP',
            description: 'Sends a password reset OTP to the user email.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Password reset OTP sent to email' },
              404: { description: 'User not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/reset-password': {
          post: {
            tags: ['Public Auth'],
            summary: 'Reset password using OTP',
            description: 'Resets the user password after verifying the password reset OTP.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'otp', 'newPassword'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@gmail.com',
                      },
                      otp: {
                        type: 'string',
                        minLength: 6,
                        maxLength: 6,
                        example: '123456',
                      },
                      newPassword: {
                        type: 'string',
                        minLength: 8,
                        example: 'user@5678',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Password reset successfully' },
              400: { description: 'Invalid OTP or OTP expired' },
              404: { description: 'User not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/register-admin': {
          post: {
            tags: ['Admin Auth'],
            summary: 'Register admin',
            description: 'Superadmin only. Creates admin users for Sri Kanchi staff access.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'email', 'password', 'role'],
                    properties: {
                      name: { type: 'string', example: 'Admin User' },
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'admin@example.com',
                      },
                      phone: { type: 'string', example: '9876543210' },
                      password: {
                        type: 'string',
                        minLength: 8,
                        example: 'Admin@1234',
                      },
                      role: {
                        type: 'string',
                        enum: ['admin'],
                        example: 'admin',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Admin created successfully' },
              401: { description: 'Unauthorized' },
              403: { description: 'Forbidden' },
              409: { description: 'User already exists' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/auth/users/{id}/role': {
          patch: {
            tags: ['Admin Auth'],
            summary: 'Change user role',
            description:
              'Superadmin only. Changes a user role for access-control and support purposes.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'integer' },
                example: 1,
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['role'],
                    properties: {
                      role: {
                        type: 'string',
                        enum: ['user', 'customer', 'admin', 'superadmin'],
                        example: 'admin',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'User role updated successfully' },
              400: { description: 'Validation error' },
              401: { description: 'Unauthorized' },
              403: { description: 'Forbidden' },
              404: { description: 'User not found' },
              500: { description: 'Internal server error' },
            },
          },
        },

        '/api/v1/cart': {
          get: {
            tags: ['Cart'],
            summary: 'Get current user cart',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Cart fetched successfully' } },
          },
          delete: {
            tags: ['Cart'],
            summary: 'Clear current user cart',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Cart cleared successfully' } },
          },
        },
        '/api/v1/cart/items': {
          post: {
            tags: ['Cart'],
            summary: 'Add item to cart',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['product_id', 'quantity'],
                    properties: {
                      product_id: { type: 'integer' },
                      quantity: { type: 'integer', minimum: 1, maximum: 20 },
                    },
                    example: {
                      product_id: 1,
                      quantity: 2,
                    },
                  },
                },
              },
            },
            responses: { 201: { description: 'Item added to cart successfully' } },
          },
        },
        '/api/v1/cart/items/{itemId}': {
          patch: {
            tags: ['Cart'],
            summary: 'Update cart item quantity',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['quantity'],
                    properties: {
                      quantity: { type: 'integer', minimum: 1, maximum: 20 },
                    },
                    example: {
                      quantity: 3,
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Cart item updated successfully' } },
          },
          delete: {
            tags: ['Cart'],
            summary: 'Remove item from cart',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Cart item removed successfully' } },
          },
        },
        '/api/v1/wishlist': {
          get: {
            tags: ['Wishlist'],
            summary: 'Get current user wishlist',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Wishlist fetched successfully' } },
          },
          delete: {
            tags: ['Wishlist'],
            summary: 'Clear current user wishlist',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Wishlist cleared successfully' } },
          },
        },
        '/api/v1/wishlist/items': {
          post: {
            tags: ['Wishlist'],
            summary: 'Add item to wishlist',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['product_id'],
                    properties: {
                      product_id: { type: 'integer' },
                    },
                    example: {
                      product_id: 1,
                    },
                  },
                },
              },
            },
            responses: { 201: { description: 'Item added to wishlist successfully' } },
          },
        },
        '/api/v1/wishlist/items/{itemId}': {
          delete: {
            tags: ['Wishlist'],
            summary: 'Remove item from wishlist',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'itemId', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Wishlist item removed successfully' } },
          },
        },
        '/api/v1/orders': {
          post: {
            tags: ['Order'],
            summary: 'Place order',
            description:
              'Creates an order from the authenticated user cart. The currently supported payment method is cash on delivery, so payment_status is created as pending.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['customer_name', 'shipping_address'],
                    properties: {
                      customer_name: { type: 'string', minLength: 2, maxLength: 150 },
                      customer_phone: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 20,
                        nullable: true,
                      },
                      shipping_address: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 1000,
                      },
                      payment_method: {
                        type: 'string',
                        enum: ['cash_on_delivery'],
                        default: 'cash_on_delivery',
                      },
                    },
                    example: {
                      customer_name: 'Priya Sharma',
                      customer_phone: '9876543210',
                      shipping_address:
                        '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                      payment_method: 'cash_on_delivery',
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Order placed successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Order placed successfully' },
                        data: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 1 },
                            order_number: {
                              type: 'string',
                              example: 'ORD-12-1713775800000-4821',
                            },
                            user_id: { type: 'integer', example: 12 },
                            customer_name: { type: 'string', example: 'Priya Sharma' },
                            customer_email: {
                              type: 'string',
                              format: 'email',
                              example: 'priya@example.com',
                            },
                            customer_phone: {
                              type: 'string',
                              nullable: true,
                              example: '9876543210',
                            },
                            shipping_address: {
                              type: 'string',
                              example:
                                '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                            },
                            subtotal: { type: 'number', example: 8999 },
                            delivery_charge: { type: 'number', example: 0 },
                            total_amount: { type: 'number', example: 8999 },
                            payment_method: {
                              type: 'string',
                              enum: ['cash_on_delivery'],
                              example: 'cash_on_delivery',
                            },
                            payment_status: {
                              type: 'string',
                              example: 'pending',
                            },
                            order_status: { type: 'string', example: 'placed' },
                            items: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'integer', example: 1 },
                                  order_id: { type: 'integer', example: 1 },
                                  product_id: { type: 'integer', example: 8 },
                                  product_name: {
                                    type: 'string',
                                    example: 'Kanchi Silk Saree',
                                  },
                                  product_sku: {
                                    type: 'string',
                                    example: 'SKB-KAN-008',
                                  },
                                  quantity: { type: 'integer', example: 1 },
                                  unit_price: { type: 'number', example: 8999 },
                                  line_total: { type: 'number', example: 8999 },
                                  created_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                },
                              },
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                            updated_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description:
                  'Validation error, empty cart, inactive product, or insufficient stock',
              },
              401: { description: 'Unauthorized' },
              404: { description: 'User not found' },
              500: { description: 'Internal server error' },
            },
          },
          get: {
            tags: ['Order'],
            summary: 'Get current user orders',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Orders fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Orders fetched successfully' },
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'integer', example: 1 },
                              order_number: {
                                type: 'string',
                                example: 'ORD-12-1713775800000-4821',
                              },
                              user_id: { type: 'integer', example: 12 },
                              customer_name: { type: 'string', example: 'Priya Sharma' },
                              customer_email: {
                                type: 'string',
                                format: 'email',
                                example: 'priya@example.com',
                              },
                              customer_phone: {
                                type: 'string',
                                nullable: true,
                                example: '9876543210',
                              },
                              shipping_address: {
                                type: 'string',
                                example:
                                  '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                              },
                              subtotal: { type: 'number', example: 8999 },
                              delivery_charge: { type: 'number', example: 0 },
                              total_amount: { type: 'number', example: 8999 },
                              payment_method: {
                                type: 'string',
                                enum: ['cash_on_delivery'],
                                example: 'cash_on_delivery',
                              },
                              payment_status: { type: 'string', example: 'pending' },
                              order_status: { type: 'string', example: 'placed' },
                              items: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'integer', example: 1 },
                                    order_id: { type: 'integer', example: 1 },
                                    product_id: { type: 'integer', example: 8 },
                                    product_name: {
                                      type: 'string',
                                      example: 'Kanchi Silk Saree',
                                    },
                                    product_sku: {
                                      type: 'string',
                                      example: 'SKB-KAN-008',
                                    },
                                    quantity: { type: 'integer', example: 1 },
                                    unit_price: { type: 'number', example: 8999 },
                                    line_total: { type: 'number', example: 8999 },
                                    created_at: {
                                      type: 'string',
                                      format: 'date-time',
                                    },
                                  },
                                },
                              },
                              created_at: {
                                type: 'string',
                                format: 'date-time',
                              },
                              updated_at: {
                                type: 'string',
                                format: 'date-time',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: 'Unauthorized' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/orders/{id}': {
          get: {
            tags: ['Order'],
            summary: 'Get order by id',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
            ],
            responses: {
              200: {
                description: 'Order fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Order fetched successfully' },
                        data: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 1 },
                            order_number: {
                              type: 'string',
                              example: 'ORD-12-1713775800000-4821',
                            },
                            user_id: { type: 'integer', example: 12 },
                            customer_name: { type: 'string', example: 'Priya Sharma' },
                            customer_email: {
                              type: 'string',
                              format: 'email',
                              example: 'priya@example.com',
                            },
                            customer_phone: {
                              type: 'string',
                              nullable: true,
                              example: '9876543210',
                            },
                            shipping_address: {
                              type: 'string',
                              example:
                                '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                            },
                            subtotal: { type: 'number', example: 8999 },
                            delivery_charge: { type: 'number', example: 0 },
                            total_amount: { type: 'number', example: 8999 },
                            payment_method: {
                              type: 'string',
                              enum: ['cash_on_delivery'],
                              example: 'cash_on_delivery',
                            },
                            payment_status: { type: 'string', example: 'pending' },
                            order_status: { type: 'string', example: 'placed' },
                            items: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'integer', example: 1 },
                                  order_id: { type: 'integer', example: 1 },
                                  product_id: { type: 'integer', example: 8 },
                                  product_name: {
                                    type: 'string',
                                    example: 'Kanchi Silk Saree',
                                  },
                                  product_sku: {
                                    type: 'string',
                                    example: 'SKB-KAN-008',
                                  },
                                  quantity: { type: 'integer', example: 1 },
                                  unit_price: { type: 'number', example: 8999 },
                                  line_total: { type: 'number', example: 8999 },
                                  created_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                },
                              },
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                            updated_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: { description: 'Invalid order id' },
              401: { description: 'Unauthorized' },
              404: { description: 'Order not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/orders/{id}/cancel': {
          patch: {
            tags: ['Order'],
            summary: 'Cancel order',
            description:
              'Cancels an authenticated user order when the order status is still cancellable.',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
            ],
            responses: {
              200: {
                description: 'Order cancelled successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: {
                          type: 'string',
                          example: 'Order cancelled successfully',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 1 },
                            order_number: {
                              type: 'string',
                              example: 'ORD-12-1713775800000-4821',
                            },
                            user_id: { type: 'integer', example: 12 },
                            customer_name: { type: 'string', example: 'Priya Sharma' },
                            customer_email: {
                              type: 'string',
                              format: 'email',
                              example: 'priya@example.com',
                            },
                            customer_phone: {
                              type: 'string',
                              nullable: true,
                              example: '9876543210',
                            },
                            shipping_address: {
                              type: 'string',
                              example:
                                '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                            },
                            subtotal: { type: 'number', example: 8999 },
                            delivery_charge: { type: 'number', example: 0 },
                            total_amount: { type: 'number', example: 8999 },
                            payment_method: {
                              type: 'string',
                              enum: ['cash_on_delivery'],
                              example: 'cash_on_delivery',
                            },
                            payment_status: { type: 'string', example: 'pending' },
                            order_status: { type: 'string', example: 'cancelled' },
                            items: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'integer', example: 1 },
                                  order_id: { type: 'integer', example: 1 },
                                  product_id: { type: 'integer', example: 8 },
                                  product_name: {
                                    type: 'string',
                                    example: 'Kanchi Silk Saree',
                                  },
                                  product_sku: {
                                    type: 'string',
                                    example: 'SKB-KAN-008',
                                  },
                                  quantity: { type: 'integer', example: 1 },
                                  unit_price: { type: 'number', example: 8999 },
                                  line_total: { type: 'number', example: 8999 },
                                  created_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                },
                              },
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                            updated_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description:
                  'Invalid order id, order already cancelled, or order cannot be cancelled',
              },
              401: { description: 'Unauthorized' },
              404: { description: 'Order not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/admin/orders/summary': {
          get: {
            tags: ['Admin Order'],
            summary: 'Get admin order summary',
            description:
              'Admin only. Returns total order count, status-wise order count, and total revenue for the admin orders dashboard.',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Admin order summary fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: {
                          type: 'string',
                          example: 'Admin order summary fetched successfully',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            total_orders: { type: 'integer', example: 120 },
                            placed_orders: { type: 'integer', example: 25 },
                            processing_orders: { type: 'integer', example: 18 },
                            shipped_orders: { type: 'integer', example: 20 },
                            delivered_orders: { type: 'integer', example: 50 },
                            cancelled_orders: { type: 'integer', example: 7 },
                            total_revenue: { type: 'number', example: 245000 },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: 'Unauthorized' },
              403: { description: 'Forbidden' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/admin/orders': {
          get: {
            tags: ['Admin Order'],
            summary: 'List all orders for admin',
            description:
              'Admin only. Returns all customer orders with pagination, optional status filters, payment status filter, and search by order number, customer name, or mobile number.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'page',
                schema: { type: 'integer', minimum: 1, default: 1 },
                example: 1,
              },
              {
                in: 'query',
                name: 'limit',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                example: 20,
              },
              {
                in: 'query',
                name: 'status',
                schema: {
                  type: 'string',
                  enum: ['placed', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'],
                },
                example: 'placed',
              },
              {
                in: 'query',
                name: 'payment_status',
                schema: {
                  type: 'string',
                  enum: ['pending', 'paid', 'failed', 'refunded'],
                },
                example: 'pending',
              },
              {
                in: 'query',
                name: 'search',
                description: 'Search by order number, customer name, or customer mobile number.',
                schema: { type: 'string' },
                example: '9876543210',
              },
            ],
            responses: {
              200: {
                description: 'Admin orders fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: {
                          type: 'string',
                          example: 'Admin orders fetched successfully',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            orders: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'integer', example: 1 },
                                  order_number: {
                                    type: 'string',
                                    example: 'ORD-12-1713775800000-4821',
                                  },
                                  user_id: { type: 'integer', example: 12 },
                                  customer_name: { type: 'string', example: 'Priya Sharma' },
                                  customer_email: {
                                    type: 'string',
                                    format: 'email',
                                    example: 'priya@example.com',
                                  },
                                  customer_phone: {
                                    type: 'string',
                                    nullable: true,
                                    example: '9876543210',
                                  },
                                  shipping_address: {
                                    type: 'string',
                                    example:
                                      '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                                  },
                                  subtotal: { type: 'number', example: 8999 },
                                  delivery_charge: { type: 'number', example: 0 },
                                  total_amount: { type: 'number', example: 8999 },
                                  payment_method: {
                                    type: 'string',
                                    enum: ['cash_on_delivery'],
                                    example: 'cash_on_delivery',
                                  },
                                  payment_status: { type: 'string', example: 'pending' },
                                  order_status: { type: 'string', example: 'placed' },
                                  items: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'integer', example: 1 },
                                        order_id: { type: 'integer', example: 1 },
                                        product_id: { type: 'integer', example: 8 },
                                        product_name: {
                                          type: 'string',
                                          example: 'Kanchi Silk Saree',
                                        },
                                        product_sku: {
                                          type: 'string',
                                          example: 'SKB-KAN-008',
                                        },
                                        quantity: { type: 'integer', example: 1 },
                                        unit_price: { type: 'number', example: 8999 },
                                        line_total: { type: 'number', example: 8999 },
                                        created_at: {
                                          type: 'string',
                                          format: 'date-time',
                                        },
                                      },
                                    },
                                  },
                                  created_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                  updated_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                },
                              },
                            },
                            pagination: {
                              type: 'object',
                              properties: {
                                page: { type: 'integer', example: 1 },
                                limit: { type: 'integer', example: 20 },
                                total: { type: 'integer', example: 120 },
                                total_pages: { type: 'integer', example: 6 },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              401: { description: 'Unauthorized' },
              403: { description: 'Forbidden' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/admin/orders/{id}': {
          get: {
            tags: ['Admin Order'],
            summary: 'Get admin order by id',
            description:
              'Admin only. Returns one order with customer name, mobile number, shipping address, payment details, order status, and order items.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'integer' },
                example: 1,
              },
            ],
            responses: {
              200: {
                description: 'Admin order fetched successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: {
                          type: 'string',
                          example: 'Admin order fetched successfully',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer', example: 1 },
                            order_number: {
                              type: 'string',
                              example: 'ORD-12-1713775800000-4821',
                            },
                            user_id: { type: 'integer', example: 12 },
                            customer_name: { type: 'string', example: 'Priya Sharma' },
                            customer_email: {
                              type: 'string',
                              format: 'email',
                              example: 'priya@example.com',
                            },
                            customer_phone: {
                              type: 'string',
                              nullable: true,
                              example: '9876543210',
                            },
                            shipping_address: {
                              type: 'string',
                              example:
                                '12, Temple Street, Mylapore, Chennai, Tamil Nadu 600004',
                            },
                            subtotal: { type: 'number', example: 8999 },
                            delivery_charge: { type: 'number', example: 0 },
                            total_amount: { type: 'number', example: 8999 },
                            payment_method: {
                              type: 'string',
                              enum: ['cash_on_delivery'],
                              example: 'cash_on_delivery',
                            },
                            payment_status: { type: 'string', example: 'pending' },
                            order_status: { type: 'string', example: 'placed' },
                            items: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'integer', example: 1 },
                                  order_id: { type: 'integer', example: 1 },
                                  product_id: { type: 'integer', example: 8 },
                                  product_name: {
                                    type: 'string',
                                    example: 'Kanchi Silk Saree',
                                  },
                                  product_sku: {
                                    type: 'string',
                                    example: 'SKB-KAN-008',
                                  },
                                  quantity: { type: 'integer', example: 1 },
                                  unit_price: { type: 'number', example: 8999 },
                                  line_total: { type: 'number', example: 8999 },
                                  created_at: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                },
                              },
                            },
                            created_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                            updated_at: {
                              type: 'string',
                              format: 'date-time',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: { description: 'Invalid order id' },
              401: { description: 'Unauthorized' },
              403: { description: 'Forbidden' },
              404: { description: 'Order not found' },
              500: { description: 'Internal server error' },
            },
          },
        },
        '/api/v1/products/{productId}/reviews': {
          get: {
            tags: ['Rating'],
            summary: 'List product reviews',
            parameters: [
              { in: 'path', name: 'productId', required: true, schema: { type: 'integer' } },
              { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
              { in: 'query', name: 'sort_by', schema: { type: 'string', enum: ['created_at', 'rating'], default: 'created_at' } },
              { in: 'query', name: 'sort_order', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
            ],
            responses: { 200: { description: 'Product reviews list' } },
          },
          post: {
            tags: ['Rating'],
            summary: 'Create product review',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'productId', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['rating'],
                    properties: {
                      rating: { type: 'integer', minimum: 1, maximum: 5 },
                      title: { type: 'string', nullable: true },
                      comment: { type: 'string', nullable: true },
                    },
                    example: {
                      rating: 5,
                      title: 'Excellent saree',
                      comment: 'Very good quality and finishing.',
                    },
                  },
                },
              },
            },
            responses: {
              201: { description: 'Review created' },
              401: { description: 'Unauthorized' },
            },
          },
        },
        '/api/v1/products/{productId}/rating-summary': {
          get: {
            tags: ['Rating'],
            summary: 'Get product rating summary',
            parameters: [{ in: 'path', name: 'productId', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Rating summary details' } },
          },
        },
        '/api/v1/reviews/{id}': {
          patch: {
            tags: ['Rating'],
            summary: 'Update own review',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rating: { type: 'integer', minimum: 1, maximum: 5 },
                      title: { type: 'string', nullable: true },
                      comment: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Review updated' },
              401: { description: 'Unauthorized' },
            },
          },
          delete: {
            tags: ['Rating'],
            summary: 'Delete own review',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: {
              200: { description: 'Review deleted' },
              401: { description: 'Unauthorized' },
            },
          },
        },
        '/api/v1/admin/categories': {
          get: {
            tags: ['Admin Category'],
            summary: 'List categories',
            description: 'Admin only. Lists categories for catalog management.',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Category list' } },
          },
          post: {
            tags: ['Admin Category'],
            summary: 'Create category',
            description: 'Admin only. Creates a catalog category.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['name'],
                    properties: {
                      name: { type: 'string', minLength: 2, maxLength: 120 },
                      description: { type: 'string', nullable: true },
                      image: {
                        type: 'string',
                        format: 'binary',
                        description: 'Select one image file up to 10MB. It will be uploaded to Cloudinary and stored automatically.',
                      },
                      is_active: { type: 'boolean', default: true },
                    },
                    example: {
                      name: 'Silks',
                      description: 'Silk saree category',
                      is_active: true,
                    },
                  },
                },
              },
            },
            responses: { 201: { description: 'Category created' } },
          },
        },
        '/api/v1/admin/categories/{id}': {
          get: {
            tags: ['Admin Category'],
            summary: 'Get category by id',
            description: 'Admin only. Returns one category for catalog management.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Category details' } },
          },
          patch: {
            tags: ['Admin Category'],
            summary: 'Update category',
            description: 'Admin only. Updates category details.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', minLength: 2, maxLength: 120 },
                      description: { type: 'string', nullable: true },
                      image: {
                        type: 'string',
                        format: 'binary',
                        description: 'Select one image file up to 10MB. It will be uploaded to Cloudinary and stored automatically.',
                      },
                      is_active: { type: 'boolean' },
                    },
                    example: {
                      name: 'Premium Silks',
                      description: 'Updated silk saree category',
                      is_active: true,
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Category updated' } },
          },
          delete: {
            tags: ['Admin Category'],
            summary: 'Deactivate category',
            description: 'Admin only. Deactivates a category.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Category deactivated successfully' } },
          },
        },
        '/api/v1/categories': {
          get: {
            tags: ['Public Category'],
            summary: 'List public categories',
            responses: { 200: { description: 'Category list' } },
          },
        },

        '/api/v1/admin/products': {
          get: {
            tags: ['Admin Product'],
            summary: 'List products',
            description: 'Admin only. Lists products for catalog management.',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
              { in: 'query', name: 'search', schema: { type: 'string', nullable: true } },
              { in: 'query', name: 'category_id', schema: { type: 'integer' } },
              { in: 'query', name: 'fabric', schema: { type: 'string', nullable: true } },
              { in: 'query', name: 'occasion', schema: { type: 'string', nullable: true } },
              { in: 'query', name: 'color', schema: { type: 'string', nullable: true } },
              {
                in: 'query',
                name: 'status',
                schema: { type: 'string', enum: ['draft', 'active', 'inactive', 'archived'] },
              },
              { in: 'query', name: 'is_new_arrival', schema: { type: 'boolean' } },
              { in: 'query', name: 'min_price', schema: { type: 'number' } },
              { in: 'query', name: 'max_price', schema: { type: 'number' } },
              { in: 'query', name: 'in_stock', schema: { type: 'boolean' } },
              {
                in: 'query',
                name: 'sort_by',
                schema: {
                  type: 'string',
                  enum: ['id', 'name', 'slug', 'sku', 'mrp', 'selling_price', 'stock', 'created_at', 'updated_at'],
                  default: 'created_at',
                },
              },
              {
                in: 'query',
                name: 'sort_order',
                schema: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  default: 'desc',
                },
              },
            ],
            responses: { 200: { description: 'Products list' } },
          },
          post: {
            tags: ['Admin Product'],
            summary: 'Create product',
            description: 'Admin only. Creates a product in the catalog.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['name', 'sku', 'category_id', 'mrp', 'selling_price', 'stock'],
                    properties: {
                      name: { type: 'string', minLength: 2, maxLength: 255 },
                      sku: { type: 'string', minLength: 2, maxLength: 100 },
                      short_description: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      category_id: { type: 'integer' },
                      fabric: { type: 'string', nullable: true },
                      occasion: { type: 'string', nullable: true },
                      color: { type: 'string', nullable: true },
                      blouse_included: { type: 'boolean', default: false },
                      mrp: { type: 'number' },
                      selling_price: { type: 'number' },
                      stock: { type: 'integer' },
                      is_new_arrival: { type: 'boolean', default: false },
                      status: { type: 'string', enum: ['draft', 'active', 'inactive', 'archived'], default: 'draft' },
                      images: {
                        type: 'array',
                        items: {
                          type: 'string',
                          format: 'binary',
                        },
                        description: 'Select one or more image files up to 10MB each. Images are uploaded to Cloudinary and served with optimized compression.',
                      },
                    },
                    example: {
                      name: 'Kanchi Silk Saree',
                      sku: 'SKU001',
                      short_description: 'Premium silk saree',
                      description: 'Handwoven premium Kanchi silk saree.',
                      category_id: 1,
                      fabric: 'Silk',
                      occasion: 'Wedding',
                      color: 'Red',
                      blouse_included: true,
                      mrp: 12999,
                      selling_price: 10999,
                      stock: 5,
                      status: 'active',
                    },
                  },
                },
              },
            },
            responses: { 201: { description: 'Product created' } },
          },
        },
        '/api/v1/admin/products/search-suggestions': {
          get: {
            tags: ['Admin Product'],
            summary: 'Get admin product search suggestions',
            description: 'Admin only. Returns product search suggestions for catalog management.',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'query', name: 'q', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 10, default: 8 } },
            ],
            responses: { 200: { description: 'Admin search suggestions list' } },
          },
        },
        '/api/v1/admin/products/{id}': {
          get: {
            tags: ['Admin Product'],
            summary: 'Get product by id',
            description: 'Admin only. Returns one product for catalog management.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Product details' } },
          },
          patch: {
            tags: ['Admin Product'],
            summary: 'Update product',
            description: 'Admin only. Updates product details, stock, status, and new-arrival flag.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', minLength: 2, maxLength: 255 },
                      sku: { type: 'string', minLength: 2, maxLength: 100 },
                      short_description: { type: 'string', nullable: true },
                      description: { type: 'string', nullable: true },
                      category_id: { type: 'integer' },
                      fabric: { type: 'string', nullable: true },
                      occasion: { type: 'string', nullable: true },
                      color: { type: 'string', nullable: true },
                      blouse_included: { type: 'boolean' },
                      mrp: { type: 'number' },
                      selling_price: { type: 'number' },
                      stock: { type: 'integer' },
                      is_new_arrival: { type: 'boolean' },
                      status: { type: 'string', enum: ['draft', 'active', 'inactive', 'archived'] },
                      images: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            image_url: { type: 'string', format: 'uri' },
                            alt_text: { type: 'string', nullable: true },
                            is_primary: { type: 'boolean' },
                            sort_order: { type: 'integer', minimum: 0 },
                          },
                        },
                      },
                    },
                    example: {
                      selling_price: 9999,
                      stock: 8,
                      color: 'Maroon',
                      is_new_arrival: true,
                      status: 'active',
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Product updated' } },
          },
          delete: {
            tags: ['Admin Product'],
            summary: 'Deactivate product',
            description: 'Admin only. Deactivates a product.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Product deactivated' } },
          },
        },
        '/api/v1/products': {
          get: {
            tags: ['Public Product'],
            summary: 'List products',
            parameters: [
              { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1, default: 1 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
              { in: 'query', name: 'search', schema: { type: 'string', nullable: true } },
              { in: 'query', name: 'category_id', schema: { type: 'integer' } },
              { in: 'query', name: 'fabric', schema: { type: 'string' } },
              { in: 'query', name: 'occasion', schema: { type: 'string' } },
              { in: 'query', name: 'color', schema: { type: 'string' } },
              { in: 'query', name: 'newArrival', schema: { type: 'boolean' } },
              { in: 'query', name: 'minPrice', schema: { type: 'number' } },
              { in: 'query', name: 'maxPrice', schema: { type: 'number' } },
              { in: 'query', name: 'inStock', schema: { type: 'boolean' } },
              {
                in: 'query',
                name: 'sort',
                schema: {
                  type: 'string',
                  enum: ['newest', 'price_asc', 'price_desc', 'name_asc'],
                  default: 'newest',
                },
              },
            ],
            responses: { 200: { description: 'Products list' } },
          },
        },
        '/api/v1/products/search-suggestions': {
          get: {
            tags: ['Public Product'],
            summary: 'Get product search suggestions',
            parameters: [
              { in: 'query', name: 'q', required: true, schema: { type: 'string', minLength: 1, maxLength: 100 } },
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 10, default: 8 } },
            ],
            responses: { 200: { description: 'Search suggestions list' } },
          },
        },
        '/api/v1/products/{slug}': {
          get: {
            tags: ['Public Product'],
            summary: 'Get product by slug',
            parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }],
            responses: { 200: { description: 'Product details' } },
          },
        },
        '/api/v1/products/filters': {
          get: {
            tags: ['Public Product'],
            summary: 'Get product filters',
            parameters: [
              { in: 'query', name: 'category_id', schema: { type: 'integer' } },
              { in: 'query', name: 'occasion', schema: { type: 'string' } },
            ],
            responses: { 200: { description: 'Filters data' } },
          },
        },
        '/api/v1/admin/discounts': {
          get: {
            tags: ['Admin Discount'],
            summary: 'List discounts',
            description: 'Admin only. Lists discounts for offer management.',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Discount list' } },
          },
          post: {
            tags: ['Admin Discount'],
            summary: 'Create discount',
            description: 'Admin only. Creates a discount or coupon.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['title', 'code', 'type', 'value', 'applies_to', 'starts_at', 'ends_at'],
                    properties: {
                      title: { type: 'string', minLength: 2, maxLength: 255 },
                      code: { type: 'string', minLength: 2, maxLength: 100 },
                      description: { type: 'string', nullable: true },
                      type: { type: 'string', enum: ['percentage', 'fixed'] },
                      value: { type: 'number' },
                      applies_to: { type: 'string', enum: ['all', 'category', 'product'] },
                      min_order_value: { type: 'number', nullable: true },
                      max_discount_amount: { type: 'number', nullable: true },
                      usage_limit: { type: 'integer', nullable: true },
                      is_active: { type: 'boolean', default: true },
                      starts_at: { type: 'string', format: 'date-time' },
                      ends_at: { type: 'string', format: 'date-time' },
                    },
                    example: {
                      title: 'Wedding Offer',
                      code: 'WED10',
                      description: '10% off on wedding collection',
                      type: 'percentage',
                      value: 10,
                      applies_to: 'all',
                      min_order_value: 5000,
                      max_discount_amount: 2000,
                      usage_limit: 100,
                      is_active: true,
                      starts_at: '2026-04-09T00:00:00.000Z',
                      ends_at: '2026-04-30T23:59:59.000Z',
                    },
                  },
                },
              },
            },
            responses: { 201: { description: 'Discount created' } },
          },
        },
        '/api/v1/admin/discounts/{id}': {
          get: {
            tags: ['Admin Discount'],
            summary: 'Get discount by id',
            description: 'Admin only. Returns one discount for offer management.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Discount details' } },
          },
          patch: {
            tags: ['Admin Discount'],
            summary: 'Update discount',
            description: 'Admin only. Updates a discount or coupon.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', minLength: 2, maxLength: 255 },
                      code: { type: 'string', minLength: 2, maxLength: 100 },
                      description: { type: 'string', nullable: true },
                      type: { type: 'string', enum: ['percentage', 'fixed'] },
                      value: { type: 'number' },
                      applies_to: { type: 'string', enum: ['all', 'category', 'product'] },
                      min_order_value: { type: 'number', nullable: true },
                      max_discount_amount: { type: 'number', nullable: true },
                      usage_limit: { type: 'integer', nullable: true },
                      is_active: { type: 'boolean' },
                      starts_at: { type: 'string', format: 'date-time' },
                      ends_at: { type: 'string', format: 'date-time' },
                    },
                    example: {
                      value: 15,
                      max_discount_amount: 2500,
                      is_active: true,
                      ends_at: '2026-05-15T23:59:59.000Z',
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Discount updated' } },
          },
          delete: {
            tags: ['Admin Discount'],
            summary: 'Delete discount',
            description: 'Admin only. Deletes a discount or coupon.',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
            responses: { 200: { description: 'Discount deleted' } },
          },
        },
        '/api/v1/coupons/validate': {
          post: {
            tags: ['Public Offer'],
            summary: 'Validate coupon',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['code', 'order_amount'],
                    properties: {
                      code: { type: 'string', minLength: 2, maxLength: 100 },
                      order_amount: { type: 'number', minimum: 0 },
                      product_id: { type: 'integer', nullable: true },
                      category_id: { type: 'integer', nullable: true },
                    },
                    example: {
                      code: 'WED10',
                      order_amount: 12000,
                      product_id: 1,
                      category_id: 1,
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Coupon validation result' } },
          },
        },
        '/api/v1/offers/active': {
          get: {
            tags: ['Public Offer'],
            summary: 'List active offers',
            responses: { 200: { description: 'Active offers' } },
          },
        },

        '/api/v1/contact/send-mail': {
          post: {
            tags: ['Contact'],
            summary: 'Send contact enquiry email',
            description:
              'Accepts contact form details and sends the enquiry to the configured store email address.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['full_name', 'phone_number', 'email', 'subject', 'message'],
                    properties: {
                      full_name: {
                        type: 'string',
                        minLength: 2,
                        maxLength: 150,
                        example: 'Sowmya Reddy',
                      },
                      phone_number: {
                        type: 'string',
                        example: '+919876543210',
                      },
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'sowmya@example.com',
                      },
                      subject: {
                        type: 'string',
                        minLength: 3,
                        maxLength: 200,
                        example: 'Product enquiry',
                      },
                      message: {
                        type: 'string',
                        minLength: 10,
                        maxLength: 2000,
                        example: 'Please send details about your latest saree collection.',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              202: {
                description: 'Contact enquiry sent successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        message: {
                          type: 'string',
                          example: 'Contact enquiry sent successfully',
                        },
                        data: {
                          type: 'object',
                          properties: {
                            emailSent: { type: 'boolean', example: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
              400: { description: 'Validation error' },
              500: { description: 'Internal server error' },
            },
          },
        },

        '/api/v1/new-arrivals/notify': {
          post: {
            tags: ['Public Marketing'],
            summary: 'Request new arrivals email notification',
            description: 'Public users can enter an email address to receive new arrivals notification email without login.',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                        example: 'user@example.com',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              202: { description: 'New arrivals email request accepted' },
              400: { description: 'Validation error' },
              500: { description: 'Internal server error' },
            },
          },
        },

        '/api/v1/admin/inventory': {
          get: {
            tags: ['Admin Inventory'],
            summary: 'List inventory',
            description: 'Admin only. Lists inventory records.',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Inventory list' } },
          },
        },
        '/api/v1/admin/inventory/low-stock': {
          get: {
            tags: ['Admin Inventory'],
            summary: 'Low stock items',
            description: 'Admin only. Lists products that need stock attention.',
            security: [{ bearerAuth: [] }],
            responses: { 200: { description: 'Low stock list' } },
          },
        },
        '/api/v1/admin/inventory/adjust': {
          post: {
            tags: ['Admin Inventory'],
            summary: 'Adjust inventory',
            description: 'Admin only. Adjusts available, reserved, or threshold inventory values.',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['product_id', 'adjustment_type', 'quantity'],
                    properties: {
                      product_id: { type: 'integer' },
                      adjustment_type: {
                        type: 'string',
                        enum: ['increase', 'decrease', 'set', 'reserve', 'release'],
                      },
                      quantity: { type: 'integer', minimum: 0 },
                      low_stock_threshold: { type: 'integer', minimum: 0 },
                    },
                    example: {
                      product_id: 1,
                      adjustment_type: 'increase',
                      quantity: 5,
                      low_stock_threshold: 3,
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Adjusted inventory' } },
          },
        },
        '/api/v1/admin/inventory/{productId}': {
          get: {
            tags: ['Admin Inventory'],
            summary: 'Get inventory by product id',
            description: 'Admin only. Returns inventory details for one product.',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'path', name: 'productId', required: true, schema: { type: 'integer' } },
            ],
            responses: { 200: { description: 'Inventory details' } },
          },
          patch: {
            tags: ['Admin Inventory'],
            summary: 'Update inventory by product id',
            description: 'Admin only. Updates inventory details for one product.',
            security: [{ bearerAuth: [] }],
            parameters: [
              { in: 'path', name: 'productId', required: true, schema: { type: 'integer' } },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      available_stock: { type: 'integer', minimum: 0 },
                      reserved_stock: { type: 'integer', minimum: 0 },
                      low_stock_threshold: { type: 'integer', minimum: 0 },
                    },
                    example: {
                      available_stock: 12,
                      reserved_stock: 2,
                      low_stock_threshold: 4,
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Inventory updated' } },
          },
        },
        '/api/v1/admin/dashboard/summary': {
          get: {
            tags: ['Admin Dashboard'],
            summary: 'Get dashboard summary',
            description: 'Admin only. Returns business dashboard summary metrics.',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Dashboard summary',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: {
                          type: 'object',
                          properties: {
                            total_products: { type: 'integer' },
                            active_products: { type: 'integer' },
                            inactive_products: { type: 'integer' },
                            new_arrival_products: { type: 'integer' },
                            category_count: { type: 'integer' },
                            active_discounts: { type: 'integer' },
                            low_stock_count: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/v1/admin/dashboard/top-products': {
          get: {
            tags: ['Admin Dashboard'],
            summary: 'Get dashboard top products',
            description: 'Admin only. Returns top products for the business dashboard.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'limit',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
              },
            ],
            responses: { 200: { description: 'Top products list' } },
          },
        },
        '/api/v1/admin/dashboard/low-stock': {
          get: {
            tags: ['Admin Dashboard'],
            summary: 'Get dashboard low stock products',
            description: 'Admin only. Returns low-stock products for the business dashboard.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'limit',
                schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
              },
            ],
            responses: { 200: { description: 'Low stock products list' } },
          },
        },
        '/api/v1/admin/dashboard/category-summary': {
          get: {
            tags: ['Admin Dashboard'],
            summary: 'Get dashboard category summary',
            description: 'Admin only. Returns category-wise catalog analytics.',
            security: [{ bearerAuth: [] }],
            parameters: [
              {
                in: 'query',
                name: 'limit',
                schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
              },
            ],
            responses: { 200: { description: 'Category summary list' } },
          },
        },
        '/api/v1/public/dashboard/home': {
          get: {
            tags: ['Public Dashboard'],
            summary: 'Get public dashboard home data',
            parameters: [
              { in: 'query', name: 'hero_limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
              { in: 'query', name: 'category_limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 8 } },
              { in: 'query', name: 'deal_limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
              { in: 'query', name: 'product_limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 } },
            ],
            responses: {
              200: {
                description: 'Public dashboard home payload',
              },
            },
          },
        },
        '/api/v1/public/dashboard/hero-banners': {
          get: {
            tags: ['Public Dashboard'],
            summary: 'Get public hero banners',
            parameters: [
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
            ],
            responses: { 200: { description: 'Hero banners list' } },
          },
        },
        '/api/v1/public/dashboard/featured-categories': {
          get: {
            tags: ['Public Dashboard'],
            summary: 'Get public featured categories',
            parameters: [
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
            ],
            responses: { 200: { description: 'Featured categories list' } },
          },
        },
        '/api/v1/public/dashboard/top-deals': {
          get: {
            tags: ['Public Dashboard'],
            summary: 'Get public top deals',
            parameters: [
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
            ],
            responses: { 200: { description: 'Top deals list' } },
          },
        },
        '/api/v1/public/dashboard/trending-products': {
          get: {
            tags: ['Public Dashboard'],
            summary: 'Get public trending products',
            parameters: [
              { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
            ],
            responses: { 200: { description: 'Trending products list' } },
          },
        },



        '/api/v1/addresses': {
  get: {
    tags: ['Address'],
    summary: 'List saved delivery addresses',
    description:
      'Returns all saved addresses for the logged-in user. Default address comes first, similar to Flipkart address selection.',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Addresses fetched successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: {
                  type: 'string',
                  example: 'Addresses fetched successfully',
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer', example: 1 },
                      user_id: { type: 'integer', example: 5 },
                      full_name: { type: 'string', example: 'Triveni' },
                      phone: { type: 'string', example: '6301418822' },
                      pincode: { type: 'string', example: '501505' },
                      address_line1: {
                        type: 'string',
                        example: '5-64/1 Triveni Gandhi bomma center',
                      },
                      address_line2: {
                        type: 'string',
                        nullable: true,
                        example: 'Near Bonalamma temple, Suresh Tent House',
                      },
                      city: { type: 'string', example: 'Hyderabad' },
                      state: { type: 'string', example: 'Telangana' },
                      landmark: {
                        type: 'string',
                        nullable: true,
                        example: 'Zilla Parishad High School',
                      },
                      address_type: {
                        type: 'string',
                        enum: ['home', 'work', 'other'],
                        example: 'home',
                      },
                      is_default: { type: 'boolean', example: true },
                      created_at: {
                        type: 'string',
                        format: 'date-time',
                      },
                      updated_at: {
                        type: 'string',
                        format: 'date-time',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      401: { description: 'Unauthorized' },
      500: { description: 'Internal server error' },
    },
  },

  post: {
    tags: ['Address'],
    summary: 'Add new delivery address',
    description:
      'Creates a new saved delivery address. If this is the first address, backend marks it as default automatically. If is_default is true, previous default address becomes false.',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'full_name',
              'phone',
              'pincode',
              'address_line1',
              'city',
              'state',
            ],
            properties: {
              full_name: {
                type: 'string',
                minLength: 2,
                maxLength: 150,
                example: 'Triveni',
              },
              phone: {
                type: 'string',
                example: '6301418822',
              },
              pincode: {
                type: 'string',
                minLength: 4,
                maxLength: 10,
                example: '501505',
              },
              address_line1: {
                type: 'string',
                minLength: 5,
                maxLength: 500,
                example: '5-64/1 Triveni Gandhi bomma center',
              },
              address_line2: {
                type: 'string',
                nullable: true,
                example: 'Near Bonalamma temple, Suresh Tent House',
              },
              city: {
                type: 'string',
                example: 'Hyderabad',
              },
              state: {
                type: 'string',
                example: 'Telangana',
              },
              landmark: {
                type: 'string',
                nullable: true,
                example: 'Zilla Parishad High School',
              },
              address_type: {
                type: 'string',
                enum: ['home', 'work', 'other'],
                default: 'home',
                example: 'home',
              },
              is_default: {
                type: 'boolean',
                default: false,
                example: true,
              },
            },
            example: {
              full_name: 'Triveni',
              phone: '6301418822',
              pincode: '501505',
              address_line1: '5-64/1 Triveni Gandhi bomma center',
              address_line2: 'Near Bonalamma temple, Suresh Tent House',
              city: 'Hyderabad',
              state: 'Telangana',
              landmark: 'Zilla Parishad High School',
              address_type: 'home',
              is_default: true,
            },
          },
        },
      },
    },
    responses: {
      201: { description: 'Address created successfully' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
      500: { description: 'Internal server error' },
    },
  },
},

'/api/v1/addresses/{id}': {
  get: {
    tags: ['Address'],
    summary: 'Get saved address by id',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'integer' },
        example: 1,
      },
    ],
    responses: {
      200: { description: 'Address fetched successfully' },
      401: { description: 'Unauthorized' },
      404: { description: 'Address not found' },
      500: { description: 'Internal server error' },
    },
  },

  patch: {
    tags: ['Address'],
    summary: 'Update saved delivery address',
    description:
      'Updates one saved address. If is_default is true, this address becomes selected/default and previous default address becomes false.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'integer' },
        example: 1,
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            minProperties: 1,
            properties: {
              full_name: {
                type: 'string',
                minLength: 2,
                maxLength: 150,
                example: 'Triveni',
              },
              phone: {
                type: 'string',
                example: '6301418822',
              },
              pincode: {
                type: 'string',
                example: '501505',
              },
              address_line1: {
                type: 'string',
                example: '5-64/1 Triveni Gandhi bomma center',
              },
              address_line2: {
                type: 'string',
                nullable: true,
                example: 'Near Bonalamma temple',
              },
              city: {
                type: 'string',
                example: 'Hyderabad',
              },
              state: {
                type: 'string',
                example: 'Telangana',
              },
              landmark: {
                type: 'string',
                nullable: true,
                example: 'Zilla Parishad High School',
              },
              address_type: {
                type: 'string',
                enum: ['home', 'work', 'other'],
                example: 'home',
              },
              is_default: {
                type: 'boolean',
                example: true,
              },
            },
            example: {
              address_line2: 'Near Bonalamma temple, Suresh Tent House',
              landmark: 'Zilla Parishad High School',
              is_default: true,
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'Address updated successfully' },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
      404: { description: 'Address not found' },
      500: { description: 'Internal server error' },
    },
  },

  delete: {
    tags: ['Address'],
    summary: 'Delete saved delivery address',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'integer' },
        example: 1,
      },
    ],
    responses: {
      200: { description: 'Address deleted successfully' },
      401: { description: 'Unauthorized' },
      404: { description: 'Address not found' },
      500: { description: 'Internal server error' },
    },
  },
},

'/api/v1/addresses/{id}/default': {
  patch: {
    tags: ['Address'],
    summary: 'Select default delivery address',
    description:
      'Flipkart style address selection API. Frontend calls this when user selects an address from the bottom sheet. Selected address becomes default and all other addresses become non-default.',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        in: 'path',
        name: 'id',
        required: true,
        schema: { type: 'integer' },
        example: 1,
      },
    ],
    responses: {
      200: { description: 'Default address updated successfully' },
      401: { description: 'Unauthorized' },
      404: { description: 'Address not found' },
      500: { description: 'Internal server error' },
    },
  },
},

      },
};

const compatExport = {
  ...openapiDocument,
  document: openapiDocument,
};

module.exports = compatExport;
module.exports.openapiDocument = openapiDocument;
module.exports.swaggerOptions = {
  mode: 'static',
  specification: {
    document: openapiDocument,
  },
};
module.exports.dynamicOptions = {
  openapi: openapiDocument,
  exposeRoute: true,
  routePrefix: '/swagger',
};
module.exports.swaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  staticCSP: true,
  transformSpecificationClone: true,
};
