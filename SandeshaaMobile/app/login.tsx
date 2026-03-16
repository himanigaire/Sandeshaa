import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";
import { apiPost, apiPut } from "../src/api";
import { ensureIdentityKeypair, getIdentityPublicKeyB64 } from "../src/crypto";

export default function LoginScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      // 1️⃣ Login to get token
      const res = await apiPost("/login", { username, password });

      // 2️⃣ Save token
      await SecureStore.setItemAsync("access_token", res.access_token);

      // 3️⃣ Ensure keypair exists (create if first time on this device)
      await ensureIdentityKeypair();
      
      // 4️⃣ Sync public key with server (important for E2EE!)
      const myPublicKey = await getIdentityPublicKeyB64();
      try {
        // Pass token explicitly since we just set it
        await apiPut("/me/public-key", { identity_public_key: myPublicKey }, res.access_token);
        console.log("🔑 Public key synced with server");
      } catch (e) {
        console.warn("⚠️ Could not sync public key:", e);
        // Continue anyway - not fatal
      }

      console.log("✅ LOGIN SUCCESS");

      // 5️⃣ Go to home screen
      router.replace("/");
    } catch (e: any) {
      console.error("❌ Login error:", e);
      setError(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Login</ThemedText>
      
      <Link href="/register">
        <ThemedText style={{ marginTop: 16, textAlign: "center" }}>
          Don't have an account? Create one
        </ThemedText>
      </Link>

      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      <Pressable 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 6,
    padding: 12,
  },
  button: {
    backgroundColor: "#1D3D47",
    padding: 14,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
  },
  error: {
    color: "red",
  },
});


// import { useRouter } from "expo-router";
// import * as SecureStore from "expo-secure-store";
// import { useState } from "react";
// import { Pressable, StyleSheet, TextInput } from "react-native";
// import { getIdentityPublicKeyB64, ensureIdentityKeypair } from '../src/crypto';

// import { ThemedText } from "@/components/themed-text";
// import { ThemedView } from "@/components/themed-view";
// import { Link } from "expo-router";
// import { apiPost } from "../src/api";

// export default function LoginScreen() {
//   const router = useRouter();

//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");

//   async function handleLogin() {
//     setError("");

//     try {
//       const res = await apiPost("/login", { username, password });

//       await SecureStore.setItemAsync("access_token", res.access_token);

//       console.log("LOGIN SUCCESS");

//       // go to home screen
//       router.replace("/");
//     } catch (e: any) {
//       setError(e.message || "Login failed");
//     }
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <ThemedText type="title">Login</ThemedText>
      
//       <Link href="/register">
//         <ThemedText style={{ marginTop: 16, textAlign: "center" }}>
//           Don’t have an account? Create one
//         </ThemedText>
//       </Link>

//       <TextInput
//         style={styles.input}
//         placeholder="Username"
//         autoCapitalize="none"
//         value={username}
//         onChangeText={setUsername}
//       />

//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         secureTextEntry
//         value={password}
//         onChangeText={setPassword}
//       />

//       {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

//       <Pressable style={styles.button} onPress={handleLogin}>
//         <ThemedText style={styles.buttonText}>Login</ThemedText>
//       </Pressable>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     padding: 24,
//     gap: 12,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#999",
//     borderRadius: 6,
//     padding: 12,
//   },
//   button: {
//     backgroundColor: "#1D3D47",
//     padding: 14,
//     borderRadius: 6,
//     alignItems: "center",
//     marginTop: 8,
//   },
//   buttonText: {
//     color: "white",
//   },
//   error: {
//     color: "red",
//   },
// });
