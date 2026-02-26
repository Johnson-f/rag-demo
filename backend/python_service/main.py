import pandas as pd
import requests
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class TradeInput:
    """Schema matching the Rust CreateTradeInput"""
    stock_symbol: str
    stock_name: str
    entry_price: float
    exit_price: float
    trade_type: str  # "long" or "short"
    stop_loss: Optional[float] = None
    initial_target: Optional[float] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = {
            "stock_symbol": self.stock_symbol,
            "stock_name": self.stock_name,
            "entry_price": self.entry_price,
            "exit_price": self.exit_price,
            "trade_type": self.trade_type,
        }
        # Only include optional fields if they have real values
        if self.stop_loss is not None:
            data["stop_loss"] = self.stop_loss
        if self.initial_target is not None:
            data["initial_target"] = self.initial_target
        if self.notes is not None and self.notes.strip():
            data["notes"] = self.notes
        return data


class CSVTradeParser:
    """Parse CSV files and map columns to trade schema"""

    FIELD_PATTERNS = {
        'stock_symbol': [
            r'ticker.*symbol', r'symbol', r'ticker', r'stock.*symbol', r'code'
        ],
        'stock_name': [
            r'name', r'company', r'stock.*name', r'description'
        ],
        'entry_price': [
            r'entry.*price', r'entry', r'buy.*price', r'purchase.*price', r'open.*price'
        ],
        'exit_price': [
            r'exit.*price', r'exit', r'sell.*price', r'close.*price'
        ],
        'trade_type': [
            r'type', r'direction', r'side', r'position'
        ],
        'stop_loss': [
            r'stop.*loss.*\$', r'stop.*loss', r'sl'
        ],
        'initial_target': [
            r'target', r'tp', r'take.*profit', r'goal'
        ],
        'entry_tactics': [
            r'entry.*tactics', r'tactics', r'setup'
        ],
        'edges': [
            r'edges', r'edge', r'advantage'
        ],
        'entry_rationale': [
            r'entry.*rationale', r'entry.*reason', r'why.*entry'
        ],
        'exit_rationale': [
            r'exit.*rationale', r'exit.*reason', r'why.*exit'
        ],
        'emotional_state': [
            r'emotional.*state', r'emotion', r'feeling'
        ],
        'lesson_learnt': [
            r'lesson.*learnt', r'lesson', r'learning'
        ],
        'things_to_improve': [
            r'things.*to.*improve', r'improve', r'improvement'
        ],
    }

    @staticmethod
    def detect_column_mapping(columns: List[str]) -> Dict[str, str]:
        """Detect which CSV columns map to which trade fields"""
        mapping = {}

        for col in columns:
            normalized = col.strip().lower()

            for field, patterns in CSVTradeParser.FIELD_PATTERNS.items():
                if field not in mapping:
                    for pattern in patterns:
                        if re.search(pattern, normalized, re.IGNORECASE):
                            mapping[field] = col
                            break

        return mapping

    @staticmethod
    def clean_price(value: Any) -> Optional[float]:
        """Clean and convert price values (remove $, commas, #DIV/0!, etc.)"""
        if value is None:
            return None

        if isinstance(value, float) and pd.isna(value):
            return None

        if isinstance(value, (int, float)):
            return float(value)

        cleaned = str(value).strip()

        # Skip invalid/empty values
        if not cleaned or cleaned.lower() in ('nan', 'none', '', '#div/0!', '#n/a', '#value!', '#ref!'):
            return None

        # Remove currency symbols and commas
        cleaned = cleaned.replace('$', '').replace(',', '').strip()

        try:
            return float(cleaned)
        except ValueError:
            return None

    @staticmethod
    def clean_string(value: Any) -> Optional[str]:
        """Clean string values, returning None for nan/empty"""
        if value is None:
            return None

        if isinstance(value, float) and pd.isna(value):
            return None

        cleaned = str(value).strip()

        if not cleaned or cleaned.lower() in ('nan', 'none', ''):
            return None

        return cleaned

    @staticmethod
    def parse_csv(file_path: str) -> List[TradeInput]:
        """Parse CSV file and return list of TradeInput objects"""
        df = pd.read_csv(file_path)

        # Detect column mapping
        column_mapping = CSVTradeParser.detect_column_mapping(df.columns.tolist())

        print(f"Detected column mapping: {column_mapping}")

        # Validate required fields
        required_fields = ['stock_symbol', 'entry_price', 'exit_price']
        missing_fields = [f for f in required_fields if f not in column_mapping]

        if missing_fields:
            raise ValueError(
                f"Could not detect required columns: {', '.join(missing_fields)}. "
                f"Available columns: {', '.join(df.columns.tolist())}"
            )

        trades = []

        for idx, row in df.iterrows():
            try:
                # Extract and clean stock symbol
                stock_symbol = CSVTradeParser.clean_string(row[column_mapping['stock_symbol']])
                if not stock_symbol:
                    print(f"Warning: Row {idx + 1} missing stock symbol, skipping")
                    continue

                # Clean the symbol (remove spaces, $ etc.)
                stock_symbol = stock_symbol.replace('$', '').strip()

                # Use symbol as name since CSV has no separate name column
                stock_name = stock_symbol

                # Extract required prices
                entry_price = CSVTradeParser.clean_price(row[column_mapping['entry_price']])
                exit_price = CSVTradeParser.clean_price(row[column_mapping['exit_price']])

                if entry_price is None or exit_price is None:
                    print(f"Warning: Row {idx + 1} ({stock_symbol}) missing entry/exit price, skipping")
                    continue

                # Determine trade type
                trade_type = 'long'
                if 'trade_type' in column_mapping:
                    type_str = CSVTradeParser.clean_string(row[column_mapping['trade_type']])
                    if type_str:
                        type_str = type_str.lower()
                        if type_str in ['short', 'sell']:
                            trade_type = 'short'
                        elif type_str in ['long', 'buy']:
                            trade_type = 'long'
                        else:
                            # Auto-detect from prices
                            trade_type = 'long' if exit_price >= entry_price else 'short'
                    else:
                        trade_type = 'long' if exit_price >= entry_price else 'short'
                else:
                    # Auto-detect from prices
                    trade_type = 'long' if exit_price >= entry_price else 'short'

                # Extract optional float fields — always None if missing/invalid
                stop_loss = None
                if 'stop_loss' in column_mapping:
                    stop_loss = CSVTradeParser.clean_price(row[column_mapping['stop_loss']])

                initial_target = None
                if 'initial_target' in column_mapping:
                    initial_target = CSVTradeParser.clean_price(row[column_mapping['initial_target']])

                # Build comprehensive notes from all journal fields
                notes_parts = []

                note_fields = [
                    ('entry_tactics', 'Entry Tactics'),
                    ('edges', 'Edges'),
                    ('entry_rationale', 'Entry Rationale'),
                    ('exit_rationale', 'Exit Rationale'),
                    ('emotional_state', 'Emotional State'),
                    ('lesson_learnt', 'Lesson Learnt'),
                    ('things_to_improve', 'Things to Improve'),
                ]

                for field_key, label in note_fields:
                    if field_key in column_mapping:
                        val = CSVTradeParser.clean_string(row[column_mapping[field_key]])
                        if val:
                            notes_parts.append(f"{label}: {val}")

                notes = " | ".join(notes_parts) if notes_parts else None

                trade = TradeInput(
                    stock_symbol=stock_symbol,
                    stock_name=stock_name,
                    entry_price=entry_price,
                    exit_price=exit_price,
                    trade_type=trade_type,
                    stop_loss=stop_loss,
                    initial_target=initial_target,
                    notes=notes
                )

                trades.append(trade)

            except Exception as e:
                print(f"Warning: Error processing row {idx + 1}: {e}")
                continue

        return trades


class TradeUploader:
    """Upload trades to the Rust backend API"""

    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url.rstrip('/')
        self.trades_endpoint = f"{self.base_url}/api/trades"

    def upload_trade(self, trade: TradeInput) -> Dict[str, Any]:
        """Upload a single trade to the backend"""
        response = requests.post(
            self.trades_endpoint,
            json=trade.to_dict(),
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()

    def upload_trades_batch(self, trades: List[TradeInput]) -> Dict[str, Any]:
        """Upload multiple trades to the backend"""
        results = {
            "success": [],
            "failed": []
        }

        for idx, trade in enumerate(trades, 1):
            try:
                result = self.upload_trade(trade)
                results["success"].append({
                    "index": idx,
                    "symbol": trade.stock_symbol,
                    "trade_id": result.get("trade_id")
                })
                print(f"✓ Uploaded trade {idx}/{len(trades)}: {trade.stock_symbol}")
            except Exception as e:
                results["failed"].append({
                    "index": idx,
                    "symbol": trade.stock_symbol,
                    "error": str(e)
                })
                print(f"✗ Failed to upload trade {idx}/{len(trades)}: {trade.stock_symbol} - {e}")

        return results


def main():
    """Main entry point for CSV import"""
    if len(sys.argv) < 2:
        print("Usage: python main.py <csv_file_path> [backend_url]")
        print("Example: python main.py trades.csv")
        print("Example: python main.py trades.csv http://localhost:8080")
        sys.exit(1)

    csv_file = sys.argv[1]
    backend_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8080"

    if not Path(csv_file).exists():
        print(f"Error: File not found: {csv_file}")
        sys.exit(1)

    print(f"Reading CSV file: {csv_file}")

    try:
        # Parse CSV
        trades = CSVTradeParser.parse_csv(csv_file)
        print(f"Parsed {len(trades)} trades from CSV")

        if not trades:
            print("No valid trades found in CSV")
            sys.exit(1)

        # Preview first trade
        print(f"\nFirst trade preview: {trades[0].to_dict()}\n")

        # Upload to backend
        print(f"Uploading trades to {backend_url}...")
        uploader = TradeUploader(backend_url)
        results = uploader.upload_trades_batch(trades)

        # Print summary
        print("\n" + "="*50)
        print("UPLOAD SUMMARY")
        print("="*50)
        print(f"Total trades parsed: {len(trades)}")
        print(f"Successfully uploaded: {len(results['success'])}")
        print(f"Failed: {len(results['failed'])}")

        if results['failed']:
            print("\nFailed trades:")
            for failed in results['failed']:
                print(f"  - Row {failed['index']}: {failed['symbol']} - {failed['error']}")

        print("="*50)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()