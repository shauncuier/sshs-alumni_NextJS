/** An expected failure with a user-facing message and the HTTP status to return. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}
