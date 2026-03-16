"""
CIVILAI - Headless Game Data Generator

Runs thousands of game simulations without any player intervention and
records (graph_snapshot, node_labels) pairs to disk for GNN training.

Label definition:
    label[node] = 1  if node fails within the next LOOKAHEAD steps
    label[node] = 0  otherwise

Usage:
    python data_generator.py                  # generate with defaults
    python data_generator.py --games 5000     # fewer games for quick test
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import random
import torch
from tqdm import tqdm

from game_engine import CityGame
from models.gnn_model import node_to_feature_vector, LAYER_TO_IDX

# ── Config ──────────────────────────────────────────────────────────────────
DEFAULT_NUM_GAMES   = 10_000
DEFAULT_STEPS       = 60       # steps to simulate per game
LOOKAHEAD           = 5        # label = 1 if node fails within next N steps
DIFFICULTIES        = ["easy", "normal", "hard"]
OUTPUT_DIR          = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_PATH         = os.path.join(OUTPUT_DIR, "training_data.pt")


def simulate_one_game(difficulty: str, steps: int, lookahead: int):
    """
    Run a single headless game and collect training samples.

    Returns a list of dicts, one per (step, node):
        {
          "features":    [9 floats],
          "edge_index":  [[src...], [dst...]],
          "node_ids":    [node_id ...],         # maps row → original node id
          "label":       1 or 0
        }
    Actually we return one dict per graph *snapshot*, not per node,
    so the GNN can be trained on the whole graph at once.
    """
    game = CityGame(difficulty=difficulty)
    node_ids = list(game.nodes.keys())
    node_id_to_idx = {nid: i for i, nid in enumerate(node_ids)}

    # Pre-build edge_index (static topology for this game)
    edges = []
    for node in game.nodes.values():
        src = node_id_to_idx[node.id]
        for nb_id in node.connected_to:
            if nb_id in node_id_to_idx:
                dst = node_id_to_idx[nb_id]
                edges.append([src, dst])
                edges.append([dst, src])

    if edges:
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.zeros((2, 0), dtype=torch.long)

    snapshots = []

    # Record a health snapshot at each step
    health_over_time = []
    for step in range(steps + lookahead):
        # Record health BEFORE stepping
        health_snapshot = {nid: game.nodes[nid].health for nid in node_ids}
        health_over_time.append(health_snapshot)
        game.step()

    # Build training samples for steps 0..steps-1
    for step_i in range(steps):
        # Features at step_i
        # Re-advance a fresh game to step_i to get features
        # (We already have health; reconstruct approximate features)
        features = []
        for nid in node_ids:
            node = game.nodes[nid]
            # Use the recorded health instead of current (which is end-of-game)
            h = health_over_time[step_i][nid]
            layer_onehot = [0.0, 0.0, 0.0, 0.0]
            layer_onehot[LAYER_TO_IDX.get(node.layer, 0)] = 1.0
            days_since = step_i - node.last_maintained if node.last_maintained > 0 else step_i
            features.append([
                h / 100.0,
                node.age / 100.0,
                len(node.connected_to) / 10.0,
                float(node.is_critical),
                *layer_onehot,
                min(days_since / 50.0, 1.0),
            ])

        x = torch.tensor(features, dtype=torch.float)

        # Labels: did this node fail within [step_i+1, step_i+lookahead]?
        labels = []
        for nid in node_ids:
            failed = any(
                health_over_time[step_i + k + 1][nid] <= 0
                for k in range(lookahead)
                if step_i + k + 1 < len(health_over_time)
            )
            labels.append(1.0 if failed else 0.0)

        y = torch.tensor(labels, dtype=torch.float)

        snapshots.append({
            "x": x,
            "edge_index": edge_index,
            "y": y,
            "node_ids": node_ids,
        })

    return snapshots


def generate(num_games: int = DEFAULT_NUM_GAMES, steps: int = DEFAULT_STEPS, lookahead: int = LOOKAHEAD):
    """Generate training data and save to OUTPUT_PATH."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_snapshots = []
    pos = 0
    total = 0

    print(f"\n[DataGen] Generating {num_games} games × {steps} steps = up to {num_games * steps:,} snapshots")
    print(f"          Lookahead window = {lookahead} steps | Saving → {OUTPUT_PATH}\n")

    for game_i in tqdm(range(num_games), desc="Simulating games"):
        difficulty = random.choice(DIFFICULTIES)
        try:
            snaps = simulate_one_game(difficulty, steps, lookahead)
            all_snapshots.extend(snaps)
            total += len(snaps)
            pos += sum(y.sum().item() for s in snaps for y in [s["y"]])
        except Exception as e:
            # Skip occasional degenerate games
            continue

    neg = total - pos
    print(f"\n[DataGen] Done! Total snapshots : {total:,}")
    print(f"          Positive labels (failures): {int(pos):,}  ({100*pos/max(total,1):.1f}%)")
    print(f"          Negative labels (ok nodes): {int(neg):,}  ({100*neg/max(total,1):.1f}%)")

    torch.save(all_snapshots, OUTPUT_PATH)
    print(f"[DataGen] Saved to {OUTPUT_PATH}")
    return all_snapshots


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CivilAI training data generator")
    parser.add_argument("--games",     type=int, default=DEFAULT_NUM_GAMES)
    parser.add_argument("--steps",     type=int, default=DEFAULT_STEPS)
    parser.add_argument("--lookahead", type=int, default=LOOKAHEAD)
    args = parser.parse_args()
    generate(args.games, args.steps, args.lookahead)
