import api, { API_BASE_URL } from '../config/api.config';

const API_URL = `${API_BASE_URL}/api/models`;

export const uploadModelScreenshot = async (modelId, base64Image) => {
  try {
    const response = await api.post(
      `${API_URL}/${modelId}/screenshot`,
      { base64Image },
      {
        timeout: 30000
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading model screenshot:', error);
    throw error;
  }
};
