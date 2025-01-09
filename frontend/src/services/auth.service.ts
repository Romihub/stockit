import axios from 'axios';
import { LoginCredentials, SignupCredentials, AuthResponse, AuthError } from '../types/auth';
import { handleApiError, isNetworkError, formatValidationErrors } from '../utils/errorHandler';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class AuthService {
  private token: string | null = null;

  constructor() {
    // Initialize token from localStorage if it exists
    this.token = localStorage.getItem('token');
  }

  private setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  private clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getAuthHeader() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_URL}/api/auth/login`,
        credentials
      );
      
      this.setToken(response.data.token);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new AuthError(
          'Unable to connect to the server. Please check your internet connection.',
          'NETWORK_ERROR'
        );
      }

      const apiError = handleApiError(error);
      const validationErrors = apiError.status === 422 
        ? formatValidationErrors((error as any).response?.data?.errors)
        : undefined;
      
      throw new AuthError(apiError.message, apiError.code, validationErrors);
    }
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(
        `${API_URL}/api/auth/register`,
        credentials
      );
      
      this.setToken(response.data.token);
      return response.data;
    } catch (error) {
      if (isNetworkError(error)) {
        throw new AuthError(
          'Unable to connect to the server. Please check your internet connection.',
          'NETWORK_ERROR'
        );
      }

      const apiError = handleApiError(error);
      const validationErrors = apiError.status === 422 
        ? formatValidationErrors((error as any).response?.data?.errors)
        : undefined;
      
      throw new AuthError(apiError.message, apiError.code, validationErrors);
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { headers: this.getAuthHeader() }
      );
    } catch (error) {
      // Even if logout fails on the server, we still want to clear local state
      console.error('Logout error:', handleApiError(error).message);
    } finally {
      this.clearToken();
    }
  }

  async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      await axios.get(`${API_URL}/api/auth/validate`, {
        headers: this.getAuthHeader()
      });
      return true;
    } catch (error) {
      if (!isNetworkError(error)) {
        // Only clear token if it's an auth error, not a network error
        this.clearToken();
      }
      return false;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

const authService = new AuthService();
export default authService;