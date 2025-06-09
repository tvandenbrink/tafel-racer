import React, { useRef, useState, useEffect } from "react"; // Removed useMemo, added useEffect
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Car({ lane, laneX, lanes, invincible }) {
  const groupRef = useRef(); // Changed ref name for clarity
  const [wiggle, setWiggle] = useState(0);

  // Store initial opacities
  const initialOpacities = useRef(new Map()).current;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((object) => {
        if (object.isMesh && object.material) {
          if (!initialOpacities.has(object.uuid)) {
            initialOpacities.set(object.uuid, object.material.opacity);
          }
          // Ensure materials are set to transparent for opacity changes
          object.material.transparent = true;
        }
      });
    }
  }, [initialOpacities]);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      if (invincible) {
        setWiggle((w) => w + delta * 16);
        const newOpacity = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 80));
        groupRef.current.traverse((object) => {
          if (object.isMesh && object.material) {
            object.material.opacity = newOpacity;
          }
        });
        groupRef.current.rotation.z = 0.15 * Math.sin(wiggle);
      } else {
        setWiggle(0);
        groupRef.current.traverse((object) => {
          if (object.isMesh && object.material) {
            // Restore initial opacity, ensuring it's not undefined
            const initialOpacity = initialOpacities.get(object.uuid);
            object.material.opacity = typeof initialOpacity === 'number' ? initialOpacity : 1;
          }
        });
        groupRef.current.rotation.z = 0;
      }
    }
  });

  const sportsCarRed = "#D32F2F";
  const darkerRed = "#B71C1C"; 
  const glassColor = "#AABBC3";
  const tireRubber = "#1A1A1A";
  const wheelRimColor = "#B0BEC5"; // Lighter rim color
  const brakeDiscColor = "#546E7A";
  const headlightColor = "#FFFDE7"; // Slightly warmer white
  const taillightColor = "#EF5350"; // Brighter red for taillight
  const exhaustColor = "#78909C";

  const wheelRadius = 0.3;
  const carBodyWidth = 0.95;
  const carBodyHeight = 0.35;
  const carBodyLength = 2.1;

  // Material props
  const carPaintMaterial = { color: sportsCarRed, metalness: 0.4, roughness: 0.3 };
  const carAccentMaterial = { color: darkerRed, metalness: 0.3, roughness: 0.4 };
  const glassMaterial = { color: glassColor, transparent: true, opacity: 0.5, roughness: 0.1 };
  const tireMaterial = { color: tireRubber, roughness: 0.8 };
  const rimMaterial = { color: wheelRimColor, metalness: 0.9, roughness: 0.25 };
  const brakeDiscMaterial = { color: brakeDiscColor, metalness: 0.7, roughness: 0.5 };
  const headlightMaterial = { color: headlightColor, emissive: headlightColor, emissiveIntensity: 0.6 };
  const taillightMaterial = { color: taillightColor, emissive: taillightColor, emissiveIntensity: 0.5 };


  return (
    <group ref={groupRef} position={[laneX(lane), wheelRadius, 0]}>
      {/* --- Body --- */}
      {/* Hood Section (tapered) */}
      <mesh position={[0, 0.18, 0.65]}>
        <boxGeometry args={[carBodyWidth * 0.9, carBodyHeight * 0.85, carBodyLength * 0.4]} />
        <meshStandardMaterial {...carPaintMaterial} />
      </mesh>
      {/* Main Mid Body Section */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[carBodyWidth, carBodyHeight, carBodyLength * 0.5]} />
        <meshStandardMaterial {...carPaintMaterial} />
      </mesh>
      {/* Rear Section */}
      <mesh position={[0, 0.22, -0.75]}>
        <boxGeometry args={[carBodyWidth * 0.95, carBodyHeight * 0.9, carBodyLength * 0.3]} />
        <meshStandardMaterial {...carPaintMaterial} />
      </mesh>

      {/* --- Cabin --- */}
      <mesh position={[0, carBodyHeight + 0.02 + 0.175, -0.15]}> {/* Positioned on top of main body */}
        <boxGeometry args={[carBodyWidth * 0.75, 0.35, 0.8]} /> {/* Slightly tapered width */}
        <meshStandardMaterial {...carPaintMaterial} />
      </mesh>

      {/* --- Windows --- */}
      {/* Windshield */}
      <mesh position={[0, carBodyHeight + 0.25, 0.20]} rotation={[-Math.PI / 6.5, 0, 0]}>
        <boxGeometry args={[carBodyWidth * 0.7, 0.02, 0.45]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      {/* Rear Window */}
      <mesh position={[0, carBodyHeight + 0.25, -0.48]} rotation={[Math.PI / 7, 0, 0]}>
        <boxGeometry args={[carBodyWidth * 0.65, 0.02, 0.35]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      {/* Side Windows */}
      <mesh position={[-carBodyWidth * 0.37, carBodyHeight + 0.2, -0.15]} rotation={[0, Math.PI / 22, 0]}>
        <boxGeometry args={[0.02, 0.3, 0.33]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      <mesh position={[carBodyWidth * 0.37, carBodyHeight + 0.2, -0.15]} rotation={[0, -Math.PI / 22, 0]}>
        <boxGeometry args={[0.02, 0.3, 0.33]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      
      {/* --- Wheels --- */}
      { [
        { x: -carBodyWidth / 2 + 0.05, z: carBodyLength / 2 * 0.7, name: "FL" },
        { x: carBodyWidth / 2 - 0.05, z: carBodyLength / 2 * 0.7, name: "FR" },
        { x: -carBodyWidth / 2 + 0.05, z: -carBodyLength / 2 * 0.75, name: "RL" },
        { x: carBodyWidth / 2 - 0.05, z: -carBodyLength / 2 * 0.75, name: "RR" },
      ].map((pos) => (
        <group key={pos.name} position={[pos.x, 0, pos.z]} >
          {/* Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.18, 24]} />
            <meshStandardMaterial {...tireMaterial} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius * 0.75, wheelRadius * 0.7, 0.20, 20]} />
            <meshStandardMaterial {...rimMaterial} />
          </mesh>
          {/* Brake Disc (subtle) */}
           <mesh rotation={[0, 0, Math.PI / 2]} position={[0, (pos.name.startsWith("F") ? 0.015 : -0.015) ,0]}> {/* Slightly offset for visibility */}
            <cylinderGeometry args={[wheelRadius * 0.55, wheelRadius * 0.55, 0.03, 16]} />
            <meshStandardMaterial {...brakeDiscMaterial} />
          </mesh>
        </group>
      ))}

      {/* --- Accessories --- */}
      {/* Spoiler */}
      <mesh position={[0, carBodyHeight + 0.05, -carBodyLength / 2 + 0.05]}>
        <boxGeometry args={[carBodyWidth * 0.9, 0.06, 0.25]} />
        <meshStandardMaterial {...carAccentMaterial} />
      </mesh>
      <mesh position={[-0.3, carBodyHeight + 0.02, -carBodyLength / 2 + 0.05]}>
        <boxGeometry args={[0.05, 0.04, 0.05]} />
        <meshStandardMaterial {...carAccentMaterial} />
      </mesh>
      <mesh position={[0.3, carBodyHeight + 0.02, -carBodyLength / 2 + 0.05]}>
        <boxGeometry args={[0.05, 0.04, 0.05]} />
        <meshStandardMaterial {...carAccentMaterial} />
      </mesh>

      {/* Headlights */}
      <mesh position={[-carBodyWidth * 0.3, 0.2, carBodyLength / 2 - 0.02]} rotation={[0, -Math.PI/32, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.04]} />
        <meshStandardMaterial {...headlightMaterial}/>
      </mesh>
      <mesh position={[carBodyWidth * 0.3, 0.2, carBodyLength / 2 - 0.02]} rotation={[0, Math.PI/32, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.04]} />
        <meshStandardMaterial {...headlightMaterial}/>
      </mesh>

      {/* Taillights */}
      <mesh position={[-carBodyWidth * 0.3, 0.25, -carBodyLength / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.08, 0.03]} />
        <meshStandardMaterial {...taillightMaterial} />
      </mesh>
      <mesh position={[carBodyWidth * 0.3, 0.25, -carBodyLength / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.08, 0.03]} />
        <meshStandardMaterial {...taillightMaterial} />
      </mesh>

      {/* Side Mirrors */}
      <mesh position={[-carBodyWidth/2 - 0.01, carBodyHeight + 0.1, 0.1]}>
        <boxGeometry args={[0.03, 0.08, 0.12]} />
        <meshStandardMaterial {...carAccentMaterial} />
      </mesh>
      <mesh position={[carBodyWidth/2 + 0.01, carBodyHeight + 0.1, 0.1]}>
        <boxGeometry args={[0.03, 0.08, 0.12]} />
        <meshStandardMaterial {...carAccentMaterial} />
      </mesh>

      {/* Exhaust Pipes */}
      <mesh position={[-carBodyWidth * 0.25, 0.05, -carBodyLength/2 - 0.01]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
        <meshStandardMaterial color={exhaustColor} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[carBodyWidth * 0.25, 0.05, -carBodyLength/2 - 0.01]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 12]} />
        <meshStandardMaterial color={exhaustColor} metalness={0.8} roughness={0.3} />
      </mesh>

    </group>
  );
}

export default Car;
