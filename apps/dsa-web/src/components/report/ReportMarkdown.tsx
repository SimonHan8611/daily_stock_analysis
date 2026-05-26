import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Group, Loader, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { AlertTriangle, Check, Code2, FileText } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { historyApi } from '../../api/history';
import { Button } from '../common/Button';
import { Drawer } from '../common/Drawer';
import { Tooltip } from '../common/Tooltip';
import { getReportText, normalizeReportLanguage } from '../../utils/reportLanguage';
import type { ReportLanguage } from '../../types/analysis';
import { markdownToPlainText } from '../../utils/markdown';

interface ReportMarkdownProps {
  recordId: number;
  stockName: string;
  stockCode: string;
  onClose: () => void;
  reportLanguage?: ReportLanguage;
}

/**
 * Markdown report drawer component
 * Uses common Drawer component to display full Markdown format analysis report
 */
export const ReportMarkdown: React.FC<ReportMarkdownProps> = ({
  recordId,
  stockName,
  stockCode,
  onClose,
  reportLanguage = 'zh',
}) => {
  const text = getReportText(normalizeReportLanguage(reportLanguage));
  const loadReportFailedText = text.loadReportFailed;
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Delay actual close to allow animation to complete
    setTimeout(onClose, 300);
  }, [onClose]);

  // Handle copy markdown source
  const handleCopyMarkdown = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedType('markdown');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [content]);

  // Handle copy plain text
  const handleCopyPlainText = useCallback(async () => {
    if (!content) return;
    try {
      const plainText = markdownToPlainText(content);
      await navigator.clipboard.writeText(plainText);
      setCopiedType('text');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [content]);

  useEffect(() => {
    let isMounted = true;

    const fetchMarkdown = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const markdownContent = await historyApi.getMarkdown(recordId);
        if (isMounted) {
          setContent(markdownContent);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : loadReportFailedText);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMarkdown();

    return () => {
      isMounted = false;
    };
  }, [recordId, loadReportFailedText]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      width="max-w-3xl"
      zIndex={100}
      backdropClassName="bg-background/56 backdrop-blur-[2px]"
    >
      {/* Custom Header */}
      <Paper radius="xl" shadow="none" className="glass-panel mb-4 px-4 py-3">
        {/* Left: Icon + Title */}
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Group align="center" gap="md" wrap="nowrap">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--home-action-report-bg)] text-[var(--home-action-report-text)]">
              <FileText className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </div>
            <Stack gap={2}>
              <Title order={2} className="text-base font-semibold text-foreground">{stockName || stockCode}</Title>
              <Text className="text-xs text-muted-text">{text.fullReport}</Text>
            </Stack>
          </Group>

          {/* Right: Toolbar */}
          <Group gap="xs" wrap="nowrap">
            {/* Copy Markdown button */}
            <Tooltip content={text.copyMarkdownSource}>
              <span className="inline-flex">
                <Button
                  type="button"
                  onClick={handleCopyMarkdown}
                  disabled={isLoading || !content || copiedType !== null}
                  variant="home-action-report"
                  size="sm"
                  className="h-10 w-10 min-w-10 px-0 text-secondary-text"
                  aria-label={text.copyMarkdownSource}
                >
                  {copiedType === 'markdown' ? (
                    <Check className="h-6 w-6 text-success" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Code2 className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                  )}
                </Button>
              </span>
            </Tooltip>

            {/* Copy plain text button */}
            <Tooltip content={text.copyPlainText}>
              <span className="inline-flex">
                <Button
                  type="button"
                  onClick={handleCopyPlainText}
                  disabled={isLoading || !content || copiedType !== null}
                  variant="home-action-report"
                  size="sm"
                  className="h-10 w-10 min-w-10 px-0 text-secondary-text"
                  aria-label={text.copyPlainText}
                >
                  {copiedType === 'text' ? (
                    <Check className="h-6 w-6 text-success" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <FileText className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                  )}
                </Button>
              </span>
            </Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Content */}
      {isLoading ? (
        <Paper radius="xl" shadow="none" className="flex h-64 flex-col items-center justify-center border border-subtle bg-card/85">
          <Loader size="lg" color="cyan" />
          <Text className="mt-4 text-sm text-secondary-text">{text.loadingReport}</Text>
        </Paper>
      ) : error ? (
        <Paper radius="xl" shadow="none" className="flex h-64 flex-col items-center justify-center border border-danger/20 bg-danger/5 px-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
            <AlertTriangle
              className="w-6 h-6 text-danger"
              strokeWidth={2}
              aria-hidden="true"
            />
          </div>
          <Text className="text-sm text-danger">{error}</Text>
          <Button
            type="button"
            onClick={handleClose}
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            {text.dismiss}
          </Button>
        </Paper>
      ) : (
        <Paper radius="xl" shadow="none" className="overflow-hidden border border-subtle bg-card/92">
          <ScrollArea.Autosize mah="70vh">
            <div
              className="home-markdown-prose prose prose-invert prose-sm max-w-none whitespace-pre-line break-words p-5
                prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-headings:text-foreground
                prose-h1:text-xl
                prose-h2:text-lg
                prose-h3:text-base
                prose-p:mb-3 prose-p:leading-relaxed prose-p:last:mb-0
                prose-strong:font-semibold prose-strong:text-foreground
                prose-ul:my-2 prose-ol:my-2 prose-li:my-1
                prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none
                prose-pre:border
                prose-table:border-collapse
                prose-hr:my-4
                prose-a:no-underline hover:prose-a:underline
                prose-blockquote:text-secondary-text
              "
            >
              <Markdown remarkPlugins={[remarkGfm]}>
                {content}
              </Markdown>
            </div>
          </ScrollArea.Autosize>
        </Paper>
      )}

      {/* Footer */}
      <Group justify="flex-end" className="home-divider mt-6 border-t pt-4">
        <Button
          type="button"
          onClick={handleClose}
          variant="secondary"
          size="sm"
        >
          {text.dismiss}
        </Button>
      </Group>
    </Drawer>
  );
};
