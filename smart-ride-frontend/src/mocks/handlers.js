import { rest } from 'msw';

export const handlers = [
  rest.post('*/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          token: 'fake-token',
          user: { id: 1, full_name: 'Test User', role: 'user' }
        }
      })
    );
  }),
  rest.post('*/api/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: 'Registration successful'
      })
    );
  })
];
