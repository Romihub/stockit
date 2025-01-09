export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuthContextType {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
}

export class AuthError extends Error {
  code?: string;
  errors?: {
    [key: string]: string[];
  };

  constructor(message: string, code?: string, errors?: { [key: string]: string[] }) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.errors = errors;
  }
}