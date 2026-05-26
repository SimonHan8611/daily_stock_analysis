import type { HistoryItem } from '../../types/analysis';

export const getOperationBadgeLabel = (advice?: string) => {
  const normalized = advice?.trim();
  if (!normalized) {
    return '情绪';
  }
  if (normalized.includes('减仓')) {
    return '减仓';
  }
  if (normalized.includes('卖')) {
    return '卖出';
  }
  if (normalized.includes('观望') || normalized.includes('等待')) {
    return '观望';
  }
  if (normalized.includes('买') || normalized.includes('布局')) {
    return '买入';
  }
  return normalized.split(/[，。；、\s]/)[0] || '建议';
};

export const getHistoryResultText = (item: HistoryItem) => {
  const label = getOperationBadgeLabel(item.operationAdvice);
  return item.sentimentScore !== undefined ? `${label} ${item.sentimentScore}` : label;
};
