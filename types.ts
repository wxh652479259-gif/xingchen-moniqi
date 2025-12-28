
export interface Stock {
  id: string;
  name: string;
  code: string;
  price: number;
  openPrice: number;
  high: number;
  low: number;
  lastClose: number;
  changePercent: number;
  sector: string;
  history: OHLC[];
}

export interface OHLC {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioItem {
  stockId: string;
  name: string;
  code: string;
  quantity: number; // in shares (e.g., 200 = 2 lots)
  averageCost: number;
}

export enum KLineType {
  Intraday = '分时',
  FiveDay = '五日',
  Daily = '日K',
  Weekly = '周K',
  Monthly = '月K',
  Quarterly = '季K',
  Yearly = '年K'
}

export interface UserState {
  balance: number;
  portfolio: PortfolioItem[];
}
