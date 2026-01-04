import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { encodeBase64 } from 'tweetnacl-util';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ensureIdentityKeypair } from '../../src/crypto';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { apiGetAuth } from '../../src/api';

export default function HomeScreen() {
  const router = useRouter();

  // 🔐 Logout
  async function logout() {
    await SecureStore.deleteItemAsync('access_token');
    router.replace('/login');
  }

  // 🔐 Identity key generation
  useEffect(() => {
    async function initIdentityKey() {
      // ensureIdentityKeypair creates if doesn't exist, returns if exists
      const keypair = await ensureIdentityKeypair();

      console.log(
        '🔑 Identity Public Key:',
        encodeBase64(keypair.publicKey).slice(0, 40) + '...'
      );
    }

    initIdentityKey();
  }, []);

  // 🔄 Session restore - redirect to chats screen
  useEffect(() => {
    SecureStore.getItemAsync('access_token').then((token) => {
      if (!token) {
        router.replace('/login');
        return;
      }

      apiGetAuth('/me', token)
        .then(() => {
          // If authenticated, redirect to chats
          router.replace('/chats');
        })
        .catch(() => {
          SecureStore.deleteItemAsync('access_token');
          router.replace('/login');
        });
    });
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Sandeshaa Mobile</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* 🔵 Open Chats */}
      <ThemedView style={styles.stepContainer}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/chats')}
        >
          <ThemedText style={styles.btnText}>Open Chats</ThemedText>
        </Pressable>
      </ThemedView>

      {/* 🔴 Logout */}
      <ThemedView style={styles.stepContainer}>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <ThemedText style={{ color: 'white' }}>Logout</ThemedText>
        </Pressable>
      </ThemedView>

      {/* Optional Explore */}
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <ThemedText type="subtitle">Explore</ThemedText>
        </Link>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 10,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#1D3D47',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
  },
  logoutBtn: {
    backgroundColor: '#B00020',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

// import { Image } from 'expo-image';
// import { Link, useRouter } from 'expo-router';
// import * as SecureStore from 'expo-secure-store';
// import { useEffect } from 'react';
// import { Pressable, StyleSheet } from 'react-native';
// import { encodeBase64 } from 'tweetnacl-util';

// import { HelloWave } from '@/components/hello-wave';
// import ParallaxScrollView from '@/components/parallax-scroll-view';import { generateIdentityKeypair, getIdentityKeypair } from '../../src/crypto';

// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';

// import { apiGetAuth } from '../../src/api';

// export default function HomeScreen() {
//   const router = useRouter();

//   // 🔐 Logout
//   async function logout() {
//     await SecureStore.deleteItemAsync('access_token');
//     router.replace('/login');
//   }
//   // 🔐 Identity key generation (Step 3.3A)
//   useEffect(() => {
//     async function initIdentityKey() {
//       let keypair = await getIdentityKeypair();

//       if (!keypair) {
//         keypair = await generateIdentityKeypair();
//         console.log('🆕 Identity keypair generated');
//       } else {
//         console.log('♻️ Identity keypair reused');
//       }

//       console.log(
//         '🔑 Identity Public Key:',
//         encodeBase64(keypair.publicKey).slice(0, 40) + '...'
//       );
      
//     }

//     initIdentityKey();
//   }, []);

//   // 🔄 Session restore
//   useEffect(() => {
//     SecureStore.getItemAsync('access_token').then((token) => {
//       if (!token) {
//         router.replace('/login');
//         return;
//       }

//       apiGetAuth('/me', token).catch(() => {
//         SecureStore.deleteItemAsync('access_token');
//         router.replace('/login');
//       });
//     });
//   }, []);

//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
//       headerImage={
//         <Image
//           source={require('@/assets/images/partial-react-logo.png')}
//           style={styles.reactLogo}
//         />
//       }
//     >
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type="title">Sandeshaa Mobile</ThemedText>
//         <HelloWave />
//       </ThemedView>

//       {/* 🔵 Open Chat */}
//       <ThemedView style={styles.stepContainer}>
//         <Pressable
//           style={styles.primaryBtn}
//           onPress={() => router.push('/chat?to=muna')}
//         >
//           <ThemedText style={styles.btnText}>Open Chat with muna</ThemedText>
//         </Pressable>
//       </ThemedView>

//       {/* 🔴 Logout */}
//       <ThemedView style={styles.stepContainer}>
//         <Pressable style={styles.logoutBtn} onPress={logout}>
//           <ThemedText style={{ color: 'white' }}>Logout</ThemedText>
//         </Pressable>
//       </ThemedView>

//       {/* Optional Explore */}
//       <ThemedView style={styles.stepContainer}>
//         <Link href="/modal">
//           <ThemedText type="subtitle">Explore</ThemedText>
//         </Link>
//       </ThemedView>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 10,
//     marginBottom: 12,
//   },
//   primaryBtn: {
//     backgroundColor: '#1D3D47',
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   btnText: {
//     color: 'white',
//   },
//   logoutBtn: {
//     backgroundColor: '#B00020',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
// });
