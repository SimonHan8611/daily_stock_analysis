import type React from 'react';
import {
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  Bot,
  BrainCircuit,
  CalendarClock,
  Database,
  HelpCircle,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { getCategoryDescriptionZh, getCategoryTitleZh } from '../../utils/systemConfigI18n';
import type { SystemConfigCategory, SystemConfigCategorySchema, SystemConfigItem } from '../../types/systemConfig';
import { cn } from '../../utils/cn';

interface SettingsCategoryNavProps {
  categories: SystemConfigCategorySchema[];
  itemsByCategory: Record<string, SystemConfigItem[]>;
  activeCategory: string;
  onSelect: (category: string) => void;
}

const categoryIconMap: Record<SystemConfigCategory, React.ComponentType<{ size?: number }>> = {
  base: ShieldCheck,
  ai_model: BrainCircuit,
  data_source: Database,
  notification: Megaphone,
  system: SlidersHorizontal,
  agent: Bot,
  backtest: CalendarClock,
  uncategorized: HelpCircle,
};

export const SettingsCategoryNav: React.FC<SettingsCategoryNavProps> = ({
  categories,
  itemsByCategory,
  activeCategory,
  onSelect,
}) => {
  return (
    <Paper
      radius="xl"
      className="h-full rounded-[1.5rem] border settings-border bg-card/94 p-4 shadow-soft-card-strong backdrop-blur-sm"
      shadow="none"
    >
      <Stack gap="sm" className="h-full">
        <Group justify="space-between" align="flex-end" gap="xs">
          <div>
            <Text className="text-[11px] font-semibold text-cyan">配置分类</Text>
            <Text className="mt-0.5 text-[11px] leading-5 text-muted-text">按模块快速定位配置项</Text>
          </div>
          <Badge
            size="sm"
            radius="xl"
            variant="light"
            color="cyan"
            className="font-mono"
          >
            {categories.length}
          </Badge>
        </Group>

        <ScrollArea.Autosize mah="calc(100vh - 18rem)" type="hover" offsetScrollbars>
          <Stack gap={6} pr={4}>
            {categories.map((category) => {
              const isActive = category.category === activeCategory;
              const count = (itemsByCategory[category.category] || []).length;
              const title = getCategoryTitleZh(category.category, category.title);
              const description = getCategoryDescriptionZh(category.category, category.description);
              const Icon = categoryIconMap[category.category] ?? HelpCircle;

              return (
                <UnstyledButton
                  key={category.category}
                  type="button"
                  className={cn(
                    'group relative w-full rounded-2xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-150',
                    isActive
                      ? 'border-cyan/35 bg-cyan/10 shadow-[0_10px_22px_hsl(198_86%_44%_/_0.10)]'
                      : 'border-[var(--settings-border)] bg-white/55 hover:border-cyan/25 hover:bg-cyan/5 dark:bg-white/[0.03]',
                  )}
                  onClick={() => onSelect(category.category)}
                >
                  {isActive ? (
                    <span className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-cyan" />
                  ) : null}

                  <Group align="center" justify="space-between" gap="sm" wrap="nowrap">
                    <Group align="center" gap="sm" wrap="nowrap" className="min-w-0">
                      <ThemeIcon
                        size={34}
                        radius="xl"
                        color="cyan"
                        variant={isActive ? 'filled' : 'light'}
                        className={cn(!isActive && 'bg-cyan/10 text-cyan')}
                      >
                        <Icon size={16} />
                      </ThemeIcon>

                      <div className="min-w-0">
                        <Text
                          className={cn(
                            'truncate text-sm font-semibold tracking-tight',
                            isActive ? 'text-foreground' : 'text-secondary-text',
                          )}
                        >
                          {title}
                        </Text>
                        {description ? (
                          <Text className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-muted-text">
                            {description}
                          </Text>
                        ) : null}
                      </div>
                    </Group>

                    <Badge
                      size="sm"
                      radius="xl"
                      variant={isActive ? 'filled' : 'light'}
                      color="cyan"
                      className="min-w-8 shrink-0 justify-center px-2 font-mono"
                    >
                      {count}
                    </Badge>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Paper>
  );
};
