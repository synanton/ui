import { ApiClientError } from "@synanton/api-client";

/** Runs a request once, retrying once after a successful silent re-auth on 401. */
export async function requestWithReauth<T>(
  request: () => Promise<T>,
  onUnauthorized?: () => Promise<boolean>
): Promise<T> {
  try {
    return await request();
  } catch (failure) {
    if (failure instanceof ApiClientError
        && failure.code === "AUTHENTICATION_REQUIRED"
        && onUnauthorized) {
      if (!(await onUnauthorized())) {
        throw failure;
      }
      return request();
    }
    throw failure;
  }
}
