import api from './config';

export interface TestNotificationResponse {
  success: boolean;
  message: string;
  details?: {
    totalTokens: number;
    successCount: number;
    failureCount: number;
    errorMessages?: string[];
  };
}

/**
 * Send a test push notification to the current authenticated user's registered devices
 */
export const sendSelfTestNotification = async (): Promise<TestNotificationResponse> => {
  const response = await api.post<TestNotificationResponse>('/fcm-tokens/test');
  return response.data;
};
