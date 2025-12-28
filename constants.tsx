
import { Stock, OHLC } from './types';

const SECTORS = ['AI芯片', '新能源', '军工大飞机', '低空经济', '生物医药', '大金融', '半导体', '消费电子', '传统白酒', '数字经济'];

const generateStockHistory = (basePrice: number, count: number): OHLC[] => {
  const history: OHLC[] = [];
  let lastClose = basePrice;
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 86400000).toISOString().split('T')[0];
    const volatility = 0.05;
    const open = lastClose * (1 + (Math.random() - 0.5) * volatility);
    const close = open * (1 + (Math.random() - 0.5) * volatility);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    
    history.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000)
    });
    lastClose = close;
  }
  return history;
};

export const INITIAL_STOCKS: Stock[] = Array.from({ length: 200 }).map((_, i) => {
  const basePrice = Math.random() * 200 + 5;
  const sector = SECTORS[i % SECTORS.length];
  const history = generateStockHistory(basePrice, 100);
  const currentPrice = history[history.length - 1].close;

  return {
    id: `stock-${i}`,
    name: `${sector.slice(0, 2)}${['利', '隆', '泰', '盛', '华', '信', '达', '通'][i % 8]}${['科技', '动力', '股份', '集团', '国际', '重工'][i % 6]}`,
    code: (600000 + i).toString().padStart(6, '0'),
    price: currentPrice,
    openPrice: currentPrice,
    high: currentPrice,
    low: currentPrice,
    lastClose: currentPrice * 0.98,
    changePercent: 2,
    sector,
    history
  };
});

export const INITIAL_BALANCE = 100000;
