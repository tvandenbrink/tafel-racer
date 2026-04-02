import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

function ObstacleCar({ lane, laneX, z, colorIndex = 0 }) {
  const wheelFL = useRef();
  const wheelFR = useRef();
  const wheelRL = useRef();
  const wheelRR = useRef();

  // Spin wheels
  useFrame((_, delta) => {
    const speed = delta * 10;
    [wheelFL, wheelFR, wheelRL, wheelRR].forEach(w => {
      if (w.current) w.current.rotation.x += speed;
    });
  });

  const carThemes = [
    { body: "#3498DB", roof: "#2980B9", accent: "#1ABC9C", trim: "#AED6F1", grill: "#1F618D" },
    { body: "#E67E22", roof: "#D35400", accent: "#F39C12", trim: "#FAD7A0", grill: "#A04000" },
    { body: "#9B59B6", roof: "#8E44AD", accent: "#E056A0", trim: "#D2B4DE", grill: "#6C3483" },
    { body: "#2ECC71", roof: "#27AE60", accent: "#F1C40F", trim: "#ABEBC6", grill: "#1E8449" },
    { body: "#E74C3C", roof: "#C0392B", accent: "#FF6B6B", trim: "#F5B7B1", grill: "#922B21" },
    { body: "#FF69B4", roof: "#FF1493", accent: "#FFB6C1", trim: "#FADBD8", grill: "#C71585" },
    { body: "#00CED1", roof: "#008B8B", accent: "#7FFFD4", trim: "#B2DFDB", grill: "#00838F" },
  ];

  const t = carThemes[colorIndex % carThemes.length];

  return (
    <group position={[laneX(lane), -0.4, z]} rotation={[0, Math.PI, 0]}>

      {/* === LOWER BODY - rounded with fenders === */}
      {/* Main body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.3, 0.45, 2.2]} />
        <meshStandardMaterial color={t.body} metalness={0.25} roughness={0.45} />
      </mesh>
      {/* Body top rounding */}
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[1.2, 0.06, 2.1]} />
        <meshStandardMaterial color={t.body} metalness={0.25} roughness={0.45} />
      </mesh>
      {/* Hood - sloped */}
      <mesh position={[0, 0.42, 0.85]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.2, 0.12, 0.6]} />
        <meshStandardMaterial color={t.body} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, 0.42, -0.85]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.15, 0.1, 0.5]} />
        <meshStandardMaterial color={t.body} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* === WHEEL ARCHES === */}
      {[
        { x: 0.58, z: 0.65 },
        { x: -0.58, z: 0.65 },
        { x: 0.58, z: -0.65 },
        { x: -0.58, z: -0.65 },
      ].map((pos, i) => (
        <mesh key={`arch${i}`} position={[pos.x, 0.2, pos.z]}>
          <boxGeometry args={[0.2, 0.35, 0.55]} />
          <meshStandardMaterial color={t.body} metalness={0.2} roughness={0.5} />
        </mesh>
      ))}

      {/* === CABIN === */}
      {/* Cabin main */}
      <mesh position={[0, 0.82, -0.05]} castShadow>
        <boxGeometry args={[1.05, 0.42, 1.1]} />
        <meshStandardMaterial color={t.roof} metalness={0.15} roughness={0.55} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.04, -0.05]}>
        <boxGeometry args={[0.95, 0.04, 1.0]} />
        <meshStandardMaterial color={t.roof} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* === WINDOWS === */}
      {/* Windshield - angled */}
      <mesh position={[0, 0.82, 0.48]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.95, 0.38, 0.04]} />
        <meshStandardMaterial color="#7EC8E3" transparent opacity={0.55} metalness={0.3} roughness={0.1} />
      </mesh>
      {/* Rear window - angled */}
      <mesh position={[0, 0.82, -0.56]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.9, 0.32, 0.04]} />
        <meshStandardMaterial color="#7EC8E3" transparent opacity={0.55} metalness={0.3} roughness={0.1} />
      </mesh>
      {/* Side windows */}
      {[-1, 1].map(side => (
        <mesh key={`sw${side}`} position={[side * 0.53, 0.82, -0.05]}>
          <boxGeometry args={[0.03, 0.3, 0.7]} />
          <meshStandardMaterial color="#7EC8E3" transparent opacity={0.45} metalness={0.3} roughness={0.1} />
        </mesh>
      ))}

      {/* === FACE - FRONT (this is what the player sees!) === */}
      {/* Big friendly eyes */}
      {[-1, 1].map(side => (
        <group key={`eye${side}`} position={[side * 0.32, 0.48, 1.12]}>
          {/* Eye white - larger */}
          <mesh>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          {/* Iris */}
          <mesh position={[0, 0.02, 0.1]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial color={t.accent} />
          </mesh>
          {/* Pupil */}
          <mesh position={[0, 0.02, 0.14]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color="#1a1a2e" />
          </mesh>
          {/* Eye highlight */}
          <mesh position={[side * 0.03, 0.05, 0.15]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.3} />
          </mesh>
          {/* Eyelid */}
          <mesh position={[0, 0.1, 0.05]}>
            <boxGeometry args={[0.2, 0.04, 0.15]} />
            <meshStandardMaterial color={t.body} />
          </mesh>
        </group>
      ))}

      {/* Grille / mouth area */}
      <mesh position={[0, 0.2, 1.12]}>
        <boxGeometry args={[0.8, 0.18, 0.08]} />
        <meshStandardMaterial color={t.grill} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Grille bars */}
      {[-0.25, -0.08, 0.08, 0.25].map((x, i) => (
        <mesh key={`gb${i}`} position={[x, 0.2, 1.16]}>
          <boxGeometry args={[0.03, 0.12, 0.02]} />
          <meshStandardMaterial color="#C0C0C0" metalness={0.7} roughness={0.2} />
        </mesh>
      ))}

      {/* Bumper - front */}
      <mesh position={[0, 0.12, 1.1]}>
        <boxGeometry args={[1.25, 0.1, 0.12]} />
        <meshStandardMaterial color={t.trim} metalness={0.15} roughness={0.5} />
      </mesh>
      {/* Bumper corners */}
      {[-1, 1].map(side => (
        <mesh key={`bc${side}`} position={[side * 0.6, 0.12, 1.05]}>
          <boxGeometry args={[0.1, 0.1, 0.2]} />
          <meshStandardMaterial color={t.trim} metalness={0.15} roughness={0.5} />
        </mesh>
      ))}

      {/* Headlights - big, expressive */}
      {[-1, 1].map(side => (
        <group key={`hl${side}`} position={[side * 0.5, 0.38, 1.1]}>
          {/* Housing */}
          <mesh>
            <boxGeometry args={[0.2, 0.14, 0.1]} />
            <meshStandardMaterial color="#333" metalness={0.3} roughness={0.4} />
          </mesh>
          {/* Lens */}
          <mesh position={[0, 0, 0.04]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color="#FFF9C4" emissive="#FFF176" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}

      {/* === REAR === */}
      {/* Rear bumper */}
      <mesh position={[0, 0.12, -1.1]}>
        <boxGeometry args={[1.2, 0.1, 0.1]} />
        <meshStandardMaterial color={t.trim} metalness={0.15} roughness={0.5} />
      </mesh>
      {/* Taillights */}
      {[-1, 1].map(side => (
        <group key={`tl${side}`} position={[side * 0.48, 0.35, -1.12]}>
          <mesh>
            <boxGeometry args={[0.22, 0.1, 0.06]} />
            <meshStandardMaterial color="#D32F2F" emissive="#FF0000" emissiveIntensity={0.4} />
          </mesh>
          {/* Turn signal */}
          <mesh position={[side * 0.12, 0, 0]}>
            <boxGeometry args={[0.06, 0.08, 0.06]} />
            <meshStandardMaterial color="#FFA000" emissive="#FF8F00" emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
      {/* License plate */}
      <mesh position={[0, 0.2, -1.13]}>
        <boxGeometry args={[0.35, 0.1, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Exhaust */}
      <mesh position={[0.3, 0.08, -1.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 10]} />
        <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* === WHEELS - detailed === */}
      {[
        { x: 0.6, z: 0.65, ref: wheelFL },
        { x: -0.6, z: 0.65, ref: wheelFR },
        { x: 0.6, z: -0.65, ref: wheelRL },
        { x: -0.6, z: -0.65, ref: wheelRR },
      ].map((pos, i) => (
        <group key={`w${i}`} position={[pos.x, 0.17, pos.z]}>
          {/* Tire */}
          <group ref={pos.ref} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.24, 0.18, 20]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
            </mesh>
            {/* Tire tread lines */}
            {[0, 1, 2, 3, 4, 5].map(j => (
              <mesh key={j} rotation={[0, (j / 6) * Math.PI * 2, 0]} position={[0, 0, 0]}>
                <boxGeometry args={[0.25, 0.19, 0.02]} />
                <meshStandardMaterial color="#222" roughness={1} />
              </mesh>
            ))}
          </group>
          {/* Rim */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.19, 16]} />
            <meshStandardMaterial color={t.accent} metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Hub cap center */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, 0.2, 8]} />
            <meshStandardMaterial color="#E0E0E0" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* === DETAILS === */}
      {/* Racing stripe on hood */}
      <mesh position={[0, 0.49, 0.6]}>
        <boxGeometry args={[0.15, 0.01, 0.8]} />
        <meshStandardMaterial color={t.accent} />
      </mesh>
      {/* Side trim / door line */}
      {[-1, 1].map(side => (
        <group key={`trim${side}`}>
          <mesh position={[side * 0.66, 0.4, 0]}>
            <boxGeometry args={[0.02, 0.04, 1.8]} />
            <meshStandardMaterial color={t.accent} metalness={0.3} />
          </mesh>
          {/* Door handle */}
          <mesh position={[side * 0.67, 0.45, 0.1]}>
            <boxGeometry args={[0.02, 0.03, 0.1]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Side mirror */}
          <mesh position={[side * 0.7, 0.72, 0.35]}>
            <boxGeometry args={[0.06, 0.06, 0.1]} />
            <meshStandardMaterial color={t.body} metalness={0.2} roughness={0.5} />
          </mesh>
          {/* Mirror glass */}
          <mesh position={[side * 0.74, 0.72, 0.35]}>
            <boxGeometry args={[0.01, 0.04, 0.08]} />
            <meshStandardMaterial color="#90CAF9" metalness={0.5} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Antenna */}
      <mesh position={[-0.2, 1.06, -0.3]}>
        <cylinderGeometry args={[0.008, 0.005, 0.4, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[-0.2, 1.26, -0.3]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color={t.accent} />
      </mesh>
    </group>
  );
}

export default ObstacleCar;
