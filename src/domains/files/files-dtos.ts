export interface FileDto {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export interface FileRecord extends FileDto {
  storageKey: string;
}

export interface CreateFileInput {
  originalName: string;
  contentType: string;
  data: Buffer;
  size: number;
}

export interface FileIdParams {
  id: string;
}
