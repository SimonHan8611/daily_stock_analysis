import apiClient from './index';

export type ExtractItem = {
  code?: string | null;
  name?: string | null;
  confidence: string;
};

export type ExtractFromImageResponse = {
  codes: string[];
  items?: ExtractItem[];
  rawText?: string;
};

export type StockHistoryPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;
  amount?: number | null;
  changePercent?: number | null;
};

export type StockHistoryResponse = {
  stockCode: string;
  stockName?: string | null;
  period: string;
  data: StockHistoryPoint[];
};

export const stocksApi = {
  async extractFromImage(file: File): Promise<ExtractFromImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: { [key: string]: string | undefined } = { 'Content-Type': undefined };
    const response = await apiClient.post(
      '/api/v1/stocks/extract-from-image',
      formData,
      {
        headers,
        timeout: 60000, // Vision API can be slow; 60s
      },
    );

    const data = response.data as { codes?: string[]; items?: ExtractItem[]; raw_text?: string };
    return {
      codes: data.codes ?? [],
      items: data.items,
      rawText: data.raw_text,
    };
  },

  async parseImport(file?: File, text?: string): Promise<ExtractFromImageResponse> {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const headers: { [key: string]: string | undefined } = { 'Content-Type': undefined };
      const response = await apiClient.post('/api/v1/stocks/parse-import', formData, { headers });
      const data = response.data as { codes?: string[]; items?: ExtractItem[] };
      return { codes: data.codes ?? [], items: data.items };
    }
    if (text) {
      const response = await apiClient.post('/api/v1/stocks/parse-import', { text });
      const data = response.data as { codes?: string[]; items?: ExtractItem[] };
      return { codes: data.codes ?? [], items: data.items };
    }
    throw new Error('请提供文件或粘贴文本');
  },

  async getHistory(
    stockCode: string,
    params: { period?: 'daily'; days?: number } = {},
  ): Promise<StockHistoryResponse> {
    const response = await apiClient.get<Record<string, unknown>>(
      `/api/v1/stocks/${encodeURIComponent(stockCode)}/history`,
      {
        params: {
          period: params.period ?? 'daily',
          days: params.days ?? 30,
        },
      },
    );
    const payload = response.data;
    const rows = Array.isArray(payload.data) ? payload.data : [];

    return {
      stockCode: String(payload.stock_code ?? stockCode),
      stockName:
        payload.stock_name === undefined || payload.stock_name === null
          ? null
          : String(payload.stock_name),
      period: String(payload.period ?? params.period ?? 'daily'),
      data: rows.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          date: String(row.date ?? ''),
          open: Number(row.open ?? 0),
          high: Number(row.high ?? 0),
          low: Number(row.low ?? 0),
          close: Number(row.close ?? 0),
          volume: row.volume === undefined || row.volume === null ? null : Number(row.volume),
          amount: row.amount === undefined || row.amount === null ? null : Number(row.amount),
          changePercent:
            row.change_percent === undefined || row.change_percent === null
              ? null
              : Number(row.change_percent),
        };
      }),
    };
  },
};
