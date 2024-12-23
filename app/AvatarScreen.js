import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Avatar from './Avatar';
import { THREE } from 'expo-three';

export default function AvatarScreen() {
  const [isModelLoaded, setIsModelLoaded] = useState(true);

  const bellaModel = {
    uri: './models/Bella.glb', // Replace with the actual path to your Bella.glb file
  };


  return (
    <div style={styles.container}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <OrbitControls />
        <Avatar
          model={bellaModel}
          isLoaded={isModelLoaded}
        />
      </Canvas>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#000', // Black background for better contrast
  },
};
