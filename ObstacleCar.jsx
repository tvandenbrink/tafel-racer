import React from "react";

function ObstacleCar({ lane, laneX, z, colorIndex = 0 }) {
  // Simplified alternating color palette - 5 distinct colors
  const colors = [
    "#2c3e50", // Dark blue-gray
    "#e74c3c", // Red
    "#3498db", // Blue
    "#27ae60", // Green
    "#f39c12", // Orange
  ];
  
  // Use the provided colorIndex to ensure consistent color
  const carColor = colors[colorIndex % colors.length];
  const roofColor = carColor === "#f39c12" ? "#e67e22" : carColor; // Slightly darker orange roof

  return (
    <group position={[laneX(lane), -0.4, z]}>
      {/* Main car body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.4, 0.6, 2.2]} />
        <meshStandardMaterial color={carColor} metalness={0.2} roughness={0.6} />
      </mesh>
      
      {/* Car roof/cabin */}
      <mesh position={[0, 0.9, -0.2]} castShadow>
        <boxGeometry args={[1.2, 0.5, 1.4]} />
        <meshStandardMaterial color={roofColor} metalness={0.1} roughness={0.7} />
      </mesh>
      
      {/* Front bumper */}
      <mesh position={[0, 0.25, 1.2]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Rear bumper */}
      <mesh position={[0, 0.25, -1.2]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Front grille */}
      <mesh position={[0.5, 0.35, 1.15]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.1]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[-0.5, 0.35, 1.15]} castShadow>
        <boxGeometry args={[0.25, 0.15, 0.1]} />
        <meshStandardMaterial color="#f8f9fa" emissive="#ffffff" emissiveIntensity={0.1} />
      </mesh>
      
      {/* Rear lights */}
      <mesh position={[0.5, 0.35, -1.15]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.1]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[-0.5, 0.35, -1.15]} castShadow>
        <boxGeometry args={[0.2, 0.12, 0.1]} />
        <meshStandardMaterial color="#dc3545" emissive="#ff0000" emissiveIntensity={0.05} />
      </mesh>
      
      {/* Windshield */}
      <mesh position={[0, 0.85, 0.4]} castShadow>
        <boxGeometry args={[1.1, 0.4, 0.05]} />
        <meshStandardMaterial color="#17a2b8" transparent opacity={0.6} />
      </mesh>
      
      {/* Rear window */}
      <mesh position={[0, 0.85, -0.8]} castShadow>
        <boxGeometry args={[1.1, 0.35, 0.05]} />
        <meshStandardMaterial color="#17a2b8" transparent opacity={0.6} />
      </mesh>
      
      {/* Side mirrors */}
      <mesh position={[0.75, 0.75, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[-0.75, 0.75, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      
      {/* Wheels - front */}
      <mesh position={[0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Wheels - rear */}
      <mesh position={[0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.15, 8]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      
      {/* Wheel rims - front */}
      <mesh position={[0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      <mesh position={[-0.6, 0.15, 0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      
      {/* Wheel rims - rear */}
      <mesh position={[0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      <mesh position={[-0.6, 0.15, -0.8]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
        <meshStandardMaterial color="#6c757d" />
      </mesh>
      
      {/* License plate */}
      <mesh position={[0, 0.25, 1.32]} castShadow>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* Exhaust pipe */}
      <mesh position={[0.4, 0.08, -1.35]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Side skirts */}
      <mesh position={[0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
      <mesh position={[-0.82, 0.15, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 2.0]} />
        <meshStandardMaterial color="#c0392b" metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
}

export default ObstacleCar;
