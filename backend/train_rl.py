"""
CIVILAI - Reinforcement Learning Agent (PPO)

Wraps CityGame as a Gymnasium environment, then trains a Proximal Policy
Optimization agent to play the infrastructure management game optimally.

The trained agent is used in the "AI vs Human" comparison tab to give a
real baseline that the player competes against.

Usage:
    python train_rl.py                # full training (500K steps)
    python train_rl.py --steps 50000  # quick sanity run
    python train_rl.py --eval-only    # run 20 eval episodes
"""

import os
import sys
import json
import argparse
import numpy as np

import gymnasium as gym
from gymnasium import spaces

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from game_engine import CityGame

# ── Paths ─────────────────────────────────────────────────────────────────
SAVE_DIR = os.path.join(os.path.dirname(__file__), "models", "saved")
os.makedirs(SAVE_DIR, exist_ok=True)

AGENT_PATH   = os.path.join(SAVE_DIR, "rl_agent")          # SB3 adds .zip
LOG_PATH     = os.path.join(os.path.dirname(__file__), "data", "rl_training_log.json")

# ── Constants ─────────────────────────────────────────────────────────────
TOP_K           = 10     # agent considers the K highest-risk nodes each step
ACTION_SPACE_K  = 4      # 0=skip, 1=repair, 2=upgrade, 3=emergency
MAX_NODES       = 196    # max nodes in a generated city
NODE_FEAT_DIM   = 6      # health, age, degree, is_critical, layer_idx, days_since
BUDGET_SCALE    = 2_000_000.0  # normalize budget to [0, 1]


class CivilAIEnv(gym.Env):
    """
    Gymnasium wrapper around CityGame for RL training.

    Observation:
        - Top-K at-risk node features (K × 6)
        - Scalar: normalised budget
        - Scalar: normalised time step
     → flat vector of K*6 + 2 dimensions

    Action (Discrete):
        K * ACTION_SPACE_K choices — for each of the K at-risk nodes,
        choose skip/repair/upgrade/emergency.
        Represented as a single integer index.

    Reward shaping:
        +5   per step survived without any failure
        +20  for a preventive action on a node with health < 40%
        -100 for each failed node
        -cost/10000 for spending budget (small penalty for over-spending)
        -200 if game over
    """

    metadata = {"render_modes": []}

    def __init__(self, difficulty: str = "normal"):
        super().__init__()
        self.difficulty = difficulty
        self.game       = None
        self._at_risk   = []   # current top-K node ids

        obs_dim = TOP_K * NODE_FEAT_DIM + 2
        self.observation_space = spaces.Box(
            low=0.0, high=1.0, shape=(obs_dim,), dtype=np.float32
        )
        self.action_space = spaces.Discrete(TOP_K * ACTION_SPACE_K)

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed)
        self.game = CityGame(difficulty=self.difficulty)
        obs = self._get_obs()
        return obs, {}

    def step(self, action: int):
        node_idx    = action // ACTION_SPACE_K
        action_type = action %  ACTION_SPACE_K      # 0=skip, 1=repair, 2=upgrade, 3=emergency

        reward = 0.0

        # Execute player action
        if action_type > 0 and node_idx < len(self._at_risk):
            nid     = self._at_risk[node_idx]
            act_map = {1: "repair", 2: "upgrade", 3: "emergency"}
            result  = self.game.execute_action(act_map[action_type], nid)
            if result["success"]:
                node = self.game.nodes[nid]
                if node.health < 40:
                    reward += 20   # bonus for preventive action
                reward -= result["cost"] / 10_000  # small budget penalty

        # Advance one day
        step_result = self.game.step()

        # Reward shaping
        n_failed = len(step_result["failed_nodes"])
        if n_failed == 0:
            reward += 5.0
        else:
            reward -= 100.0 * n_failed

        game_over = step_result["game_over"]
        truncated = self.game.time_step >= 200   # episode horizon

        if game_over:
            reward -= 200.0

        obs = self._get_obs()
        return obs, reward, game_over, truncated, {"time": self.game.time_step}

    def _get_obs(self) -> np.ndarray:
        """Build flat observation vector."""
        # Rank nodes by risk (same heuristic as before — agent improves on it)
        scored = []
        for nid, node in self.game.nodes.items():
            risk = (100 - node.health) + node.age / 2 + len(node.connected_to) * 2
            if node.is_critical:
                risk *= 1.5
            scored.append((risk, nid))
        scored.sort(reverse=True)
        self._at_risk = [nid for _, nid in scored[:TOP_K]]

        features = []
        from models.gnn_model import LAYER_TO_IDX
        for nid in self._at_risk:
            node = self.game.nodes[nid]
            days_since = self.game.time_step - node.last_maintained if node.last_maintained > 0 else self.game.time_step
            features.extend([
                node.health / 100.0,
                node.age / 100.0,
                len(node.connected_to) / 10.0,
                float(node.is_critical),
                LAYER_TO_IDX.get(node.layer, 0) / 3.0,
                min(days_since / 50.0, 1.0),
            ])

        # Pad if fewer than TOP_K nodes available
        while len(features) < TOP_K * NODE_FEAT_DIM:
            features.extend([0.0] * NODE_FEAT_DIM)

        features.append(min(self.game.budget / BUDGET_SCALE, 1.0))
        features.append(min(self.game.time_step / 200.0, 1.0))
        return np.array(features, dtype=np.float32)


# ── Training ───────────────────────────────────────────────────────────────

def train(total_steps: int = 500_000):
    from stable_baselines3 import PPO
    from stable_baselines3.common.env_util import make_vec_env
    from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback

    print(f"\n{'='*60}")
    print(f"  CivilAI RL Training  |  PPO  |  {total_steps:,} steps")
    print(f"{'='*60}\n")

    # Vectorized envs for faster rollout (4 parallel envs)
    n_envs  = 4
    env     = make_vec_env(CivilAIEnv, n_envs=n_envs, env_kwargs={"difficulty": "normal"})
    eval_env = CivilAIEnv(difficulty="hard")   # evaluate on harder setting

    checkpoint_cb = CheckpointCallback(
        save_freq=max(50_000 // n_envs, 1),
        save_path=SAVE_DIR,
        name_prefix="rl_checkpoint",
    )
    eval_cb = EvalCallback(
        eval_env,
        best_model_save_path=SAVE_DIR,
        log_path=os.path.join(os.path.dirname(__file__), "data"),
        eval_freq=max(25_000 // n_envs, 1),
        n_eval_episodes=10,
        deterministic=True,
        verbose=1,
    )

    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=3e-4,
        n_steps=512,
        batch_size=64,
        n_epochs=10,
        gamma=0.995,          # high discount — agent optimises for long-run survival
        gae_lambda=0.95,
        clip_range=0.2,
        verbose=1,
        tensorboard_log=None,
        policy_kwargs=dict(net_arch=[256, 256]),
    )

    print(f"[RL] Starting training with {n_envs} parallel environments...\n")
    model.learn(
        total_timesteps=total_steps,
        callback=[checkpoint_cb, eval_cb],
        progress_bar=True,
    )

    model.save(AGENT_PATH)
    print(f"\n[RL] Agent saved → {AGENT_PATH}.zip")

    # Quick eval
    mean_r, std_r = evaluate_agent(model, n_episodes=20)
    log = {
        "total_steps": total_steps,
        "mean_reward_eval": round(mean_r, 2),
        "std_reward_eval":  round(std_r, 2),
    }
    with open(LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)
    print(f"[RL] Mean eval reward: {mean_r:.2f} ± {std_r:.2f}")
    return model


def evaluate_agent(model, n_episodes: int = 20) -> tuple:
    """Run evaluation episodes and return (mean_reward, std_reward)."""
    env = CivilAIEnv(difficulty="normal")
    rewards = []
    for _ in range(n_episodes):
        obs, _ = env.reset()
        ep_reward = 0.0
        done = False
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, _ = env.step(action)
            ep_reward += reward
            done = terminated or truncated
        rewards.append(ep_reward)
    return float(np.mean(rewards)), float(np.std(rewards))


def load_rl_agent(device: str = "cpu"):
    """
    Load trained PPO agent from disk.
    Returns (model, metadata_dict) or (None, None) if not found.
    """
    agent_zip = AGENT_PATH + ".zip"
    if not os.path.exists(agent_zip):
        # Try best_model saved by EvalCallback
        best = os.path.join(SAVE_DIR, "best_model.zip")
        if os.path.exists(best):
            agent_zip = best
        else:
            print("[RL] No saved agent found — AI comparison will use heuristic baseline.")
            return None, None

    from stable_baselines3 import PPO
    model = PPO.load(agent_zip)
    print(f"[RL] Agent loaded from {agent_zip}")

    meta = {}
    if os.path.exists(LOG_PATH):
        with open(LOG_PATH) as f:
            meta = json.load(f)
    return model, meta


def get_rl_recommendation(model, game) -> list:
    """
    Given a loaded RL model and current game, return a list of recommended actions.
    Returns: [{"node_id": int, "action": str, "reason": str}, ...]
    """
    if model is None:
        return []

    env = CivilAIEnv.__new__(CivilAIEnv)
    env.game     = game
    env._at_risk = []
    obs = env._get_obs()

    action_int, _ = model.predict(obs, deterministic=True)
    node_idx    = int(action_int) // ACTION_SPACE_K
    action_type = int(action_int) % ACTION_SPACE_K

    act_map = {0: "skip", 1: "repair", 2: "upgrade", 3: "emergency"}
    at_risk = env._at_risk

    if node_idx < len(at_risk) and action_type > 0:
        nid  = at_risk[node_idx]
        node = game.nodes[nid]
        return [{
            "node_id":  nid,
            "action":   act_map[action_type],
            "layer":    node.layer,
            "health":   round(node.health, 1),
            "reason":   f"RL agent prioritises {act_map[action_type]} (health {node.health:.0f}%)",
        }]
    return []


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CivilAI RL Agent")
    parser.add_argument("--steps",     type=int, default=500_000)
    parser.add_argument("--eval-only", action="store_true")
    args = parser.parse_args()

    if args.eval_only:
        model, _ = load_rl_agent()
        if model:
            mean_r, std_r = evaluate_agent(model, n_episodes=20)
            print(f"Mean reward: {mean_r:.2f} ± {std_r:.2f}")
    else:
        train(total_steps=args.steps)
