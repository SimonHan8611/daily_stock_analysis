/**
 * SuggestionsList Component
 *
 * Stock search suggestion list
 * Displays matched stock options
 */

import type { CSSProperties } from 'react';
import { Group, Paper, ScrollArea, Stack, Text } from '@mantine/core';
import type { StockSuggestion } from '../../types/stockIndex';
import { Badge } from '../common';
import { cn } from '../../utils/cn';

export interface SuggestionsListProps {
  /** Suggestion list */
  suggestions: StockSuggestion[];
  /** Highlighted index */
  highlightedIndex: number;
  /** Selection callback */
  onSelect: (suggestion: StockSuggestion) => void;
  /** Mouse hover callback */
  onMouseEnter: (index: number) => void;
  /** Custom style (for Portal fixed positioning) */
  style?: CSSProperties;
}

export function SuggestionsList({
  suggestions,
  highlightedIndex,
  onSelect,
  onMouseEnter,
  style,
}: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Paper
      id="suggestions-list"
      className="z-[100] max-h-60 overflow-hidden rounded-b-xl rounded-t-none border border-subtle bg-card/95 shadow-2xl backdrop-blur-md"
      style={{
        ...style,
      }}
      role="listbox"
      radius="xl"
      shadow="none"
    >
      <ScrollArea.Autosize mah={240}>
        <Stack gap={0}>
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.canonicalCode}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                'w-full cursor-pointer border-0 bg-transparent px-4 py-3 text-left transition-colors',
                'hover:bg-[var(--autocomplete-hover-bg)]/20',
                index === highlightedIndex && 'bg-[var(--autocomplete-hover-bg)]/20',
              )}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => onMouseEnter(index)}
            >
              <Group justify="space-between" align="center" gap="md" wrap="nowrap">
                <Group gap="sm" align="center" wrap="nowrap">
                  <MarketBadge market={suggestion.market} />
                  <div className="min-w-0">
                    <Text className="truncate text-sm font-medium text-foreground">
                      {suggestion.nameZh}
                    </Text>
                    <Text className="truncate text-xs text-secondary-text">
                      {suggestion.displayCode}
                    </Text>
                  </div>
                </Group>
                <MatchTypeBadge matchType={suggestion.matchType} />
              </Group>
            </button>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  );
}

// Helper component: Market badge
const MARKET_BADGE_CONFIG = {
  CN: { label: 'A股', className: 'border-danger/25 bg-danger/10 text-danger' },
  HK: { label: '港股', className: 'border-success/25 bg-success/10 text-success' },
  US: { label: '美股', className: 'border-cyan/25 bg-cyan/10 text-cyan' },
  INDEX: { label: '指数', className: 'border-purple/25 bg-purple/10 text-purple' },
  ETF: { label: 'ETF', className: 'border-warning/25 bg-warning/10 text-warning' },
  BSE: { label: '北交所', className: 'border-orange-500/25 bg-orange-500/10 text-orange-500' },
} as const;

function MarketBadge({ market }: { market: string }) {
  const config = MARKET_BADGE_CONFIG[market as keyof typeof MARKET_BADGE_CONFIG];

  if (!config) {
    throw new Error(`Unsupported market in stock suggestion: ${market}`);
  }

  return (
    <Badge variant="default" size="sm" className={cn("min-w-[3rem] justify-center shadow-none", config.className)}>
      {config.label}
    </Badge>
  );
}

// Helper component: Match type badge
function MatchTypeBadge({ matchType }: { matchType: string }) {
  const configMap = {
    exact: { label: '精确', className: 'border-cyan/25 bg-cyan/10 text-cyan' },
    prefix: { label: '前缀', className: 'border-purple/25 bg-purple/10 text-purple' },
    contains: { label: '包含', className: 'border-warning/25 bg-warning/10 text-warning' },
    fuzzy: { label: '模糊', className: 'border-border/55 bg-elevated/75 text-muted-text' },
  };

  const config = configMap[matchType as keyof typeof configMap] || configMap.fuzzy;

  return (
    <Badge variant="default" size="sm" className={cn("shrink-0 shadow-none", config.className)}>
      {config.label}
    </Badge>
  );
}

export default SuggestionsList;
