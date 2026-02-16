import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';

// Building component
function Building({ data, dimmed }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    switch (data.type) {
      case 'hospital': return '#e74c3c';
      case 'police': return '#3498db';
      case 'fire_station': return '#e67e22';
      case 'commercial': return '#95a5a6';
      case 'residential': return '#ecf0f1';
      default: return '#bdc3c7';
    }
  }, [data.type]);

  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y = data.z + Math.sin(Date.now() * 0.003) * 0.5;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[data.x, data.z / 2, data.y]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[8, data.z, 8]} />
      <meshStandardMaterial 
        color={color}
        opacity={dimmed ? 0.3 : 1}
        transparent={dimmed}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
    </mesh>
  );
}

// Infrastructure Node component
function InfraNode({ data, onClick, isSelected, visible }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => {
    if (data.health >= 60) return '#2ecc71'; // Healthy
    if (data.health >= 30) return '#f39c12'; // Warning
    return '#e74c3c'; // Critical
  }, [data.health]);

  const layerColor = useMemo(() => {
    switch (data.layer) {
      case 'water': return '#3498db';
      case 'power': return '#f1c40f';
      case 'road': return '#95a5a6';
      case 'drainage': return '#1abc9c';
      default: return '#ffffff';
    }
  }, [data.layer]);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulse effect for critical nodes
      if (data.health < 30) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        meshRef.current.scale.setScalar(scale);
      }
      
      // Float effect when selected
      if (isSelected) {
        meshRef.current.position.y = data.z + Math.sin(state.clock.elapsedTime * 2) * 2;
      }
    }
  });

  if (!visible) return null;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[data.x, data.z + 2, data.y]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(data.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[isSelected ? 2 : 1.5, 16, 16]} />
        <meshStandardMaterial 
          color={isSelected || hovered ? layerColor : color}
          emissive={layerColor}
          emissiveIntensity={isSelected || hovered ? 0.8 : data.health < 30 ? 0.5 : 0.2}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Health indicator ring */}
      <mesh 
        position={[data.x, data.z + 0.5, data.y]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[2, 2.5, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Critical node warning */}
      {data.is_critical && (
        <mesh position={[data.x, data.z + 4, data.y]}>
          <coneGeometry args={[0.5, 1, 4]} />
          <meshStandardMaterial 
            color="#e74c3c"
            emissive="#e74c3c"
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

// Connection lines between nodes
function NodeConnections({ nodes, activeLayers }) {
  const connections = useMemo(() => {
    const lines = [];
    
    Object.values(nodes).forEach(node => {
      if (!activeLayers[node.layer]) return;
      
      node.connected_to.forEach(targetId => {
        const target = nodes[targetId];
        if (!target || !activeLayers[target.layer]) return;
        
        lines.push({
          start: [node.x, node.z, node.y],
          end: [target.x, target.z, target.y],
          layer: node.layer
        });
      });
    });
    
    return lines;
  }, [nodes, activeLayers]);

  return (
    <>
      {connections.map((conn, idx) => {
        const points = [
          new THREE.Vector3(...conn.start),
          new THREE.Vector3(...conn.end)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const color = conn.layer === 'water' ? '#3498db' :
                     conn.layer === 'power' ? '#f1c40f' :
                     conn.layer === 'road' ? '#95a5a6' : '#1abc9c';
        
        return (
          <line key={idx} geometry={geometry}>
            <lineBasicMaterial 
              color={color}
              opacity={0.4}
              transparent
            />
          </line>
        );
      })}
    </>
  );
}

// Ground plane
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[300, 300]} />
      <meshStandardMaterial 
        color="#27ae60"
        roughness={0.8}
      />
    </mesh>
  );
}

// Main CityView component
export default function CityView({ gameState, activeLayers, selectedNode, onNodeClick }) {
  if (!gameState) {
    return (
      <div className="city-view loading">
        <h2>Loading city...</h2>
      </div>
    );
  }

  const { buildings, nodes } = gameState;

  return (
    <div className="city-view">
      <Canvas shadows>
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[80, 60, 80]} fov={60} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={20}
          maxDistance={200}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 100, 50]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-50, 50, -50]} intensity={0.5} />

        {/* Environment */}
        <Sky 
          distance={450000}
          sunPosition={[100, 50, 100]}
          inclination={0.6}
          azimuth={0.25}
        />
        <Environment preset="city" />

        {/* Ground */}
        <Ground />

        {/* Buildings */}
        {buildings.map(building => (
          <Building 
            key={building.id}
            data={building}
            dimmed={!activeLayers.buildings}
          />
        ))}

        {/* Infrastructure Nodes */}
        {Object.values(nodes).map(node => (
          <InfraNode 
            key={node.id}
            data={node}
            onClick={onNodeClick}
            isSelected={selectedNode === node.id}
            visible={activeLayers[node.layer]}
          />
        ))}

        {/* Node Connections */}
        <NodeConnections 
          nodes={nodes}
          activeLayers={activeLayers}
        />
      </Canvas>

      {/* Camera controls hint */}
      <div className="controls-hint">
        <p>🖱️ Left Click + Drag: Rotate</p>
        <p>🖱️ Right Click + Drag: Pan</p>
        <p>🖱️ Scroll: Zoom</p>
        <p>🖱️ Click Node: Inspect</p>
      </div>
    </div>
  );
}
