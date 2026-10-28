import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.unstable_mockModule('../../../src/clients/storage.js', () => ({
  storage: {
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.unstable_mockModule('../../../src/domains/files/files-dao.js', () => ({
  createFile: jest.fn(),
  getFileById: jest.fn(),
  listFiles: jest.fn(),
  deleteFile: jest.fn(),
}));

const { default: app } = await import('../../../src/app.js');
const { setConfig } = await import('../../../src/config.js');
const { storage } = await import('../../../src/clients/storage.js');
const filesDao = await import('../../../src/domains/files/files-dao.js');
const { testConfig } = await import('../../test-utils.ts');

const putMock = jest.mocked(storage.put);
const getMock = jest.mocked(storage.get);
const deleteMock = jest.mocked(storage.delete);
const createFileMock = jest.mocked(filesDao.createFile);
const getFileByIdMock = jest.mocked(filesDao.getFileById);
const listFilesMock = jest.mocked(filesDao.listFiles);
const deleteFileMock = jest.mocked(filesDao.deleteFile);

const fileDto = {
  id: '00000000-0000-4000-8000-000000000001',
  originalName: 'hello.txt',
  contentType: 'text/plain',
  size: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeAll(() => {
  setConfig({ ...testConfig });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('files routes', () => {
  describe('POST /api/v1/files', () => {
    it('uploads a file and returns 201 with metadata', async () => {
      putMock.mockResolvedValue(undefined);
      createFileMock.mockResolvedValue(fileDto);

      const response = await request(app)
        .post('/api/v1/files')
        .attach('file', Buffer.from('hello'), {
          filename: 'hello.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      expect(response.body).toEqual(fileDto);
      expect(putMock).toHaveBeenCalledTimes(1);
      expect(createFileMock).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when no file is attached', async () => {
      const response = await request(app).post('/api/v1/files').expect(400);

      expect(response.body.message).toBe('File is required');
    });
  });

  describe('GET /api/v1/files', () => {
    it('lists files', async () => {
      listFilesMock.mockResolvedValue([fileDto]);

      const response = await request(app).get('/api/v1/files').expect(200);

      expect(response.body).toEqual([fileDto]);
    });
  });

  describe('GET /api/v1/files/:id', () => {
    it('streams the file back with attachment headers', async () => {
      getFileByIdMock.mockResolvedValue({ ...fileDto, storageKey: fileDto.id });
      getMock.mockResolvedValue({ data: Buffer.from('hello') });

      const response = await request(app).get(`/api/v1/files/${fileDto.id}`).expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toBe('hello');
    });

    it('returns 404 when the file is not found', async () => {
      getFileByIdMock.mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/v1/files/00000000-0000-4000-8000-000000000002')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('returns 400 when the id is not a UUID', async () => {
      const response = await request(app).get('/api/v1/files/unknown-id').expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
      expect(getFileByIdMock).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/files/:id', () => {
    it('deletes the file and returns 204', async () => {
      getFileByIdMock.mockResolvedValue({ ...fileDto, storageKey: fileDto.id });
      deleteMock.mockResolvedValue(undefined);
      deleteFileMock.mockResolvedValue(undefined);

      await request(app).delete(`/api/v1/files/${fileDto.id}`).expect(204);

      expect(deleteMock).toHaveBeenCalledWith(fileDto.id);
      expect(deleteFileMock).toHaveBeenCalledWith(fileDto.id);
    });

    it('returns 404 when the file is not found', async () => {
      getFileByIdMock.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/files/00000000-0000-4000-8000-000000000002')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('returns 400 when the id is not a UUID', async () => {
      const response = await request(app).delete('/api/v1/files/unknown-id').expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })]),
      );
      expect(deleteMock).not.toHaveBeenCalled();
    });
  });
});
