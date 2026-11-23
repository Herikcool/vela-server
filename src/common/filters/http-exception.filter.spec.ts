import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const response = {
    header: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'GET',
        url: '/v1/payments',
        headers: { 'x-request-id': 'client-request-42' },
      }),
      getResponse: () => response,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    response.status.mockReturnValue(response);
  });

  it('returns the request correlation ID in the header and error envelope', () => {
    new HttpExceptionFilter().catch(
      new HttpException('invalid payment', HttpStatus.BAD_REQUEST),
      host as never,
    );

    expect(response.header).toHaveBeenCalledWith(
      'X-Request-ID',
      'client-request-42',
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        requestId: 'client-request-42',
      }),
    );
  });

  it('generates a safe correlation ID when the incoming header is invalid', () => {
    const invalidHost = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/v1/payments',
          headers: { 'x-request-id': 'bad id with whitespace' },
        }),
        getResponse: () => response,
      }),
    };

    new HttpExceptionFilter().catch(
      new Error('unexpected failure'),
      invalidHost as never,
    );

    const requestId = response.header.mock.calls[0][1];
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ requestId }),
    );
  });

  it('maps Prisma errors without exposing query details or metadata', () => {
    new HttpExceptionFilter().catch(
      {
        name: 'PrismaClientKnownRequestError',
        code: 'P2003',
        meta: { cause: 'SELECT secret_column FROM private_table' },
      },
      host as never,
    );

    const body = response.json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'DB_ERROR',
      message: 'Database error',
    });
    expect(JSON.stringify(body)).not.toContain('SELECT secret_column');
  });
});
