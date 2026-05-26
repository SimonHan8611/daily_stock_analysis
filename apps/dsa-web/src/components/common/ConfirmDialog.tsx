import type React from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation dialog component.
 * Style is consistent with ChatPage.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      opened={isOpen}
      onClose={onCancel}
      title={title}
      centered
      radius="xl"
      closeButtonProps={{ 'aria-label': '关闭确认弹窗' }}
    >
      <Text size="sm" c="dimmed" mb="lg">
        {message}
      </Text>
      <Group justify="flex-end" gap="sm">
        <Button type="button" variant="default" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button type="button" color={isDanger ? 'red' : 'brand'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </Group>
    </Modal>
  );
};
