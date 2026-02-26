'use client';

import { useState } from 'react';
import { useCreateTrade } from '@/lib/hooks/trade';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CreateTradeInput, TradeType } from '@/lib/types/trades';

export function CreateTradeTab() {
  const createTrade = useCreateTrade();
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

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Create New Trade</h2>
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
