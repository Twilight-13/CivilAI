import axios from 'axios';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class GameService {
  constructor() {
    this.socket = null;
    this.stateUpdateCallback = null;
    this.timeAdvancedCallback = null;
  }

  // Initialize WebSocket connection
  connect() {
    if (!this.socket) {
      this.socket = io(API_BASE_URL);

      this.socket.on('connect', () => {
        console.log('✅ Connected to game server');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from game server');
      });

      this.socket.on('state_update', (state) => {
        if (this.stateUpdateCallback) {
          this.stateUpdateCallback(state);
        }
      });

      this.socket.on('time_advanced', (result) => {
        if (this.timeAdvancedCallback) {
          this.timeAdvancedCallback(result);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  onStateUpdate(callback) {
    this.stateUpdateCallback = callback;
    this.connect();
  }

  onTimeAdvanced(callback) {
    this.timeAdvancedCallback = callback;
  }

  // API calls
  async initGame(difficulty = 'normal') {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/init`, {
        difficulty
      });
      this.connect();
      return response.data;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }

  async getState() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/state`);
      return response.data;
    } catch (error) {
      console.error('Failed to get state:', error);
      throw error;
    }
  }

  async performAction(action, nodeId) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/action`, {
        action,
        nodeId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to perform action:', error);
      throw error;
    }
  }

  async inspectNode(nodeId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/inspect/${nodeId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to inspect node:', error);
      throw error;
    }
  }

  async advanceTime() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/advance`);
      return response.data;
    } catch (error) {
      console.error('Failed to advance time:', error);
      throw error;
    }
  }

  async toggleAutoAdvance() {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/toggle-auto`);
      return response.data;
    } catch (error) {
      console.error('Failed to toggle auto-advance:', error);
      throw error;
    }
  }

  async getPredictions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/predictions`);
      return response.data;
    } catch (error) {
      console.error('Failed to get predictions:', error);
      throw error;
    }
  }

  async getRecommendations() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/recommendations`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  async getLayerNodes(layerName) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/layers/${layerName}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get layer nodes:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw error;
    }
  }

  requestState() {
    if (this.socket) {
      this.socket.emit('request_state');
    }
  }
}

export const gameService = new GameService();
