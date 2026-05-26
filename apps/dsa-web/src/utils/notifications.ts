import { notifications } from '@mantine/notifications';
import type { ParsedApiError } from '../api/error';

type NotificationOptions = {
  title: string;
  message: string;
  autoClose?: number;
};

export const showSuccessNotification = ({
  title,
  message,
  autoClose = 3200,
}: NotificationOptions) => {
  notifications.show({
    title,
    message,
    color: 'teal',
    autoClose,
  });
};

export const showErrorNotification = ({
  title,
  message,
  autoClose = 4200,
}: NotificationOptions) => {
  notifications.show({
    title,
    message,
    color: 'red',
    autoClose,
  });
};

export const showApiErrorNotification = (
  error: ParsedApiError,
  options?: { title?: string; autoClose?: number },
) => {
  notifications.show({
    title: options?.title ?? error.title,
    message: error.message,
    color: 'red',
    autoClose: options?.autoClose ?? 4200,
  });
};
