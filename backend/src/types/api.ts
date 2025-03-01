import { Response } from "express";

// API Response Type
export interface APIResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Standard Error Response Type
export interface APIErrorResponse {
  success: boolean;
  error: string;
}
