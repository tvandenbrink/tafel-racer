import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

function Car({ lane, laneX, lanes, invincible }) {
  const groupRef = useRef();
  const [wiggle, setWiggle] = useState(0);
  const wheelRotation = useRef(0);
  const initialOpacities = useRef(new Map()).current;

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((object) => {
        if (object.isMesh && object.material) {
          if (!initialOpacities.has(object.uuid)) {
            initialOpacities.set(object.uuid, object.material.opacity);
          }
          object.material.transparent = true;
        }
      });
    }
  }, [initialOpacities]);

  useFrame((_, delta) => {
    wheelRotation.current += delta * 12;

    if (groupRef.current) {
      if (invincible) {
        setWiggle((w) => w + delta * 16);
        const newOpacity = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 80));
        groupRef.current.traverse((object) => {
          if (object.isMesh && object.material) {
            object.material.opacity = newOpacity;
          }
        });
        groupRef.current.rotation.z = 0.12 * Math.sin(wiggle);
      } else {
        setWiggle(0);
        groupRef.current.traverse((object) => {
          if (object.isMesh && object.material) {
            const initialOpacity = initialOpacities.get(object.uuid);
            object.material.opacity = typeof initialOpacity === 'number' ? initialOpacity : 1;
          }
        });
        groupRef.current.rotation.z = 0;
      }
    }
  });

  // Fun cartoon car colors
  const mainColor = "#FF4757";      // Bright red
  const accentColor = "#FF6B81";    // Light red/pink
  const roofColor = "#2ED573";      // Fun green roof
  const glassColor = "#70A1FF";     // Sky blue glass
  const wheelColor = "#2F3542";     // Dark wheels
  const rimColor = "#FFA502";       // Orange rims
  const bumperColor = "#ECCC68";    // Yellow bumper
  const eyeWhite = "#FFFFFF";
  const eyePupil = "#2F3542";

  return (
    <group ref={groupRef} position={[laneX(lane), 0.3, 0]}>
      {/* Main body - rounded cartoon look using spheres and boxes */}
      {/* Lower body */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.1, 0.35, 2.2]} />
        <meshStandardMaterial color={mainColor} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Body top curve (front) */}
      <mesh position={[0, 0.25, 0.5]}>
        <sphereGeometry args={[0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Hood */}
      <mesh position={[0, 0.18, 0.65]}>
        <boxGeometry args={[0.95, 0.28, 0.7]} />
        <meshStandardMaterial color={mainColor} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Cabin / Roof - green for fun! */}
      <mesh position={[0, 0.55, -0.1]}>
        <boxGeometry args={[0.85, 0.35, 0.9]} />
        <meshStandardMaterial color={roofColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Roof rounded top */}
      <mesh position={[0, 0.72, -0.1]}>
        <boxGeometry args={[0.75, 0.05, 0.8]} />
        <meshStandardMaterial color={roofColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.52, 0.32]} rotation={[-Math.PI / 5, 0, 0]}>
        <boxGeometry args={[0.78, 0.02, 0.48]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.6} roughness={0.1} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.52, -0.5]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.72, 0.02, 0.38]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.6} roughness={0.1} />
      </mesh>

      {/* Side windows */}
      <mesh position={[-0.43, 0.52, -0.1]}>
        <boxGeometry args={[0.02, 0.28, 0.5]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.43, 0.52, -0.1]}>
        <boxGeometry args={[0.02, 0.28, 0.5]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.5} />
      </mesh>

      {/* === CARTOON EYES on windshield === */}
      {/* Left eye white */}
      <mesh position={[-0.18, 0.46, 0.53]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      {/* Left eye pupil */}
      <mesh position={[-0.18, 0.48, 0.64]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color={eyePupil} />
      </mesh>
      {/* Right eye white */}
      <mesh position={[0.18, 0.46, 0.53]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      {/* Right eye pupil */}
      <mesh position={[0.18, 0.48, 0.64]}>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color={eyePupil} />
      </mesh>

      {/* Smile (curved bumper) */}
      <mesh position={[0, 0.12, 1.05]}>
        <boxGeometry args={[0.5, 0.08, 0.08]} />
        <meshStandardMaterial color={bumperColor} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[0, 0.08, 1.0]}>
        <boxGeometry args={[1.0, 0.15, 0.2]} />
        <meshStandardMaterial color={bumperColor} />
      </mesh>

      {/* Rear bumper */}
      <mesh position={[0, 0.08, -1.05]}>
        <boxGeometry args={[0.95, 0.15, 0.15]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>

      {/* Headlights - big and friendly */}
      <mesh position={[-0.35, 0.22, 1.08]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#FFF59D" emissive="#FFF59D" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.35, 0.22, 1.08]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#FFF59D" emissive="#FFF59D" emissiveIntensity={0.8} />
      </mesh>

      {/* Taillights */}
      <mesh position={[-0.35, 0.22, -1.1]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#FF4757" emissive="#FF0000" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.35, 0.22, -1.1]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#FF4757" emissive="#FF0000" emissiveIntensity={0.5} />
      </mesh>

      {/* Racing number "1" on side */}
      <mesh position={[-0.56, 0.25, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.2]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.56, 0.25, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.2]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Wheels - cartoon style with colored rims */}
      {[
        { x: -0.5, z: 0.65 },
        { x: 0.5, z: 0.65 },
        { x: -0.5, z: -0.7 },
        { x: 0.5, z: -0.7 },
      ].map((pos, i) => (
        <group key={i} position={[pos.x, 0, pos.z]}>
          {/* Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.18, 20]} />
            <meshStandardMaterial color={wheelColor} roughness={0.9} />
          </mesh>
          {/* Rim - colorful! */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.18, 0.2, 12]} />
            <meshStandardMaterial color={rimColor} metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Hub cap */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.22, 8]} />
            <meshStandardMaterial color="#FFFFFF" metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Spoiler - fun colored */}
      <mesh position={[0, 0.4, -1.0]}>
        <boxGeometry args={[0.95, 0.06, 0.2]} />
        <meshStandardMaterial color="#5352ED" />
      </mesh>
      {/* Spoiler supports */}
      <mesh position={[-0.3, 0.35, -1.0]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshStandardMaterial color="#5352ED" />
      </mesh>
      <mesh position={[0.3, 0.35, -1.0]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshStandardMaterial color="#5352ED" />
      </mesh>

      {/* Racing stripe on top */}
      <mesh position={[0, 0.33, 0.3]}>
        <boxGeometry args={[0.15, 0.01, 1.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

export default Car;
