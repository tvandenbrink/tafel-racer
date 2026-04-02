import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";

function Car({ lane, laneX, lanes, invincible }) {
  const groupRef = useRef();
  const [wiggle, setWiggle] = useState(0);
  const wheelRotation = useRef(0);
  const initialOpacities = useRef(new Map()).current;
  const eyeTargetRef = useRef({ x: 0, y: 0 });
  const eyeCurrentRef = useRef({ x: 0, y: 0 });

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

    // Gentle eye wander
    if (Math.random() < 0.01) {
      eyeTargetRef.current = {
        x: (Math.random() - 0.5) * 0.04,
        y: (Math.random() - 0.5) * 0.02,
      };
    }
    eyeCurrentRef.current.x += (eyeTargetRef.current.x - eyeCurrentRef.current.x) * 0.05;
    eyeCurrentRef.current.y += (eyeTargetRef.current.y - eyeCurrentRef.current.y) * 0.05;

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

  const mainColor = "#FF4757";
  const darkColor = "#D63447";
  const roofColor = "#2ED573";
  const glassColor = "#70A1FF";
  const wheelColor = "#2F3542";
  const rimColor = "#FFA502";
  const bumperColor = "#ECCC68";

  const ex = eyeCurrentRef.current;

  return (
    <group ref={groupRef} position={[laneX(lane), 0.3, 0]}>

      {/* === BODY - big round cartoon shape === */}
      {/* Main body - rounded bottom */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 2.3]} />
        <meshStandardMaterial color={mainColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Hood - big bulging cartoon hood */}
      <mesh position={[0, 0.28, 0.6]}>
        <sphereGeometry args={[0.65, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Nose - rounded front end */}
      <mesh position={[0, 0.15, 1.0]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.05} roughness={0.6} />
      </mesh>

      {/* Trunk - rounded rear */}
      <mesh position={[0, 0.22, -0.9]}>
        <sphereGeometry args={[0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={mainColor} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* === CABIN - bubbly cartoon roof === */}
      <mesh position={[0, 0.6, -0.1]} castShadow>
        <sphereGeometry args={[0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={roofColor} metalness={0.0} roughness={0.8} />
      </mesh>
      {/* Cabin base */}
      <mesh position={[0, 0.42, -0.1]}>
        <cylinderGeometry args={[0.52, 0.55, 0.12, 16]} />
        <meshStandardMaterial color={roofColor} metalness={0.0} roughness={0.8} />
      </mesh>

      {/* === WINDSHIELD - big bubbly === */}
      <mesh position={[0, 0.55, 0.32]} rotation={[-Math.PI / 4.5, 0, 0]}>
        <planeGeometry args={[0.85, 0.5]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.5} roughness={0.05} side={2} />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 0.55, -0.5]} rotation={[Math.PI / 5, 0, 0]}>
        <planeGeometry args={[0.75, 0.4]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.5} roughness={0.05} side={2} />
      </mesh>

      {/* === BIG CARTOON EYES === */}
      {[-1, 1].map(side => (
        <group key={`eye${side}`} position={[side * 0.22, 0.38, 0.95]}>
          {/* Eye white - big oval */}
          <mesh scale={[1, 1.15, 0.7]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* Iris */}
          <mesh position={[ex.x, ex.y + 0.01, 0.1]} scale={[1, 1.1, 0.8]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color="#4A90D9" />
          </mesh>
          {/* Pupil */}
          <mesh position={[ex.x, ex.y + 0.01, 0.13]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Highlight sparkle */}
          <mesh position={[side * 0.03 + ex.x, 0.04 + ex.y, 0.15]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
          {/* Eyebrow - playful arch */}
          <mesh position={[0, 0.17, 0.05]} rotation={[0, 0, side * -0.15]}>
            <boxGeometry args={[0.2, 0.04, 0.08]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      ))}

      {/* === BIG GRIN === */}
      {/* Mouth background */}
      <mesh position={[0, 0.12, 1.12]}>
        <boxGeometry args={[0.65, 0.16, 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Smile curve - teeth */}
      {[-0.2, -0.07, 0.07, 0.2].map((x, i) => (
        <mesh key={`tooth${i}`} position={[x, 0.17, 1.15]}>
          <boxGeometry args={[0.1, 0.06, 0.06]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
      ))}
      {/* Smile curve bottom - tongue hint */}
      <mesh position={[0, 0.07, 1.15]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#FF6B81" />
      </mesh>

      {/* === FRONT BUMPER - big chunky === */}
      <mesh position={[0, 0.02, 1.0]}>
        <boxGeometry args={[1.15, 0.12, 0.3]} />
        <meshStandardMaterial color={bumperColor} metalness={0.1} roughness={0.5} />
      </mesh>

      {/* === HEADLIGHTS - big friendly circles === */}
      {[-1, 1].map(side => (
        <group key={`hl${side}`} position={[side * 0.45, 0.25, 1.05]}>
          <mesh>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#FFF59D" emissive="#FFF59D" emissiveIntensity={1.0} />
          </mesh>
          {/* Light ring */}
          <mesh>
            <torusGeometry args={[0.13, 0.02, 8, 16]} />
            <meshStandardMaterial color="#FFD700" metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* === REAR === */}
      {/* Rear bumper */}
      <mesh position={[0, 0.02, -1.05]}>
        <boxGeometry args={[1.1, 0.12, 0.2]} />
        <meshStandardMaterial color={darkColor} />
      </mesh>
      {/* Taillights */}
      {[-1, 1].map(side => (
        <mesh key={`tl${side}`} position={[side * 0.4, 0.25, -1.12]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#FF4757" emissive="#FF0000" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* Exhaust pipes - dual cartoon */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={`exh${i}`} position={[x, 0.0, -1.18]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.1, 10]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* === OVERSIZED CARTOON WHEELS === */}
      {[
        { x: -0.55, z: 0.6 },
        { x: 0.55, z: 0.6 },
        { x: -0.55, z: -0.65 },
        { x: 0.55, z: -0.65 },
      ].map((pos, i) => (
        <group key={i} position={[pos.x, -0.02, pos.z]}>
          {/* Tire */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 20]} />
            <meshStandardMaterial color={wheelColor} roughness={0.95} />
          </mesh>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.21, 16]} />
            <meshStandardMaterial color={rimColor} metalness={0.5} roughness={0.25} />
          </mesh>
          {/* Hub cap */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.1, 0.22, 5]} />
            <meshStandardMaterial color="#FFFFFF" metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* === FUN SPOILER === */}
      <mesh position={[0, 0.48, -0.95]}>
        <boxGeometry args={[1.0, 0.07, 0.25]} />
        <meshStandardMaterial color="#5352ED" metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Spoiler uprights */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={`sp${i}`} position={[x, 0.4, -0.95]}>
          <cylinderGeometry args={[0.03, 0.03, 0.18, 8]} />
          <meshStandardMaterial color="#5352ED" />
        </mesh>
      ))}

      {/* Racing stripe */}
      <mesh position={[0, 0.39, 0.3]}>
        <boxGeometry args={[0.18, 0.01, 1.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Second stripe */}
      <mesh position={[0.22, 0.39, 0.3]}>
        <boxGeometry args={[0.06, 0.01, 1.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.22, 0.39, 0.3]}>
        <boxGeometry args={[0.06, 0.01, 1.6]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Number circle on sides */}
      {[-1, 1].map(side => (
        <group key={`num${side}`} position={[side * 0.62, 0.28, 0]}>
          <mesh rotation={[0, side * Math.PI / 2, 0]}>
            <circleGeometry args={[0.15, 16]} />
            <meshStandardMaterial color="#FFFFFF" side={2} />
          </mesh>
        </group>
      ))}

      {/* Cheek blush - cute touch */}
      {[-1, 1].map(side => (
        <mesh key={`cheek${side}`} position={[side * 0.42, 0.2, 1.0]} scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#FF9FF3" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default Car;
