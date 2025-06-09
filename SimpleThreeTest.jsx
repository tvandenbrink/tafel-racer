import React from 'react';
import { Canvas } from '@react-three/fiber';

const SimpleThreeTest = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={'orange'} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default SimpleThreeTest;
