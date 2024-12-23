import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useFBX, useGLTF } from '@react-three/drei/native';
// import { Audio } from 'expo-av';
// import { useChatContext } from '../../context/ChatProvider';
import { THREE } from 'expo-three';

// const corresponding = {
//   A: "viseme_AA",
//   B: "viseme_kk",  // typically for "B" sound like in "boy"
//   C: "viseme_CH",  // "C" as in "ch" sound like in "chip"
//   D: "viseme_DD",  // "D" as in "dog"
//   E: "viseme_E",   // "E" as in "egg"
//   F: "viseme_FF",  // "F" as in "fish"
//   G: "viseme_GG",  // "G" as in "go"
//   H: "viseme_TH",  // "H" as in "hat"
//   I: "viseme_I",   // "I" as in "ice"
//   J: "viseme_JJ",  // "J" as in "jump"
//   K: "viseme_kk",  // "K" as in "kite"
//   L: "viseme_L",   // "L" as in "lip"
//   M: "viseme_M",   // "M" as in "man"
//   N: "viseme_nn",  // "N" as in "nice"
//   O: "viseme_O",   // "O" as in "orange"
//   P: "viseme_PP",  // "P" as in "pat"
//   Q: "viseme_KK",  // "Q" similar to "K"
//   R: "viseme_RR",  // "R" as in "red"
//   S: "viseme_SS",  // "S" as in "see"
//   T: "viseme_TT",  // "T" as in "top"
//   U: "viseme_U",   // "U" as in "up"
//   V: "viseme_VV",  // "V" as in "vase"
//   W: "viseme_WW",  // "W" as in "win"
//   X: "viseme_SS",  // "X" can often sound like "S" or "ks"
//   Y: "viseme_I",   // "Y" as in "yellow"
//   Z: "viseme_ZZ",  // "Z" as in "zebra"
// };

export default function Avatar(props) {
  const { nodes, materials } = useGLTF(props.model.uri);
  const { animations: idleAnimation } = useFBX(props.animations.idle.uri);
  const { animations: angryAnimation } = useFBX(props.animations.angry.uri);
  const { animations: greetingAnimation } = useFBX(props.animations.greeting.uri);
  const { animations: bowAnimation } = useFBX(props.animations.bow.uri);
  const { message } = useChatContext();

  const [audio, setAudio] = useState(null);
  const [lipsync, setLipsync] = useState(null);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);

    const [blink, setBlink] = useState(false);

  const group = useRef();
  const { actions } = useAnimations(
    [idleAnimation[0], angryAnimation[0], greetingAnimation[0], bowAnimation[0]],
    group
  );

  const [animation, setAnimation] = useState('Bow');

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    if (!group.current) return;
    
    group.current.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (index !== undefined && child.morphTargetInfluences[index] !== undefined) {
          child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
            child.morphTargetInfluences[index],
            value,
            speed
          );
        }
      }
    });
  };

  useEffect(() => {
    if (idleAnimation[0]) idleAnimation[0].name = "Idle";
    if (angryAnimation[0]) angryAnimation[0].name = "Angry";
    if (greetingAnimation[0]) greetingAnimation[0].name = "Greeting";
    if (bowAnimation[0]) bowAnimation[0].name = "Bow";
    setAnimation("Idle");
  }, [idleAnimation, angryAnimation, greetingAnimation, bowAnimation]);

  useEffect(() => {
    const handleMessage = async () => {
      if (!message) {
        setAnimation("Idle");
        return;
      }
      setAnimation(message.animation);
      setLipsync(message.lipsync);

      if (message?.audio) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mp3;base64,${message.audio}` },
            { shouldPlay: true }
          );
          setAudio(sound);

          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setAnimation("Idle");
              setCurrentAudioTime(0);
              setLipsync(null);

            } else if (status.isPlaying) {
              setCurrentAudioTime(status.positionMillis / 1000);
              lerpMorphTarget("mouthSmile",0.3,0.3)
            }
          });
        } catch (error) {
          console.error("Error playing audio:", error);
        }
      }
    };
    handleMessage();

    return () => {
      audio?.unloadAsync();
    };
  }, [message]);

  useEffect(() => {
    actions[animation]?.reset()?.fadeIn(0.5).play();
    return () => actions[animation]?.fadeOut(0.5);
  }, [animation]);

  useFrame(() => {

    if (lipsync && currentAudioTime) {
      Object.values(corresponding).forEach((value) => {
        lerpMorphTarget(value, 0, 0.1); // Reset morph target influences smoothly
      });

      for (const mouthCue of lipsync.mouthCues) {
        if (currentAudioTime >= mouthCue.start && currentAudioTime <= mouthCue.end) {
          const morphTarget = corresponding[mouthCue.value];
          if (morphTarget) {
            lerpMorphTarget(morphTarget, 0.7, 0.5); // Set the target influence smoothly
          }
          break;
        }
      }
    }

    lerpMorphTarget("eyesClosed", blink ? 1 : 0, 0.3);
  });

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  if (!props.isLoaded || !nodes) return null;

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      
      {nodes.Wolf3D_Hair && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Hair.geometry}
          material={materials.Wolf3D_Hair}
          skeleton={nodes.Wolf3D_Hair.skeleton}
        />
      )}
      {nodes.Wolf3D_Glasses && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Glasses.geometry}
          material={materials.Wolf3D_Glasses}
          skeleton={nodes.Wolf3D_Glasses.skeleton}
        />
      )}
      {nodes.Wolf3D_Body && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Body.geometry}
          material={materials.Wolf3D_Body}
          skeleton={nodes.Wolf3D_Body.skeleton}
        />
      )}
      {nodes.Wolf3D_Outfit_Bottom && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
          material={materials.Wolf3D_Outfit_Bottom}
          skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
        />
      )}
      {nodes.Wolf3D_Outfit_Footwear && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
          material={materials.Wolf3D_Outfit_Footwear}
          skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
        />
      )}
      {nodes.Wolf3D_Outfit_Top && (
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Top.geometry}
          material={materials.Wolf3D_Outfit_Top}
          skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
        />
      )}
      {nodes.EyeLeft && (
        <skinnedMesh
          name="EyeLeft"
          geometry={nodes.EyeLeft.geometry}
          material={materials.Wolf3D_Eye}
          skeleton={nodes.EyeLeft.skeleton}
          morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
          morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
        />
      )}
      {nodes.EyeRight && (
        <skinnedMesh
          name="EyeRight"
          geometry={nodes.EyeRight.geometry}
          material={materials.Wolf3D_Eye}
          skeleton={nodes.EyeRight.skeleton}
          morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
          morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
        />
      )}
      {nodes.Wolf3D_Head && (
        <skinnedMesh
          name="Wolf3D_Head"
          geometry={nodes.Wolf3D_Head.geometry}
          material={materials.Wolf3D_Skin}
          skeleton={nodes.Wolf3D_Head.skeleton}
          morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
          morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
        />
      )}
      {nodes.Wolf3D_Teeth && (
        <skinnedMesh
          name="Wolf3D_Teeth"
          geometry={nodes.Wolf3D_Teeth.geometry}
          material={materials.Wolf3D_Teeth}
          skeleton={nodes.Wolf3D_Teeth.skeleton}
          morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
          morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
        />
      )}
    </group>
  );
}
