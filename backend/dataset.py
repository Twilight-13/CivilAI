"""
CIVILAI - PyTorch Geometric Dataset

Wraps the raw training snapshots saved by data_generator.py into a
standard PyG InMemoryDataset so the GNN training loop can use a
standard DataLoader with automatic batching.
"""

import os
import torch
from torch_geometric.data import Data, InMemoryDataset
from sklearn.model_selection import train_test_split


DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "training_data.pt")


class InfraDataset(InMemoryDataset):
    """
    Loads graph snapshots and exposes train / val / test subsets.

    Each item is a PyG Data object:
        data.x          : node feature matrix [N, 9]
        data.edge_index : graph connectivity   [2, E]
        data.y          : binary failure label [N]
    """

    def __init__(self, split: str = "train", val_ratio: float = 0.1, test_ratio: float = 0.1):
        """
        Args:
            split: one of 'train', 'val', 'test'
        """
        assert split in ("train", "val", "test")
        super().__init__(root=None, transform=None)

        if not os.path.exists(DATA_PATH):
            raise FileNotFoundError(
                f"Training data not found at {DATA_PATH}.\n"
                "Run: python data_generator.py"
            )

        raw = torch.load(DATA_PATH)
        data_list = [
            Data(x=s["x"], edge_index=s["edge_index"], y=s["y"])
            for s in raw
        ]

        # Reproducible split
        indices = list(range(len(data_list)))
        train_idx, temp_idx = train_test_split(
            indices, test_size=val_ratio + test_ratio, random_state=42
        )
        val_idx, test_idx = train_test_split(
            temp_idx, test_size=test_ratio / (val_ratio + test_ratio), random_state=42
        )

        split_map = {"train": train_idx, "val": val_idx, "test": test_idx}
        selected = [data_list[i] for i in split_map[split]]
        self.data, self.slices = self.collate(selected)

    # InMemoryDataset interface
    def _download(self): pass
    def _process(self):  pass


def compute_pos_weight(dataset: InMemoryDataset) -> torch.Tensor:
    """
    Compute positive-class weight for BCEWithLogitsLoss to handle
    class imbalance (failures are rare events).
    """
    total_pos = 0.0
    total_neg = 0.0
    for data in dataset:
        total_pos += data.y.sum().item()
        total_neg += (1 - data.y).sum().item()
    weight = total_neg / max(total_pos, 1)
    print(f"[Dataset] pos_weight = {weight:.2f}  (neg={int(total_neg):,} / pos={int(total_pos):,})")
    return torch.tensor([weight], dtype=torch.float)
