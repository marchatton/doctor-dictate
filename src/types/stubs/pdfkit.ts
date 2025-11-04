export default class PDFDocument {
  constructor(_options?: Record<string, unknown>) {}
  pipe(_stream: NodeJS.WritableStream): void {}
  fontSize(_size: number): this {
    return this;
  }
  font(_name: string): this {
    return this;
  }
  text(
    _text: string,
    _x?: number | Record<string, unknown>,
    _y?: number | Record<string, unknown>,
    _options?: Record<string, unknown>,
  ): this {
    return this;
  }
  moveDown(_lines?: number): this {
    return this;
  }
  end(): void {}
  page = { width: 612, height: 792 };
}
