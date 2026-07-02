export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
  const re = /^[6-9]\d{9}$/;
  return re.test(String(phone));
};

export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  return { valid: true, message: '' };
};

export const validateOTP = (otp) => {
  const re = /^\d{6}$/;
  return re.test(String(otp));
};

export const passwordsMatch = (p1, p2) => {
  return p1 === p2;
};

export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};
