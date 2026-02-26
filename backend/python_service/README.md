# Trade CSV Import Service

Python service for parsing CSV files and uploading trade data to the Rust backend.

## Features

- Intelligent column detection (automatically maps various column names to schema)
- Handles different CSV formats (currency symbols, commas, etc.)
- Auto-detects trade type (long/short) if not specified
- Batch upload with error handling
- Progress reporting

## Installation

```bash
cd backend/python_service
uv sync
```

## Usage

### Basic Usage

```bash
uv run python main.py <csv_file_path>
```

### With Custom Backend URL

```bash
uv run python main.py <csv_file_path> http://localhost:8080
```

### Example

```bash
uv run python main.py ~/Downloads/My\ Trading\ Journal\ -\ Trade\ Log.csv
```

## CSV Format

The service automatically detects columns based on common naming patterns:

### Required Columns (detected patterns):
- **Stock Symbol**: ticker symbol, symbol, ticker, stock symbol, code
- **Entry Price**: entry price, entry, buy price, purchase price, open price
- **Exit Price**: exit price, exit, sell price, close price

### Optional Columns (detected patterns):
- **Stock Name**: name, company, stock name, description
- **Trade Type**: type, direction, side, position (values: long/short or buy/sell)
- **Stop Loss**: stop loss, sl
- **Initial Target**: target, tp, take profit, goal
- **Notes**: note, comment, remark, memo

If stock name is not provided, the symbol will be used as the name.
If trade type is not provided, it will be auto-detected based on entry/exit prices.

## Output

The service will:
1. Parse the CSV file
2. Map columns to the trade schema
3. Upload each trade to the backend API
4. Display progress and summary

Example output:
```
Reading CSV file: trades.csv
Parsed 18 trades from CSV

Uploading trades to http://localhost:8080...
✓ Uploaded trade 1/18: QRTS
✓ Uploaded trade 2/18: SNAP
...

==================================================
UPLOAD SUMMARY
==================================================
Total trades: 18
Successfully uploaded: 18
Failed: 0
==================================================
```
