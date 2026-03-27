declare module 'node-exiftool' {
  export class ExiftoolProcess {
    constructor(binPath?: string)
    open(): Promise<void>
    close(): Promise<void>
    readMetadata(
      filePath: string,
      args?: string[],
    ): Promise<{
      data: Record<string, unknown>[] | Record<string, unknown>
      error: string | null
    }>
    writeMetadata(
      filePath: string,
      data: Record<string, unknown>,
      args?: string[],
    ): Promise<void>
  }
}
