import React from "react";

function ObstacleCar({ lane, laneX, z, colorIndex = 0 }) {
  // Fun, bright cartoon car colors
  const carThemes = [
    { body: "#3498DB", roof: "#2980B9", accent: "#1ABC9C", name: "blue" },    // Blue car
    { body: "#E67E22", roof: "#D35400", accent: "#F39C12", name: "orange" },   // Orange car
    { body: "#9B59B6", roof: "#8E44AD", accent: "#E056A0", name: "purple" },   // Purple car
    { body: "#2ECC71", roof: "#27AE60", accent: "#F1C40F", name: "green" },    // Green car
    { body: "#E74C3C", roof: "#C0392B", accent: "#FF6B6B", name: "red" },      // Red car
    { body: "#FF69B4", roof: "#FF1493", accent: "#FFB6C1", name: "pink" },     // Pink car
    { body: "#00CED1", roof: "#008B8B", accent: "#7FFFD4", name: "teal" },     // Teal car
  ];

  const theme = carThemes[colorIndex % carThemes.length];
  const eyeWhite = "#FFFFFF";
  const eyePupil = "#2F3542";

  return (
    <group position={[laneX(lane), -0.4, z]} rotation={[0, Math.PI, 0]}>
      {/* Main body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 2.0]} />
        <meshStandardMaterial color={theme.body} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Body front curve */}
      <mesh position={[0, 0.45, 0.7]}>
        <boxGeometry args={[1.1, 0.35, 0.5]} />
        <meshStandardMaterial color={theme.body} metalness={0.1} roughness={0.6} />
      </mesh>

      {/* Cabin / Roof */}
      <mesh position={[0, 0.85, -0.1]} castShadow>
        <boxGeometry args={[1.0, 0.4, 1.2]} />
        <meshStandardMaterial color={theme.roof} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Roof rounded top */}
      <mesh position={[0, 1.05, -0.1]}>
        <boxGeometry args={[0.9, 0.05, 1.1]} />
        <meshStandardMaterial color={theme.roof} metalness={0.05} roughness={0.7} />
      </mesh>

      {/* Windshield */}
      <mesh position={[0, 0.82, 0.42]} castShadow>
        <boxGeometry args={[0.9, 0.35, 0.05]} />
        <meshStandardMaterial color="#70A1FF" transparent opacity={0.6} />
      </mesh>

      {/* Rear window */}
      <mesh position={[0, 0.82, -0.65]} castShadow>
        <boxGeometry args={[0.85, 0.3, 0.05]} />
        <meshStandardMaterial color="#70A1FF" transparent opacity={0.6} />
      </mesh>

      {/* === CARTOON EYES === */}
      {/* Left eye */}
      <mesh position={[-0.25, 0.5, 1.01]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      <mesh position={[-0.25, 0.52, 1.12]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color={eyePupil} />
      </mesh>
      {/* Right eye */}
      <mesh position={[0.25, 0.5, 1.01]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={eyeWhite} />
      </mesh>
      <mesh position={[0.25, 0.52, 1.12]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshStandardMaterial color={eyePupil} />
      </mesh>

      {/* Front bumper - smile */}
      <mesh position={[0, 0.22, 1.05]} castShadow>
        <boxGeometry args={[1.1, 0.2, 0.15]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>

      {/* Rear bumper */}
      <mesh position={[0, 0.22, -1.05]} castShadow>
        <boxGeometry args={[1.1, 0.2, 0.15]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>

      {/* Headlights - big friendly */}
      <mesh position={[-0.42, 0.4, 1.02]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#FFF59D" emissive="#FFF59D" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.42, 0.4, 1.02]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#FFF59D" emissive="#FFF59D" emissiveIntensity={0.5} />
      </mesh>

      {/* Taillights */}
      <mesh position={[-0.4, 0.35, -1.08]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#FF4757" emissive="#FF0000" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.4, 0.35, -1.08]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#FF4757" emissive="#FF0000" emissiveIntensity={0.3} />
      </mesh>

      {/* Wheels - cartoon style */}
      {[
        { x: 0.55, z: 0.65 },
        { x: -0.55, z: 0.65 },
        { x: 0.55, z: -0.65 },
        { x: -0.55, z: -0.65 },
      ].map((pos, i) => (
        <group key={i} position={[pos.x, 0.15, pos.z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.15, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.14, 0.14, 0.16, 10]} />
            <meshStandardMaterial color={theme.accent} metalness={0.4} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Decorative stripe */}
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.22, 0.06, 1.5]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>

      {/* Side mirrors */}
      <mesh position={[0.65, 0.72, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color={theme.body} />
      </mesh>
      <mesh position={[-0.65, 0.72, 0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.12]} />
        <meshStandardMaterial color={theme.body} />
      </mesh>
    </group>
  );
}

export default ObstacleCar;
