// src/services/authService.js
import axiosInstance from './axiosInstance';

export const signupAPI = async ({ name, email, password }) => {
  const response = await axiosInstance.post('/auth/signup', {
    name,
    email,
    password,
  });
  return response.data;
};

export const loginAPI = async ({ email, password }) => {
  const response = await axiosInstance.post('/auth/login', {
    email,
    password,
  });
  return response.data;
};

// Logout — invalidates token via tokenVersion++
export const logoutAPI = async () => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

// Forgot Password — sends OTP to email
export const forgotPasswordAPI = async ({ email }) => {
  const response = await axiosInstance.post('/auth/forgot-password', {
    email,
  });
  return response.data;
};

// Reset Password — verifies OTP and updates password
export const resetPasswordAPI = async ({ email, otp, newPassword }) => {
  const response = await axiosInstance.post('/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return response.data;
};