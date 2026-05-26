import type React from 'react';
import { Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ReportLanguage, ReportStrategy as ReportStrategyType } from '../../types/analysis';
import { Card } from '../common';
import { DashboardPanelHeader } from '../dashboard';
import { getReportText, normalizeReportLanguage } from '../../utils/reportLanguage';

interface ReportStrategyProps {
  strategy?: ReportStrategyType;
  language?: ReportLanguage;
}

interface StrategyItemProps {
  label: string;
  value?: string;
  tone: string;
}

const StrategyItem: React.FC<StrategyItemProps> = ({
  label,
  value,
  tone,
}) => (
  <Paper
    className="home-subpanel home-strategy-card p-3"
    style={{ ['--home-strategy-tone' as string]: `var(${tone})` }}
    radius="lg"
    shadow="none"
  >
    <Group justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={2}>
        <Text className="home-strategy-label mb-0.5 text-xs">{label}</Text>
        <Text className="home-strategy-value text-lg font-bold font-mono" style={!value ? { color: 'var(--text-muted-text)' } : undefined}>
        {value || '—'}
        </Text>
      </Stack>
    </Group>
    <div
      className="absolute bottom-0 left-0 right-0 h-0.5"
      style={{ background: `linear-gradient(90deg, transparent, var(${tone}), transparent)` }}
    />
  </Paper>
);

/**
 * 策略点位区组件 - 终端风格
 */
export const ReportStrategy: React.FC<ReportStrategyProps> = ({ strategy, language = 'zh' }) => {
  if (!strategy) {
    return null;
  }

  const reportLanguage = normalizeReportLanguage(language);
  const text = getReportText(reportLanguage);

  const strategyItems = [
    {
      label: text.idealBuy,
      value: strategy.idealBuy,
      tone: '--home-strategy-buy',
    },
    {
      label: text.secondaryBuy,
      value: strategy.secondaryBuy,
      tone: '--home-strategy-secondary',
    },
    {
      label: text.stopLoss,
      value: strategy.stopLoss,
      tone: '--home-strategy-stop',
    },
    {
      label: text.takeProfit,
      value: strategy.takeProfit,
      tone: '--home-strategy-take',
    },
  ];

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <DashboardPanelHeader
        eyebrow={text.strategyPoints}
        title={text.sniperLevels}
        className="mb-3"
      />
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {strategyItems.map((item) => (
          <StrategyItem key={item.label} {...item} />
        ))}
      </SimpleGrid>
    </Card>
  );
};
