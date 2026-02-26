import csv
import random
from pathlib import Path
from typing import Dict, List, Optional

# Fake data generators for missing notes
ENTRY_TACTICS = [
    "INSIDE DAY", "HIGH VOLUME CLOSE", "BASE PIVOT (ORB)", 
    "VOLUME SUPPORT", "WHOLE NUMBER", "BREAKOUT"
]

EDGES = [
    "RELATIVE STRENGTH", "HIGHEST VOLUME EVER", "HIGHEST VOLUME SINCE IPO",
    "STRONG MOMENTUM", "TECHNICAL BREAKOUT"
]

ENTRY_RATIONALES = [
    "Entered based on technical setup with favorable risk/reward",
    "Strong price action near key support level",
    "Consolidation pattern with volume confirmation",
    "Breakout above resistance with strong volume",
    "Pullback to moving average with bullish reversal"
]

EXIT_RATIONALES = [
    "Exited at predetermined stop loss",
    "Took profit at resistance level",
    "Exited at breakeven to protect capital",
    "Stopped out on gap down",
    "Sold on weakness below key support"
]

EMOTIONAL_STATES = [
    "Calm and followed the plan",
    "Emotionally stable, accepted the risk",
    "Followed my trading rules without hesitation",
    "Was disciplined with entry and exit",
    "Maintained composure throughout the trade"
]

LESSONS = [
    "Follow the trading plan consistently",
    "Respect stop losses no matter what",
    "Position sizing is crucial for risk management",
    "Don't let emotions drive trading decisions",
    "Patience is key to successful trading"
]

IMPROVEMENTS = [
    "Continue to refine entry timing",
    "Work on position sizing strategy",
    "Improve stop loss placement",
    "Better risk management on volatile names",
    "Focus on high probability setups"
]


def generate_fake_note(ticker: str) -> Dict[str, str]:
    """Generate fake trading notes for a ticker without notes."""
    return {
        "TICKER SYMBOL": ticker,
        "ENTRY TACTICS": random.choice(ENTRY_TACTICS),
        "EDGES ": random.choice(EDGES),  # Note the space after EDGES
        "ENTRY RATIONALE": random.choice(ENTRY_RATIONALES),
        "EXIT RATIONALE": random.choice(EXIT_RATIONALES),
        "EMOTIONAL STATE": random.choice(EMOTIONAL_STATES),
        "LESSON LEARNT ": random.choice(LESSONS),  # Note the space after LEARNT
        "THINGS TO IMPROVE": random.choice(IMPROVEMENTS)
    }


def read_csv_file(filepath: Path) -> List[Dict[str, str]]:
    """Read CSV file and return list of dictionaries."""
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        # Skip empty lines at the beginning
        lines = [line for line in f if line.strip()]
        reader = csv.DictReader(lines)
        for row in reader:
            # Clean up empty rows and rows with only whitespace
            if any(v.strip() for v in row.values() if v):
                data.append(row)
    return data


def merge_trades_and_notes(trades_file: Path, notes_file: Path, output_file: Path):
    """
    Merge trades.csv with notes.csv, generating fake notes for trades without notes.
    
    Args:
        trades_file: Path to trades.csv
        notes_file: Path to notes.csv
        output_file: Path to output merged CSV
    """
    # Read both CSV files
    trades = read_csv_file(trades_file)
    notes = read_csv_file(notes_file)
    
    # Create a lookup dictionary for notes by S/N and TICKER SYMBOL
    notes_lookup = {}
    for note in notes:
        sn = note.get('S/N', '').strip()
        ticker = note.get('TICKER SYMBOL', '').strip()
        if sn and ticker:
            key = f"{sn}_{ticker}"
            notes_lookup[key] = note
    
    # Merge trades with notes
    merged_data = []
    for trade in trades:
        sn = trade.get('S/N', '').strip()
        ticker = trade.get('TICKER SYMBOL', '').strip()
        
        if not sn or not ticker:
            continue
            
        key = f"{sn}_{ticker}"
        
        # Check if note exists for this trade
        if key in notes_lookup:
            note = notes_lookup[key]
        else:
            # Generate fake note
            print(f"Generating fake note for S/N {sn}, Ticker: {ticker}")
            note = generate_fake_note(ticker)
        
        # Merge trade and note data
        merged_row = {**trade, **note}
        merged_data.append(merged_row)
    
    # Write merged data to output file
    if merged_data:
        fieldnames = list(merged_data[0].keys())
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(merged_data)
        
        print(f"\nMerge complete! Output saved to: {output_file}")
        print(f"Total trades processed: {len(merged_data)}")
    else:
        print("No data to merge!")


def main():
    # Define file paths
    data_dir = Path(__file__).parent / "data"
    trades_file = data_dir / "trades.csv"
    notes_file = data_dir / "notes.csv"
    output_file = data_dir / "merged_trades.csv"
    
    # Check if input files exist
    if not trades_file.exists():
        print(f"Error: {trades_file} not found!")
        return
    
    if not notes_file.exists():
        print(f"Error: {notes_file} not found!")
        return
    
    # Perform merge
    print("Starting merge process...")
    print(f"Trades file: {trades_file}")
    print(f"Notes file: {notes_file}")
    print(f"Output file: {output_file}\n")
    
    merge_trades_and_notes(trades_file, notes_file, output_file)


if __name__ == "__main__":
    main()
