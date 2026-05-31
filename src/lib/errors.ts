type SizeErrorOptions = {
  target?: "import" | "export" | "storage"
  limitBytes?: number
  actualBytes?: number
}

export class SizeError extends Error {
  readonly options?: SizeErrorOptions

  constructor(message: string, options?: SizeErrorOptions) {
    super(message);
    this.name = 'SizeError';
    this.options = options
  }
}

type SchemaValidationErrorOptions = {
  index?: number
  field?: string
}

export class SchemaValidationError extends Error {
  readonly options?: SchemaValidationErrorOptions

  constructor(message: string, options?: SchemaValidationErrorOptions) {
    super(message);
    this.name = 'SchemaValidationError';
    this.options = options
  }
}

export class InvalidDateError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDateError';
  }
}
