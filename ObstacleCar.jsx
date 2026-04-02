import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function ObstacleCar({ lane, laneX, z, colorIndex = 0 }) {
  const wheelFL = useRef();
  const wheelFR = useRef();
  const wheelRL = useRef();
  const wheelRR = useRef();
  const eyeRef = useRef({ x: 0, y: 0 });
  const eyeTarget = useRef({ x: 0, y: 0 });

  useFrame((_, delta) => {
    const speed = delta * 10;
    [wheelFL, wheelFR, wheelRL, wheelRR].forEach(w => {
      if (w.current) w.current.rotation.x += speed;
    });

    // Random eye movement
    if (Math.random() < 0.008) {
      eyeTarget.current = {
        x: (Math.random() - 0.5) * 0.06,
        y: (Math.random() - 0.5) * 0.03,
      };
    }
    eyeRef.current.x += (eyeTarget.current.x - eyeRef.current.x) * 0.04;
    eyeRef.current.y += (eyeTarget.current.y - eyeRef.current.y) * 0.04;
  });

  const carThemes = [
    { body: "#3498DB", dark: "#2471A3", roof: "#2980B9", accent: "#1ABC9C", trim: "#AED6F1", grill: "#1F618D", eye: "#E74C3C" },
    { body: "#E67E22", dark: "#CA6F1E", roof: "#D35400", accent: "#F39C12", trim: "#FAD7A0", grill: "#A04000", eye: "#2ECC71" },
    { body: "#9B59B6", dark: "#7D3C98", roof: "#8E44AD", accent: "#E056A0", trim: "#D2B4DE", grill: "#6C3483", eye: "#F1C40F" },
    { body: "#2ECC71", dark: "#28B463", roof: "#27AE60", accent: "#F1C40F", trim: "#ABEBC6", grill: "#1E8449", eye: "#E74C3C" },
    { body: "#E74C3C", dark: "#CB4335", roof: "#C0392B", accent: "#FF6B6B", trim: "#F5B7B1", grill: "#922B21", eye: "#3498DB" },
    { body: "#FF69B4", dark: "#E055A0", roof: "#FF1493", accent: "#FFB6C1", trim: "#FADBD8", grill: "#C71585", eye: "#8E44AD" },
    { body: "#00CED1", dark: "#00A8A8", roof: "#008B8B", accent: "#7FFFD4", trim: "#B2DFDB", grill: "#00838F", eye: "#FF6B6B" },
  ];

  const t = carThemes[colorIndex % carThemes.length];
  const ex = eyeRef.current;

  // Each car type gets a slightly different personality
  const personality = colorIndex % 3; // 0 = round/cute, 1 = sporty, 2 = boxy/truck-ish

  return (
    <group position={[laneX(lane), -0.4, z]} rotation={[0, Math.PI, 0]}>

      {/* === BODY === */}
      {/* Main body - rounded */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.3, 0.5, 2.2]} />
        <meshStandardMaterial color={t.body} metalness={0.08} roughness={0.65} />
      </mesh>

      {/* Hood - bulging */}
      <mesh position={[0, 0.45, 0.8]} rotation={[0.12, 0, 0]}>
        <sphereGeometry args={[0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2.5]} />
        <meshStandardMaterial color={t.body} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Nose - rounded */}
      <mesh position={[0, 0.25, 1.05]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial color={t.dark} metalness={0.08} roughness={0.6} />
      </mesh>

      {/* Rear end - rounded */}
      <mesh position={[0, 0.3, -0.9]}>
        <sphereGeometry args={[0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={t.body} metalness={0.08} roughness={0.65} />
      </mesh>

      {/* === CABIN - bubbly === */}
      <mesh position={[0, 0.78, -0.05]} castShadow>
        <sphereGeometry args={[0.58, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshStandardMaterial color={t.roof} metalness={0.0} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.6, -0.05]}>
        <cylinderGeometry args={[0.55, 0.58, 0.12, 16]} />
        <meshStandardMaterial color={t.roof} metalness={0.0} roughness={0.7} />
      </mesh>

      {/* === WINDOWS === */}
      {/* Windshield */}
      <mesh position={[0, 0.72, 0.45]} rotation={[-0.4, 0, 0]}>
        <planeGeometry args={[0.95, 0.45]} />
        <meshStandardMaterial color="#7EC8E3" transparent opacity={0.5} roughness={0.05} side={2} />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 0.72, -0.52]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[0.85, 0.38]} />
        <meshStandardMaterial color="#7EC8E3" transparent opacity={0.5} roughness={0.05} side={2} />
      </mesh>
      {/* Side windows */}
      {[-1, 1].map(side => (
        <mesh key={`sw${side}`} position={[side * 0.56, 0.72, -0.05]} rotation={[0, side * 0.15, 0]}>
          <planeGeometry args={[0.65, 0.35]} />
          <meshStandardMaterial color="#7EC8E3" transparent opacity={0.4} roughness={0.05} side={2} />
        </mesh>
      ))}

      {/* === CARTOON FACE === */}
      {/* Big expressive eyes */}
      {[-1, 1].map(side => (
        <group key={`eye${side}`} position={[side * 0.35, 0.48, 1.1]}>
          {/* Eye white - big and oval */}
          <mesh scale={[1, 1.2, 0.7]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* Iris - colored */}
          <mesh position={[ex.x, ex.y, 0.1]} scale={[1, 1.1, 0.8]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={t.eye} />
          </mesh>
          {/* Pupil */}
          <mesh position={[ex.x, ex.y, 0.13]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Sparkle */}
          <mesh position={[side * 0.04 + ex.x, 0.05 + ex.y, 0.15]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.5} />
          </mesh>
          {/* Eyelid - gives personality */}
          <mesh position={[0, 0.14, 0.04]} rotation={[0, 0, side * (personality === 1 ? -0.25 : -0.1)]}>
            <boxGeometry args={[0.22, 0.05, 0.16]} />
            <meshStandardMaterial color={t.dark} />
          </mesh>
        </group>
      ))}

      {/* Mouth / grille - expression varies by personality */}
      {personality === 0 ? (
        // Cute smile
        <group>
          <mesh position={[0, 0.2, 1.15]}>
            <boxGeometry args={[0.7, 0.18, 0.1]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {/* Teeth */}
          {[-0.22, -0.08, 0.08, 0.22].map((x, i) => (
            <mesh key={`t${i}`} position={[x, 0.26, 1.18]}>
              <boxGeometry args={[0.11, 0.06, 0.06]} />
              <meshStandardMaterial color="#FFFFFF" />
            </mesh>
          ))}
          <mesh position={[0, 0.14, 1.18]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#FF6B81" />
          </mesh>
        </group>
      ) : personality === 1 ? (
        // Sporty grin
        <group>
          <mesh position={[0, 0.18, 1.15]}>
            <boxGeometry args={[0.85, 0.22, 0.1]} />
            <meshStandardMaterial color={t.grill} metalness={0.4} roughness={0.3} />
          </mesh>
          {[-0.3, -0.15, 0, 0.15, 0.3].map((x, i) => (
            <mesh key={`gb${i}`} position={[x, 0.18, 1.19]}>
              <boxGeometry args={[0.03, 0.16, 0.02]} />
              <meshStandardMaterial color="#C0C0C0" metalness={0.7} roughness={0.2} />
            </mesh>
          ))}
        </group>
      ) : (
        // Cheeky grin
        <group>
          <mesh position={[0, 0.18, 1.15]}>
            <boxGeometry args={[0.6, 0.14, 0.1]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0.25, 0.2, 1.18]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[-0.25, 0.2, 1.18]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      )}

      {/* Cheek blush */}
      {[-1, 1].map(side => (
        <mesh key={`cheek${side}`} position={[side * 0.48, 0.3, 1.05]} scale={[1, 0.7, 0.5]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#FF9FF3" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* === BUMPERS === */}
      {/* Front bumper */}
      <mesh position={[0, 0.1, 1.08]}>
        <boxGeometry args={[1.3, 0.12, 0.2]} />
        <meshStandardMaterial color={t.trim} metalness={0.1} roughness={0.5} />
      </mesh>

      {/* Headlights */}
      {[-1, 1].map(side => (
        <group key={`hl${side}`} position={[side * 0.52, 0.38, 1.1]}>
          <mesh>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial color="#FFF9C4" emissive="#FFF176" emissiveIntensity={0.9} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.11, 0.015, 8, 16]} />
            <meshStandardMaterial color="#FFD700" metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Rear bumper */}
      <mesh position={[0, 0.1, -1.1]}>
        <boxGeometry args={[1.25, 0.12, 0.15]} />
        <meshStandardMaterial color={t.trim} metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Taillights */}
      {[-1, 1].map(side => (
        <mesh key={`tl${side}`} position={[side * 0.5, 0.35, -1.12]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#D32F2F" emissive="#FF0000" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Exhaust */}
      <mesh position={[0.25, 0.06, -1.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.1, 10]} />
        <meshStandardMaterial color="#666" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* === OVERSIZED WHEELS === */}
      {[
        { x: 0.62, z: 0.65, ref: wheelFL },
        { x: -0.62, z: 0.65, ref: wheelFR },
        { x: 0.62, z: -0.65, ref: wheelRL },
        { x: -0.62, z: -0.65, ref: wheelRR },
      ].map((pos, i) => (
        <group key={`w${i}`} position={[pos.x, 0.17, pos.z]}>
          {/* Tire */}
          <group ref={pos.ref} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.18, 20]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
            </mesh>
          </group>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.17, 0.17, 0.19, 16]} />
            <meshStandardMaterial color={t.accent} metalness={0.55} roughness={0.2} />
          </mesh>
          {/* Hub */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.2, 5]} />
            <meshStandardMaterial color="#E0E0E0" metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* === DETAILS === */}
      {/* Racing stripe */}
      <mesh position={[0, 0.62, 0.4]}>
        <boxGeometry args={[0.15, 0.01, 1.2]} />
        <meshStandardMaterial color={t.accent} />
      </mesh>

      {/* Side trim */}
      {[-1, 1].map(side => (
        <group key={`trim${side}`}>
          <mesh position={[side * 0.68, 0.4, 0]}>
            <boxGeometry args={[0.02, 0.06, 1.8]} />
            <meshStandardMaterial color={t.accent} metalness={0.3} />
          </mesh>
          {/* Side mirror */}
          <mesh position={[side * 0.75, 0.68, 0.32]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={t.body} />
          </mesh>
        </group>
      ))}

      {/* Antenna with ball */}
      <mesh position={[-0.2, 1.1, -0.25]}>
        <cylinderGeometry args={[0.008, 0.006, 0.45, 4]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-0.2, 1.33, -0.25]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color={t.accent} emissive={t.accent} emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default ObstacleCar;
