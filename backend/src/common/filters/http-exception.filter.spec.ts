import { HttpExceptionFilter } from './http-exception.filter';
import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('should format HttpException standard error response', () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as any;

    filter.catch(new NotFoundException('Không tìm thấy sân'), host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy sân',
      }),
    );
  });

  it('should format Prisma P2002 conflict error as HTTP 409', () => {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
      }),
    } as any;

    filter.catch({ code: 'P2002' }, host);

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        error: 'Conflict',
      }),
    );
  });
});
