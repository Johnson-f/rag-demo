'use client';

import { useTrades, useDeleteTrade } from '@/lib/hooks/trade';
import { Card } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

export function TradesListTab() {
  const { data: trades, isLoading, error } = useTrades();
  const deleteTrade = useDeleteTrade();

  const handleDelete = async (tradeId: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await deleteTrade.mutateAsync(tradeId);
      } catch (error) {
        console.error('Failed to delete trade:', error);
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading trades...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error.message}</div>;
  }

  if (!trades || trades.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No trades yet. Create your first trade!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {trades.map((trade) => (
        <Card key={trade.trade_id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{trade.stock_symbol}</h3>
              <p className="text-sm text-muted-foreground">{trade.stock_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                trade.trade_type === 'long' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
              }`}>
                {trade.trade_type.toUpperCase()}
              </span>
              <button
                onClick={() => handleDelete(trade.trade_id)}
                disabled={deleteTrade.isPending}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                aria-label="Delete trade"
              >
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Entry Price</p>
              <p className="font-semibold">${trade.entry_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Exit Price</p>
              <p className="font-semibold">${trade.exit_price.toFixed(2)}</p>
            </div>
            {trade.profit !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className={`font-semibold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${trade.profit.toFixed(2)}
                </p>
              </div>
            )}
            {trade.profit_in_percent !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Profit %</p>
                <p className={`font-semibold ${trade.profit_in_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trade.profit_in_percent.toFixed(2)}%
                </p>
              </div>
            )}
          </div>

          {trade.trade_summary && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm">{trade.trade_summary}</p>
            </div>
          )}

          {trade.notes && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Notes:</p>
              <p className="text-sm mt-1">{trade.notes}</p>
            </div>
          )}

          {trade.created_at && (
            <p className="text-xs text-muted-foreground mt-4">
              Created: {new Date(trade.created_at).toLocaleString()}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
