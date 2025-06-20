import { toast } from 'react-toastify';

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showInfo = (message: string) => {
  toast.info(message);
};

export const showWarning = (message: string) => {
  toast.warning(message);
};

export const toastService = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
};

export default toastService;
