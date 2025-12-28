
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stock, PortfolioItem, UserState, KLineType } from './types';
import { INITIAL_STOCKS, INITIAL_BALANCE } from './constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { getAIAnalysis } from './services/gemini';

const App: React.FC = () => {
  // Global State
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [user, setUser] = useState<UserState>(() => {
    const saved = localStorage.getItem('star_trade_user');
    return saved ? JSON.parse(saved) : { balance: INITIAL_BALANCE, portfolio: [] };
  });
  const [selectedStockId, setSelectedStockId] = useState<string>(INITIAL_STOCKS[0].id);
  const [kType, setKType] = useState<KLineType>(KLineType.Daily);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState<string>('1'); // lots
  const [aiTip, setAiTip] = useState<string>('正在分析市场...');

  // Save user state
  useEffect(() => {
    localStorage.setItem('star_trade_user', JSON.stringify(user));
  }, [user]);

  // Derived State
  const selectedStock = useMemo(() => 
    stocks.find(s => s.id === selectedStockId) || stocks[0], 
    [stocks, selectedStockId]
  );

  const filteredStocks = useMemo(() => 
    selectedSector ? stocks.filter(s => s.sector === selectedSector) : stocks,
    [stocks, selectedSector]
  );

  const sectors = useMemo(() => 
    Array.from(new Set(stocks.map(s => s.sector))),
    [stocks]
  );

  // Price Simulation Engine
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks => prevStocks.map(stock => {
        const volatility = 0.002; // Small frequent changes
        const change = 1 + (Math.random() - 0.5) * volatility;
        const newPrice = stock.price * change;
        const newHigh = Math.max(stock.high, newPrice);
        const newLow = Math.min(stock.low, newPrice);
        const changePercent = ((newPrice - stock.lastClose) / stock.lastClose) * 100;
        
        return {
          ...stock,
          price: newPrice,
          high: newHigh,
          low: newLow,
          changePercent
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // AI Tip update
  useEffect(() => {
    const updateAI = async () => {
      const tip = await getAIAnalysis(selectedStock);
      setAiTip(tip);
    };
    updateAI();
  }, [selectedStockId]);

  // Trade Handlers
  const handleBuy = () => {
    const qtyInLots = parseInt(tradeQuantity);
    if (isNaN(qtyInLots) || qtyInLots <= 0) return;
    const shares = qtyInLots * 100;
    const totalCost = shares * selectedStock.price;

    if (user.balance < totalCost) {
      alert("余额不足！");
      return;
    }

    setUser(prev => {
      const existing = prev.portfolio.find(p => p.stockId === selectedStockId);
      let newPortfolio;
      if (existing) {
        newPortfolio = prev.portfolio.map(p => 
          p.stockId === selectedStockId 
          ? { 
              ...p, 
              quantity: p.quantity + shares, 
              averageCost: (p.averageCost * p.quantity + totalCost) / (p.quantity + shares) 
            } 
          : p
        );
      } else {
        newPortfolio = [...prev.portfolio, {
          stockId: selectedStockId,
          name: selectedStock.name,
          code: selectedStock.code,
          quantity: shares,
          averageCost: selectedStock.price
        }];
      }
      return { balance: prev.balance - totalCost, portfolio: newPortfolio };
    });
  };

  const handleSell = () => {
    const qtyInLots = parseInt(tradeQuantity);
    if (isNaN(qtyInLots) || qtyInLots <= 0) return;
    const shares = qtyInLots * 100;
    const existing = user.portfolio.find(p => p.stockId === selectedStockId);

    if (!existing || existing.quantity < shares) {
      alert("持有份额不足！(不可做空)");
      return;
    }

    const totalGain = shares * selectedStock.price;

    setUser(prev => {
      const newPortfolio = prev.portfolio
        .map(p => p.stockId === selectedStockId ? { ...p, quantity: p.quantity - shares } : p)
        .filter(p => p.quantity > 0);
      return { balance: prev.balance + totalGain, portfolio: newPortfolio };
    });
  };

  return (
    <div className="app-container">
      <header>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
          星辰模拟炒股 <span style={{fontSize: '12px', fontWeight: 'normal', color: 'var(--text-muted)'}}>V1.0</span>
        </div>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <div>账户余额: <span style={{ color: '#ff9f0a' }}>¥{user.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div>持仓市值: <span style={{ color: '#58a6ff' }}>¥{user.portfolio.reduce((acc, p) => {
            const s = stocks.find(st => st.id === p.stockId);
            return acc + (s ? s.price * p.quantity : 0);
          }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <button className="btn" style={{ width: 'auto', padding: '5px 15px', background: '#30363d' }} onClick={() => {
             if(confirm("确定要重置账户吗？")) {
                setUser({ balance: INITIAL_BALANCE, portfolio: [] });
                localStorage.removeItem('star_trade_user');
             }
          }}>重置</button>
        </div>
      </header>

      <aside className="sidebar-left scroll-custom">
        <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
          <select 
            style={{ width: '100%', padding: '5px', background: 'var(--primary-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
            onChange={(e) => setSelectedSector(e.target.value === 'all' ? null : e.target.value)}
          >
            <option value="all">所有板块</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {filteredStocks.map(s => (
          <div 
            key={s.id} 
            className={`stock-item ${selectedStockId === s.id ? 'active' : ''}`}
            onClick={() => setSelectedStockId(s.id)}
          >
            <div className="stock-info">
              <div>
                <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.code}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={s.changePercent >= 0 ? 'price-up' : 'price-down'}>
                  {s.price.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px' }} className={s.changePercent >= 0 ? 'price-up' : 'price-down'}>
                  {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </aside>

      <main className="main-content scroll-custom">
        <div className="card" style={{ paddingBottom: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedStock.name}</span>
              <span style={{ marginLeft: '10px', color: 'var(--text-muted)' }}>{selectedStock.code}</span>
              <span style={{ marginLeft: '15px', padding: '2px 6px', background: 'rgba(88, 166, 255, 0.1)', color: 'var(--accent-color)', borderRadius: '4px', fontSize: '12px' }}>{selectedStock.sector}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px' }} className={selectedStock.changePercent >= 0 ? 'price-up' : 'price-down'}>
                {selectedStock.price.toFixed(2)}
              </div>
            </div>
          </div>
          
          <div className="tabs">
            {Object.values(KLineType).map(type => (
              <div 
                key={type} 
                className={`tab ${kType === type ? 'active' : ''}`}
                onClick={() => setKType(type)}
              >
                {type}
              </div>
            ))}
          </div>

          <div style={{ height: '400px', width: '100%', marginBottom: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={selectedStock.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} orientation="right" tick={{ fill: '#8b949e', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}
                  labelStyle={{ color: '#8b949e' }}
                  itemStyle={{ color: '#c9d1d9' }}
                />
                {/* Simplified K-line visualization using Bar + Area */}
                <Area type="monotone" dataKey="close" stroke="#58a6ff" fillOpacity={0.1} fill="#58a6ff" />
                <Bar dataKey="volume" fill="#30363d" yAxisId={1} opacity={0.3} />
                <YAxis yAxisId={1} hide />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-color)' }}>★</span> AI 投顾点评
          </div>
          <div style={{ color: 'var(--text-main)', fontStyle: 'italic', background: 'rgba(88, 166, 255, 0.05)', padding: '15px', borderRadius: '4px', borderLeft: '3px solid var(--accent-color)' }}>
            "{aiTip}"
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 'bold', marginBottom: '15px' }}>我的持仓</div>
          {user.portfolio.length === 0 ? (
            // FIX: Added quotes around CSS variable 'var(--text-muted)' to resolve syntax error on line 247.
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>暂无持仓，快去寻找机会吧！</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  <th style={{ padding: '8px' }}>股票</th>
                  <th style={{ padding: '8px' }}>股数</th>
                  <th style={{ padding: '8px' }}>成本</th>
                  <th style={{ padding: '8px' }}>现价</th>
                  <th style={{ padding: '8px' }}>盈亏</th>
                </tr>
              </thead>
              <tbody>
                {user.portfolio.map(p => {
                  const s = stocks.find(st => st.id === p.stockId);
                  const currentPrice = s?.price || 0;
                  const profit = (currentPrice - p.averageCost) * p.quantity;
                  const profitPct = ((currentPrice - p.averageCost) / p.averageCost) * 100;
                  return (
                    <tr key={p.stockId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <td style={{ padding: '8px' }}>{p.name}<br/><span style={{fontSize:'10px', color:'var(--text-muted)'}}>{p.code}</span></td>
                      <td style={{ padding: '8px' }}>{p.quantity}</td>
                      <td style={{ padding: '8px' }}>{p.averageCost.toFixed(2)}</td>
                      <td style={{ padding: '8px' }}>{currentPrice.toFixed(2)}</td>
                      <td style={{ padding: '8px' }} className={profit >= 0 ? 'price-up' : 'price-down'}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)}<br/>
                        <span style={{fontSize:'12px'}}>{profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <aside className="sidebar-right scroll-custom">
        <div className="trading-panel">
          <div style={{ fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            交易控制
          </div>
          
          <div className="input-group">
            <label>股票名称</label>
            <input type="text" value={`${selectedStock.name} (${selectedStock.code})`} disabled />
          </div>

          <div className="input-group">
            <label>委托价格</label>
            <input type="text" value={selectedStock.price.toFixed(2)} disabled />
          </div>

          <div className="input-group">
            <label>买入数量 (手, 1手=100股)</label>
            <input 
              type="number" 
              value={tradeQuantity} 
              onChange={(e) => setTradeQuantity(e.target.value)} 
              min="1"
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            预计成交额: <span style={{ color: 'var(--text-main)' }}>¥{(parseInt(tradeQuantity) * 100 * selectedStock.price).toLocaleString()}</span>
          </div>

          <button className="btn btn-buy" onClick={handleBuy}>买入 (做多)</button>
          <button className="btn btn-sell" onClick={handleSell}>卖出 (平仓)</button>
          
          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            * 提示：本模拟器24小时交易，不设涨跌停，纯属运气与策略模拟。不支持做空，风险自担。
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>市场快报 (实时)</div>
          <div className="scroll-custom" style={{ height: '300px', overflowY: 'auto' }}>
            {stocks.slice(0, 10).map((s, idx) => (
              <div key={idx} style={{ padding: '8px 0', borderBottom: '1px dotted var(--border-color)', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{new Date().toLocaleTimeString()}</span>
                <span>{s.name} {s.changePercent > 0 ? '异动拉升' : '快速下挫'}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default App;
