"""
CIVILAI - One-Click Training Runner

Runs the complete ML pipeline in sequence:
  1. Data generation (headless game simulations)
  2. GNN training
  3. RL agent training

Usage:
    python run_training.py               # full pipeline
    python run_training.py --quick       # quick smoke test (small data, few epochs)
    python run_training.py --skip-data   # skip data gen if already exists
    python run_training.py --skip-rl     # skip RL (only train GNN)
"""

import os
import sys
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "training_data.pt")


def print_header(title: str):
    print(f"\n{'#'*60}")
    print(f"  {title}")
    print(f"{'#'*60}\n")


def run_data_generation(num_games: int, steps: int):
    print_header("STAGE 1 / 3 — Data Generation")
    from data_generator import generate
    generate(num_games=num_games, steps=steps)


def run_gnn_training(epochs: int):
    print_header("STAGE 2 / 3 — GNN Training")
    from train_gnn import train
    train(epochs=epochs)


def run_rl_training(steps: int):
    print_header("STAGE 3 / 3 — RL Agent Training")
    from train_rl import train
    train(total_steps=steps)


def main():
    parser = argparse.ArgumentParser(description="CivilAI One-Click Training Pipeline")
    parser.add_argument("--quick",     action="store_true", help="Fast run for smoke test")
    parser.add_argument("--skip-data", action="store_true", help="Skip data generation (use existing)")
    parser.add_argument("--skip-rl",   action="store_true", help="Skip RL training")
    parser.add_argument("--skip-gnn",  action="store_true", help="Skip GNN training")
    args = parser.parse_args()

    if args.quick:
        num_games = 200
        steps     = 30
        gnn_ep    = 5
        rl_steps  = 50_000
        print("[Quick mode] Using reduced parameters for rapid testing.\n")
    else:
        num_games = 10_000
        steps     = 60
        gnn_ep    = 20
        rl_steps  = 500_000

    total_start = time.time()

    # Stage 1: Data Generation
    if not args.skip_data:
        run_data_generation(num_games, steps)
    else:
        if not os.path.exists(DATA_PATH):
            print("[Error] --skip-data specified but no training data found. Run without --skip-data first.")
            sys.exit(1)
        print(f"[Stage 1] Skipping data generation — using {DATA_PATH}")

    # Stage 2: GNN
    if not args.skip_gnn:
        run_gnn_training(gnn_ep)
    else:
        print("[Stage 2] Skipping GNN training.")

    # Stage 3: RL
    if not args.skip_rl:
        run_rl_training(rl_steps)
    else:
        print("[Stage 3] Skipping RL training.")

    total_elapsed = time.time() - total_start
    mins, secs = divmod(int(total_elapsed), 60)

    print_header("TRAINING COMPLETE")
    print(f"  Total time : {mins}m {secs}s")
    print(f"  Start the server: python app.py")
    print(f"  Test evaluation:  python train_gnn.py --test-only")
    print(f"                    python train_rl.py --eval-only\n")


if __name__ == "__main__":
    main()
