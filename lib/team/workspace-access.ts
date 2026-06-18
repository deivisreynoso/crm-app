export class WorkspaceAccessDeniedError extends Error {
  constructor(message = "User is not a member of the organization") {
    super(message);
    this.name = "WorkspaceAccessDeniedError";
  }
}

export function isWorkspaceAccessDeniedError(
  error: unknown
): error is WorkspaceAccessDeniedError {
  return error instanceof WorkspaceAccessDeniedError;
}
