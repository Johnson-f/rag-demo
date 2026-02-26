'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useCreateTrade } from '@/lib/hooks/trade';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CreateTradeInput, TradeType } from '@/lib/types/trades';

export function CreateTradeTab() {
  const createTrade = useCreateTrade();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateTradeInput>({
    stock_symbol: '',
    stock_name: '',
    entry_price: 0,
    exit_price: 0,
    trade_type: 'long',
    stop_loss: undefined,
    initial_target: undefined,
    notes: '',
  });
  const [csvError, setCsvError] = useState<string>('');
  const [parsedTrades, setParsedTrades] = useState<CreateTradeInput[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTrade.mutateAsync(formData);
      setFormData({
        stock_symbol: '',
        stock_name: '',
        entry_price: 0,
        exit_price: 0,
        trade_type: 'long',
        stop_loss: undefined,
        initial_target: undefined,
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create trade:', error);
    }
  };

  const detectColumnMapping = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    const fieldPatterns: Record<string, RegExp[]> = {
      stock_symbol: [/ticker.*symbol/i, /symbol/i, /ticker/i, /stock.*symbol/i, /code/i],
      stock_name: [/name/i, /company/i, /stock.*name/i, /description/i],
      entry_price: [/entry.*price/i, /entry/i, /buy.*price/i, /purchase.*price/i, /open.*price/i],
      exit_price: [/exit.*price/i, /exit/i, /sell.*price/i, /close.*price/i],
      trade_type: [/type/i, /direction/i, /side/i, /position/i],
      stop_loss: [/stop.*loss/i, /sl/i],
      initial_target: [/target/i, /tp/i, /take.*profit/i, /goal/i],
      notes: [/note/i, /comment/i, /remark/i, /memo/i],
    };

    for (const header of headers) {
      const normalizedHeader = header.trim().toLowerCase();
      
      for (const [field, patterns] of Object.entries(fieldPatterns)) {
        if (patterns.some(pattern => pattern.test(normalizedHeader))) {
          if (!mapping[field]) {
            mapping[field] = header;
          }
        }
      }
    }

    return mapping;
  };

  const parseCSV = (text: string): CreateTradeInput[] => {
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      throw new Error(`CSV parsing error: ${result.errors[0].message}`);
    }

    if (result.data.length === 0) {
      throw new Error('CSV file is empty or contains no valid data');
    }

    const headers = result.meta.fields || [];
    const columnMapping = detectColumnMapping(headers);

    // Only stock_symbol, entry_price, and exit_price are truly required
    const requiredFields = ['stock_symbol', 'entry_price', 'exit_price'];
    const missingFields = requiredFields.filter(field => !columnMapping[field]);
    
    if (missingFields.length > 0) {
      throw new Error(
        `Could not detect required columns: ${missingFields.join(', ')}. ` +
        `Available columns: ${headers.join(', ')}`
      );
    }

    const trades: CreateTradeInput[] = [];

    for (let i = 0; i < result.data.length; i++) {
      const row = result.data[i];
      
      const stockSymbol = row[columnMapping.stock_symbol]?.trim();
      const stockName = columnMapping.stock_name 
        ? row[columnMapping.stock_name]?.trim() 
        : stockSymbol; // Use symbol as name if name column doesn't exist
      const entryPriceStr = row[columnMapping.entry_price]?.trim();
      const exitPriceStr = row[columnMapping.exit_price]?.trim();

      if (!stockSymbol || !entryPriceStr || !exitPriceStr) {
        throw new Error(`Row ${i + 1} is missing required data`);
      }

      const entryPrice = parseFloat(entryPriceStr.replace(/[$,]/g, ''));
      const exitPrice = parseFloat(exitPriceStr.replace(/[$,]/g, ''));
      
      if (isNaN(entryPrice)) {
        throw new Error(`Row ${i + 1}: Invalid entry price "${entryPriceStr}"`);
      }
      if (isNaN(exitPrice)) {
        throw new Error(`Row ${i + 1}: Invalid exit price "${exitPriceStr}"`);
      }

      // Determine trade type based on profit/loss or default to long
      let tradeType: TradeType = 'long';
      if (columnMapping.trade_type) {
        const typeStr = row[columnMapping.trade_type]?.trim().toLowerCase();
        if (typeStr === 'short' || typeStr === 'sell') {
          tradeType = 'short';
        } else if (typeStr === 'long' || typeStr === 'buy' || !typeStr) {
          tradeType = 'long';
        } else {
          throw new Error(`Row ${i + 1}: Invalid trade type "${typeStr}". Must be 'long' or 'short'`);
        }
      } else {
        // Auto-detect: if exit > entry, it's likely long; if entry > exit, could be short
        tradeType = exitPrice >= entryPrice ? 'long' : 'short';
      }

      const trade: CreateTradeInput = {
        stock_symbol: stockSymbol,
        stock_name: stockName,
        entry_price: entryPrice,
        exit_price: exitPrice,
        trade_type: tradeType,
        notes: columnMapping.notes ? (row[columnMapping.notes]?.trim() || '') : '',
      };

      if (columnMapping.stop_loss) {
        const stopLossStr = row[columnMapping.stop_loss]?.trim();
        if (stopLossStr) {
          const stopLoss = parseFloat(stopLossStr.replace(/[$,]/g, ''));
          if (!isNaN(stopLoss)) {
            trade.stop_loss = stopLoss;
          }
        }
      }

      if (columnMapping.initial_target) {
        const targetStr = row[columnMapping.initial_target]?.trim();
        if (targetStr) {
          const target = parseFloat(targetStr.replace(/[$,]/g, ''));
          if (!isNaN(target)) {
            trade.initial_target = target;
          }
        }
      }

      trades.push(trade);
    }

    return trades;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setParsedTrades([]);

    try {
      const text = await file.text();
      const trades = parseCSV(text);
      setParsedTrades(trades);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'Failed to parse CSV');
    }
  };

  const handleBulkSubmit = async () => {
    if (parsedTrades.length === 0) return;

    try {
      for (const trade of parsedTrades) {
        await createTrade.mutateAsync(trade);
      }
      setParsedTrades([]);
      setCsvError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'Failed to create trades');
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Create New Trade</h2>
      
      {/* CSV Upload Section */}
      <div className="mb-8 p-4 border rounded-md bg-muted/50">
        <h3 className="text-lg font-medium mb-3">Bulk Import from CSV</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Upload your trading journal CSV. The parser will automatically detect columns like ticker symbol, entry/exit prices, stop loss, etc.
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="mb-3"
        />
        {csvError && (
          <p className="text-sm text-red-500 mb-3">{csvError}</p>
        )}
        {parsedTrades.length > 0 && (
          <div>
            <p className="text-sm text-green-600 mb-3">
              Successfully parsed {parsedTrades.length} trade(s)
            </p>
            <div className="max-h-40 overflow-y-auto mb-3 text-sm">
              {parsedTrades.map((trade, idx) => (
                <div key={idx} className="py-1 border-b">
                  {trade.stock_symbol} - {trade.stock_name} ({trade.trade_type})
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleBulkSubmit}
              disabled={createTrade.isPending}
              className="w-full h-10 px-4 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
            >
              {createTrade.isPending ? 'Creating...' : `Create ${parsedTrades.length} Trade(s)`}
            </button>
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or create manually</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stock Symbol</label>
            <Input
              required
              value={formData.stock_symbol}
              onChange={(e) => setFormData({ ...formData, stock_symbol: e.target.value })}
              placeholder="AAPL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stock Name</label>
            <Input
              required
              value={formData.stock_name}
              onChange={(e) => setFormData({ ...formData, stock_name: e.target.value })}
              placeholder="Apple Inc."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entry Price</label>
            <Input
              required
              type="number"
              step="0.01"
              value={formData.entry_price}
              onChange={(e) => setFormData({ ...formData, entry_price: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Exit Price</label>
            <Input
              required
              type="number"
              step="0.01"
              value={formData.exit_price}
              onChange={(e) => setFormData({ ...formData, exit_price: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Trade Type</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={formData.trade_type}
              onChange={(e) => setFormData({ ...formData, trade_type: e.target.value as TradeType })}
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stop Loss (Optional)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.stop_loss || ''}
              onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Initial Target (Optional)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.initial_target || ''}
            onChange={(e) => setFormData({ ...formData, initial_target: e.target.value ? parseFloat(e.target.value) : undefined })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this trade..."
          />
        </div>

        <button
          type="submit"
          disabled={createTrade.isPending}
          className="w-full h-10 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {createTrade.isPending ? 'Creating...' : 'Create Trade'}
        </button>

        {createTrade.isError && (
          <p className="text-sm text-red-500">Error: {createTrade.error.message}</p>
        )}
        {createTrade.isSuccess && (
          <p className="text-sm text-green-500">Trade created successfully!</p>
        )}
      </form>
    </Card>
  );
}
