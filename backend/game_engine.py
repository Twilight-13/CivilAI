"""
CIVILAI 2.0 - Simplified Game Engine
Easy to understand city infrastructure management
"""

import random
import math
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict


@dataclass
class Building:
    """Represents a building in the city"""
    id: int
    type: str  # residential, commercial, hospital, police, fire_station
    x: float
    y: float
    z: float
    population: int = 0


@dataclass
class InfraNode:
    """Simplified infrastructure node"""
    id: int
    layer: str  # water, power, road, drainage
    x: float
    y: float
    z: float
    health: float = 100.0  # 0-100 (simple percentage)
    age: int = 0
    connected_to: List[int] = None
    serving_buildings: List[int] = None
    is_critical: bool = False
    last_maintained: int = 0
    
    def __post_init__(self):
        if self.connected_to is None:
            self.connected_to = []
        if self.serving_buildings is None:
            self.serving_buildings = []


class CityGame:
    """Main game engine with simplified mechanics"""
    
    DIFFICULTY_SETTINGS = {
        'easy': {
            'budget': 2000000,
            'budget_per_turn': 100000,
            'degradation_rate': 0.5,
            'failure_threshold': 20,
            'cascade_chance': 0.2
        },
        'normal': {
            'budget': 1000000,
            'budget_per_turn': 50000,
            'degradation_rate': 1.0,
            'failure_threshold': 30,
            'cascade_chance': 0.4
        },
        'hard': {
            'budget': 500000,
            'budget_per_turn': 30000,
            'degradation_rate': 1.5,
            'failure_threshold': 40,
            'cascade_chance': 0.6
        }
    }
    
    ACTION_COSTS = {
        'inspect': 500,
        'repair': 5000,
        'upgrade': 20000,
        'emergency': 10000
    }
    
    def __init__(self, difficulty='normal'):
        """Initialize the game"""
        self.difficulty = difficulty
        self.settings = self.DIFFICULTY_SETTINGS[difficulty]
        
        self.time_step = 0
        self.budget = self.settings['budget']
        self.score = 0
        
        self.buildings: List[Building] = []
        self.nodes: Dict[int, InfraNode] = {}
        self.failures: List[Dict] = []
        self.actions_history: List[Dict] = []
        
        self._generate_city()
    
    def _generate_city(self):
        """Generate a beautiful 3D city"""
        # Create city grid (10x10 blocks)
        grid_size = 10
        block_spacing = 20
        
        building_id = 0
        node_id = 0
        
        # Generate buildings
        building_types = ['residential', 'commercial', 'hospital', 'police', 'fire_station']
        
        for i in range(grid_size):
            for j in range(grid_size):
                x = i * block_spacing - (grid_size * block_spacing) / 2
                y = j * block_spacing - (grid_size * block_spacing) / 2
                z = random.uniform(10, 50)  # Building height
                
                # Special buildings at specific locations
                if i == 5 and j == 5:
                    btype = 'hospital'
                elif i == 2 and j == 2:
                    btype = 'police'
                elif i == 8 and j == 8:
                    btype = 'fire_station'
                else:
                    btype = random.choice(['residential', 'residential', 'commercial'])
                
                building = Building(
                    id=building_id,
                    type=btype,
                    x=x,
                    y=y,
                    z=z,
                    population=random.randint(100, 1000) if btype == 'residential' else 0
                )
                
                self.buildings.append(building)
                building_id += 1
        
        # Generate infrastructure nodes for each layer
        layers = ['water', 'power', 'road', 'drainage']
        
        for layer in layers:
            layer_nodes = self._generate_layer_network(layer, node_id)
            for node in layer_nodes:
                self.nodes[node.id] = node
            node_id += len(layer_nodes)
        
        # Connect nodes to buildings
        self._connect_infrastructure_to_buildings()
        
        print(f"✅ City generated: {len(self.buildings)} buildings, {len(self.nodes)} infrastructure nodes")
    
    def _generate_layer_network(self, layer: str, start_id: int) -> List[InfraNode]:
        """Generate nodes for a specific infrastructure layer"""
        nodes = []
        grid_size = 10
        spacing = 20
        
        # Different patterns for different layers
        if layer == 'road':
            # Roads form a grid
            node_id = start_id
            for i in range(grid_size + 1):
                for j in range(grid_size + 1):
                    x = i * spacing - (grid_size * spacing) / 2
                    y = j * spacing - (grid_size * spacing) / 2
                    
                    node = InfraNode(
                        id=node_id,
                        layer=layer,
                        x=x,
                        y=y,
                        z=0,
                        health=random.uniform(60, 100),
                        age=random.randint(0, 30)
                    )
                    nodes.append(node)
                    node_id += 1
        
        else:
            # Water, power, drainage: scattered but covering city
            num_nodes = 25
            for i in range(num_nodes):
                x = random.uniform(-100, 100)
                y = random.uniform(-100, 100)
                z = -5 if layer == 'drainage' else 0
                
                node = InfraNode(
                    id=start_id + i,
                    layer=layer,
                    x=x,
                    y=y,
                    z=z,
                    health=random.uniform(60, 100),
                    age=random.randint(0, 50),
                    is_critical=random.random() < 0.1
                )
                nodes.append(node)
        
        # Connect nearby nodes
        for i, node_a in enumerate(nodes):
            for node_b in nodes[i+1:]:
                distance = math.sqrt(
                    (node_a.x - node_b.x)**2 + 
                    (node_a.y - node_b.y)**2
                )
                if distance < 40:  # Connect if close enough
                    node_a.connected_to.append(node_b.id)
                    node_b.connected_to.append(node_a.id)
        
        return nodes
    
    def _connect_infrastructure_to_buildings(self):
        """Link infrastructure nodes to buildings they serve"""
        for building in self.buildings:
            for node in self.nodes.values():
                distance = math.sqrt(
                    (building.x - node.x)**2 + 
                    (building.y - node.y)**2
                )
                if distance < 30:  # Building is served by this node
                    node.serving_buildings.append(building.id)
    
    def step(self) -> Dict:
        """Advance game by one time step"""
        self.time_step += 1
        self.budget += self.settings['budget_per_turn']
        
        # Degrade all nodes
        degraded = []
        failed = []
        
        for node in self.nodes.values():
            # Age the node
            node.age += 1
            
            # Degradation formula (simplified)
            degradation = self.settings['degradation_rate']
            degradation *= (1 + node.age / 100)  # Age factor
            degradation *= random.uniform(0.8, 1.2)  # Randomness
            
            if node.is_critical:
                degradation *= 1.5  # Critical nodes degrade faster
            
            node.health = max(0, node.health - degradation)
            
            if node.health <= 0:
                failed.append(node.id)
                degraded.append(node.id)
            elif node.health < self.settings['failure_threshold']:
                degraded.append(node.id)
        
        # Cascading failures
        cascaded = self._handle_cascades(failed)
        all_failed = failed + cascaded
        
        # Calculate costs
        failure_cost = len(all_failed) * 50000
        if all_failed:
            failure_cost *= (1.5 ** (len(all_failed) - 1))  # Exponential penalty
        
        # Only deduct if we have money, otherwise set to 0
        if self.budget >= failure_cost:
            self.budget -= failure_cost
        else:
            self.budget = 0  # Can't go negative
        
        self.score -= len(all_failed) * 100
        
        # Record failures
        if all_failed:
            self.failures.append({
                'time': self.time_step,
                'nodes': all_failed,
                'cost': failure_cost
            })
        
        # Check game over
        game_over = self.budget <= 0 and len(all_failed) > 0
        
        return {
            'time_step': self.time_step,
            'budget': self.budget,
            'score': self.score,
            'failed_nodes': all_failed,
            'degraded_nodes': degraded,
            'failure_cost': failure_cost,
            'game_over': game_over
        }
    
    def _handle_cascades(self, failed_nodes: List[int]) -> List[int]:
        """Handle cascading failures"""
        cascaded = []
        
        for node_id in failed_nodes:
            node = self.nodes[node_id]
            
            for connected_id in node.connected_to:
                if connected_id not in failed_nodes and connected_id not in cascaded:
                    if random.random() < self.settings['cascade_chance']:
                        cascaded.append(connected_id)
                        self.nodes[connected_id].health = 0
        
        return cascaded
    
    def execute_action(self, action: str, node_id: int) -> Dict:
        """Execute a player action"""
        if node_id not in self.nodes:
            return {'success': False, 'message': 'Invalid node'}
        
        cost = self.ACTION_COSTS.get(action, 0)
        
        if self.budget < cost:
            return {
                'success': False, 
                'message': f'Insufficient budget! Need ${cost:,} but only have ${self.budget:,}'
            }
        
        node = self.nodes[node_id]
        self.budget -= cost
        
        if action == 'repair':
            node.health = min(100, node.health + 30)
            node.last_maintained = self.time_step
            message = f"Repaired node {node_id} (+30% health)"
        
        elif action == 'upgrade':
            node.health = 100
            node.age = max(0, node.age - 10)
            node.last_maintained = self.time_step
            message = f"Upgraded node {node_id} (full restoration)"
        
        elif action == 'emergency':
            node.health = min(100, node.health + 50)
            message = f"Emergency fix on node {node_id} (+50% health)"
        
        else:
            self.budget += cost  # Refund if unknown action
            return {'success': False, 'message': 'Unknown action'}
        
        self.actions_history.append({
            'time': self.time_step,
            'action': action,
            'node_id': node_id,
            'cost': cost
        })
        
        self.score += 10  # Small reward for action
        
        return {
            'success': True,
            'message': message,
            'cost': cost,
            'new_health': node.health,
            'budget_remaining': self.budget
        }
    
    def inspect_node(self, node_id: int) -> Dict:
        """Inspect a node (free action, reveals info)"""
        if node_id not in self.nodes:
            return {'success': False, 'message': 'Invalid node'}
        
        node = self.nodes[node_id]
        
        return {
            'success': True,
            'node': {
                'id': node.id,
                'layer': node.layer,
                'health': round(node.health, 1),
                'age': node.age,
                'is_critical': node.is_critical,
                'connected_to': node.connected_to,
                'serving_buildings': len(node.serving_buildings),
                'last_maintained': node.last_maintained
            }
        }
    
    def get_ai_predictions(self) -> Dict:
        """Simple AI predictions based on node health"""
        at_risk = []
        
        for node_id, node in self.nodes.items():
            risk_score = 100 - node.health
            risk_score += node.age / 2
            risk_score += len(node.connected_to) * 2
            
            if node.is_critical:
                risk_score *= 1.5
            
            if risk_score > 50:
                at_risk.append({
                    'node_id': node_id,
                    'layer': node.layer,
                    'risk_score': min(100, risk_score),
                    'health': node.health
                })
        
        at_risk.sort(key=lambda x: x['risk_score'], reverse=True)
        
        return {'predictions': at_risk[:10]}
    
    def get_recommendations(self) -> Dict:
        """Get AI action recommendations"""
        recommendations = []
        
        # Top 5 worst nodes
        worst_nodes = sorted(
            self.nodes.items(),
            key=lambda x: x[1].health
        )[:5]
        
        for node_id, node in worst_nodes:
            if node.health < 30:
                action = 'upgrade'
            elif node.health < 60:
                action = 'repair'
            else:
                continue
            
            recommendations.append({
                'node_id': node_id,
                'layer': node.layer,
                'action': action,
                'cost': self.ACTION_COSTS[action],
                'reason': f"Health at {node.health:.1f}%"
            })
        
        return {'recommendations': recommendations}
    
    def get_layer_nodes(self, layer_name: str) -> List[Dict]:
        """Get all nodes for a specific layer"""
        layer_nodes = [
            {
                'id': node.id,
                'x': node.x,
                'y': node.y,
                'z': node.z,
                'health': node.health,
                'age': node.age,
                'is_critical': node.is_critical,
                'connected_to': node.connected_to
            }
            for node in self.nodes.values()
            if node.layer == layer_name
        ]
        
        return layer_nodes
    
    def get_statistics(self) -> Dict:
        """Get game statistics"""
        total_health = sum(n.health for n in self.nodes.values())
        avg_health = total_health / len(self.nodes) if self.nodes else 0
        
        critical_nodes = sum(1 for n in self.nodes.values() if n.health < 30)
        warning_nodes = sum(1 for n in self.nodes.values() if 30 <= n.health < 60)
        healthy_nodes = sum(1 for n in self.nodes.values() if n.health >= 60)
        
        return {
            'avg_health': round(avg_health, 1),
            'critical_nodes': critical_nodes,
            'warning_nodes': warning_nodes,
            'healthy_nodes': healthy_nodes,
            'total_failures': sum(len(f['nodes']) for f in self.failures),
            'total_actions': len(self.actions_history)
        }
    
    def get_full_state(self) -> Dict:
        """Get complete game state for frontend"""
        return {
            'time_step': self.time_step,
            'budget': self.budget,
            'score': self.score,
            'buildings': [asdict(b) for b in self.buildings],
            'nodes': {
                nid: {
                    'id': n.id,
                    'layer': n.layer,
                    'x': n.x,
                    'y': n.y,
                    'z': n.z,
                    'health': round(n.health, 1),
                    'age': n.age,
                    'is_critical': n.is_critical,
                    'connected_to': n.connected_to,
                    'serving_buildings': len(n.serving_buildings)
                }
                for nid, n in self.nodes.items()
            },
            'stats': self.get_statistics(),
            'recent_failures': self.failures[-5:] if self.failures else []
        }
