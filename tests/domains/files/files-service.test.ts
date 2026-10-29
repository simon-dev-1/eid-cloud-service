import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

const { storage } = await import('../../../src/clients/storage.js');
const filesDao = await import('../../../src/domains/files/files-dao.js');
const filesService = await import('../../../src/domains/files/files-service.js');
const { notFoundError } = await import('../../../src/utils/errors.js');

const putMock = jest.mocked(storage.put);
const getMock = jest.mocked(storage.get);
const deleteMock = jest.mocked(storage.delete);
const createFileMock = jest.mocked(filesDao.createFile);
const getFileByIdMock = jest.mocked(filesDao.getFileById);
const listFilesMock = jest.mocked(filesDao.listFiles);
const deleteFileMock = jest.mocked(filesDao.deleteFile);

const vaultId = '11111111-1111-4111-8111-111111111111';

const fileRecord = {
  id: '00000000-0000-4000-8000-000000000001',
  storageKey: '00000000-0000-4000-8000-000000000001',
  originalName: 'hello.txt',
  contentType: 'text/plain',
  size: 5,
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('files service', () => {
  describe('uploadFile', () => {
    it('writes the blob then stores metadata scoped to the vault', async () => {
      putMock.mockResolvedValue(undefined);
      createFileMock.mockResolvedValue(fileRecord);

      const result = await filesService.uploadFile(
        {
          originalName: 'hello.txt',
          contentType: 'text/plain',
          data: Buffer.from('hello'),
          size: 5,
        },
        vaultId,
      );

      expect(putMock).toHaveBeenCalledTimes(1);
      expect(putMock).toHaveBeenCalledWith(expect.any(String), Buffer.from('hello'), 'text/plain');
      expect(createFileMock).toHaveBeenCalledTimes(1);
      expect(createFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'hello.txt',
          contentType: 'text/plain',
          size: 5,
        }),
        vaultId,
      );
      expect(result).toEqual(fileRecord);
    });

    it('sanitizes the original file name', async () => {
      putMock.mockResolvedValue(undefined);
      createFileMock.mockResolvedValue(fileRecord);

      await filesService.uploadFile(
        {
          originalName: '../../etc/passwd',
          contentType: 'text/plain',
          data: Buffer.from(''),
          size: 0,
        },
        vaultId,
      );

      expect(createFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          originalName: 'passwd',
        }),
        vaultId,
      );
    });
  });

  describe('listFiles', () => {
    it('returns the metadata list for the vault', async () => {
      listFilesMock.mockResolvedValue([fileRecord]);

      const result = await filesService.listFiles(vaultId);

      expect(listFilesMock).toHaveBeenCalledWith(vaultId);
      expect(result).toEqual([fileRecord]);
    });
  });

  describe('downloadFile', () => {
    it('returns the blob and metadata', async () => {
      getFileByIdMock.mockResolvedValue(fileRecord);
      getMock.mockResolvedValue({ data: Buffer.from('hello') });

      const result = await filesService.downloadFile(fileRecord.id, vaultId);

      expect(getFileByIdMock).toHaveBeenCalledWith(fileRecord.id, vaultId);
      expect(getMock).toHaveBeenCalledWith(fileRecord.storageKey);
      expect(result.data).toEqual(Buffer.from('hello'));
      expect(result.record).toEqual(fileRecord);
    });

    it('throws notFoundError when the file does not exist', async () => {
      getFileByIdMock.mockResolvedValue(undefined);

      await expect(filesService.downloadFile('missing', vaultId)).rejects.toBeInstanceOf(
        notFoundError,
      );
    });
  });

  describe('deleteFile', () => {
    it('deletes the blob and metadata', async () => {
      getFileByIdMock.mockResolvedValue(fileRecord);
      deleteMock.mockResolvedValue(undefined);
      deleteFileMock.mockResolvedValue(undefined);

      await filesService.deleteFile(fileRecord.id, vaultId);

      expect(deleteMock).toHaveBeenCalledWith(fileRecord.storageKey);
      expect(deleteFileMock).toHaveBeenCalledWith(fileRecord.id, vaultId);
    });

    it('throws notFoundError when the file does not exist', async () => {
      getFileByIdMock.mockResolvedValue(undefined);

      await expect(filesService.deleteFile('missing', vaultId)).rejects.toBeInstanceOf(
        notFoundError,
      );
    });
  });
});
