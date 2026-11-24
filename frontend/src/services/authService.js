import axiosInstance from './axiosInstance';

/**
 * Registers a new user account.
 * @param {{ name: string, email: string, password: string }} payload
 * @returns {Promise<object>} API response containing user profile and JWT.
 */
export const signupAPI = async ({ name, email, password }) => {
  const response = await axiosInstance.post('/auth/signup', { name, email, password });
  return response.data;
};

/**
 * Authenticates an existing user with email and password.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<object>} API response containing user profile and JWT.
 */
export const loginAPI = async ({ email, password }) => {
  const response = await axiosInstance.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Invalidates all active sessions for the current user by bumping tokenVersion on the server.
 * @returns {Promise<object>}
 */
export const logoutAPI = async () => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

/**
 * Requests a 6-digit password reset OTP to be sent via HTTPS email API.
 * @param {{ email: string }} payload
 * @returns {Promise<object>}
 */
export const forgotPasswordAPI = async ({ email }) => {
  const response = await axiosInstance.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * Verifies the 6-digit OTP and updates the user's password.
 * @param {{ email: string, otp: string, newPassword: string }} payload
 * @returns {Promise<object>}
 */
export const resetPasswordAPI = async ({ email, otp, newPassword }) => {
  const response = await axiosInstance.post('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return response.data;
};
