import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof Error) {
    if ((error as AxiosError).isAxiosError) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const serverMessage = axiosError.response?.data?.message;

      // Handle specific HTTP status codes
      switch (status) {
        case 401:
          return {
            message: 'Authentication required. Please log in again.',
            code: 'UNAUTHORIZED',
            status
          };
        case 403:
          return {
            message: 'You do not have permission to perform this action.',
            code: 'FORBIDDEN',
            status
          };
        case 404:
          return {
            message: 'The requested resource was not found.',
            code: 'NOT_FOUND',
            status
          };
        case 422:
          return {
            message: serverMessage || 'Invalid input data.',
            code: 'VALIDATION_ERROR',
            status
          };
        case 429:
          return {
            message: 'Too many requests. Please try again later.',
            code: 'RATE_LIMIT',
            status
          };
        case 500:
          return {
            message: 'An internal server error occurred. Please try again later.',
            code: 'SERVER_ERROR',
            status
          };
        default:
          return {
            message: serverMessage || 'An unexpected error occurred.',
            code: 'UNKNOWN_ERROR',
            status
          };
      }
    }
    // Handle non-Axios errors
    return {
      message: error.message || 'An unexpected error occurred.',
      code: 'APP_ERROR'
    };
  }
  // Handle unknown error types
  return {
    message: 'An unknown error occurred.',
    code: 'UNKNOWN_ERROR'
  };
};

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const axiosError = error as AxiosError;
    return axiosError.isAxiosError && !axiosError.response;
  }
  return false;
};

export const formatValidationErrors = (errors: any): Record<string, string[]> | undefined => {
  if (!errors || typeof errors !== 'object') {
    return undefined;
  }

  const formattedErrors: Record<string, string[]> = {};
  
  Object.entries(errors).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      formattedErrors[field] = messages.map(msg =>
        typeof msg === 'string' ? msg : 'Invalid value'
      );
    } else if (typeof messages === 'string') {
      formattedErrors[field] = [messages];
    }
  });

  return Object.keys(formattedErrors).length > 0 ? formattedErrors : undefined;
};