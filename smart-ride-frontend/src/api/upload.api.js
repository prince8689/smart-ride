import api from './axios';

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/upload/single', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
