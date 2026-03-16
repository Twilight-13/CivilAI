"""
CIVILAI - GNN Training Script

Trains the Graph Attention Network on simulated infrastructure data.

Usage:
    python train_gnn.py                   # full training
    python train_gnn.py --epochs 5        # quick sanity check
    python train_gnn.py --test-only       # evaluate saved model
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime

import torch
import torch.nn as nn
from torch_geometric.loader import DataLoader
from sklearn.metrics import roc_auc_score, f1_score, classification_report
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.gnn_model import InfraGNN, ModelMetadata, save_gnn_model
from dataset import InfraDataset, compute_pos_weight

# ── Paths ────────────────────────────────────────────────────────────────────
MODEL_DIR    = os.path.join(os.path.dirname(__file__), "models", "saved")
LOG_PATH     = os.path.join(os.path.dirname(__file__), "data", "gnn_training_log.json")
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

# ── Defaults ─────────────────────────────────────────────────────────────────
EPOCHS       = 20
BATCH_SIZE   = 64
LR           = 1e-3
WEIGHT_DECAY = 5e-4


def train_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss = 0.0
    for batch in loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        probs = model(batch.x, batch.edge_index)
        loss = criterion(probs, batch.y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * batch.num_graphs
    return total_loss / len(loader.dataset)


@torch.no_grad()
def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_labels = []

    for batch in loader:
        batch = batch.to(device)
        probs = model(batch.x, batch.edge_index)
        loss = criterion(probs, batch.y)
        total_loss += loss.item() * batch.num_graphs

        all_preds.extend(probs.cpu().numpy())
        all_labels.extend(batch.y.cpu().numpy())

    all_preds  = np.array(all_preds)
    all_labels = np.array(all_labels)
    binary     = (all_preds >= 0.5).astype(int)

    auc = roc_auc_score(all_labels, all_preds) if all_labels.sum() > 0 else 0.0
    f1  = f1_score(all_labels, binary, zero_division=0)

    return total_loss / len(loader.dataset), auc, f1, all_preds, all_labels


def train(epochs=EPOCHS, batch_size=BATCH_SIZE, lr=LR, weight_decay=WEIGHT_DECAY):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\n{'='*60}")
    print(f"  CivilAI GNN Training  |  Device: {device.upper()}")
    print(f"{'='*60}\n")

    # Datasets
    print("[1/4] Loading datasets...")
    train_ds = InfraDataset(split="train")
    val_ds   = InfraDataset(split="val")
    test_ds  = InfraDataset(split="test")
    print(f"      Train={len(train_ds):,}  Val={len(val_ds):,}  Test={len(test_ds):,}")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader  = DataLoader(test_ds,  batch_size=batch_size, shuffle=False, num_workers=0)

    pos_weight = compute_pos_weight(train_ds).to(device)

    # Model
    print("[2/4] Building model...")
    model     = InfraGNN().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)
    criterion = nn.BCELoss()   # sigmoid already applied in model.forward

    print(f"      Parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Training loop
    print(f"[3/4] Training for {epochs} epochs...\n")
    best_val_auc = 0.0
    log_entries  = []

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        train_loss = train_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_auc, val_f1, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step(val_loss)
        elapsed = time.time() - t0

        entry = {
            "epoch":      epoch,
            "train_loss": round(train_loss, 5),
            "val_loss":   round(val_loss, 5),
            "val_auc":    round(val_auc, 4),
            "val_f1":     round(val_f1, 4),
        }
        log_entries.append(entry)

        marker = " ★ BEST" if val_auc > best_val_auc else ""
        print(f"  Epoch {epoch:02d}/{epochs}  |  "
              f"Train Loss={train_loss:.4f}  Val Loss={val_loss:.4f}  "
              f"AUC={val_auc:.4f}  F1={val_f1:.4f}  [{elapsed:.1f}s]{marker}")

        if val_auc > best_val_auc:
            best_val_auc = val_auc
            torch.save(model.state_dict(), os.path.join(MODEL_DIR, "gnn_model_best.pt"))

    # Load best weights for final test evaluation
    print("\n[4/4] Evaluating best model on test set...")
    model.load_state_dict(torch.load(os.path.join(MODEL_DIR, "gnn_model_best.pt"), map_location=device))
    _, test_auc, test_f1, preds, labels = evaluate(model, test_loader, criterion, device)
    binary = (preds >= 0.5).astype(int)

    print(f"\n  Test AUC : {test_auc:.4f}")
    print(f"  Test F1  : {test_f1:.4f}")
    print("\n  Classification Report:\n")
    print(classification_report(labels, binary, target_names=["no_fail", "fail"]))

    # Save final model + metadata
    metadata = ModelMetadata(
        training_date=datetime.now().strftime("%Y-%m-%d %H:%M"),
        epochs_trained=epochs,
        best_val_auc=round(best_val_auc, 4),
        test_auc=round(test_auc, 4),
        test_f1=round(test_f1, 4),
        training_samples=len(train_ds),
    )
    save_gnn_model(model, metadata, MODEL_DIR)

    # Save training log
    with open(LOG_PATH, "w") as f:
        json.dump({"epochs": log_entries, "final": {
            "test_auc": metadata.test_auc,
            "test_f1": metadata.test_f1,
            "best_val_auc": metadata.best_val_auc,
        }}, f, indent=2)
    print(f"\n  Training log → {LOG_PATH}")
    print(f"  Model saved  → {MODEL_DIR}/gnn_model.pt\n")

    return model, metadata


def test_only():
    """Evaluate existing saved model on the test set."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    from models.gnn_model import load_gnn_model
    model, meta = load_gnn_model(MODEL_DIR, device)
    if model is None:
        print("No saved model found. Run train_gnn.py first.")
        return
    test_ds     = InfraDataset(split="test")
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False, num_workers=0)
    criterion   = nn.BCELoss()
    _, auc, f1, preds, labels = evaluate(model, test_loader, criterion, device)
    binary = (preds >= 0.5).astype(int)
    print(f"\nTest AUC={auc:.4f}  F1={f1:.4f}")
    print(classification_report(labels, binary, target_names=["no_fail", "fail"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CivilAI GNN")
    parser.add_argument("--epochs",     type=int, default=EPOCHS)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--lr",         type=float, default=LR)
    parser.add_argument("--test-only",  action="store_true")
    args = parser.parse_args()

    if args.test_only:
        test_only()
    else:
        train(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
