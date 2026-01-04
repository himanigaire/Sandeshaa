import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";
import { apiPost } from "../src/api";
import { ensureIdentityKeypair, getIdentityPublicKeyB64 } from "../src/crypto";

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError("");
    setLoading(true);

    try {
      // 1️⃣ Generate keypair first
      await ensureIdentityKeypair();
      const identity_public_key = await getIdentityPublicKeyB64();

      console.log("🔑 Public key:", identity_public_key.substring(0, 20) + "...");

      // 2️⃣ Register with REAL public key
      await apiPost("/register", {
        username,
        password,
        identity_public_key,
        prekey_public: identity_public_key,
      });

      // 3️⃣ Login immediately
      const login = await apiPost("/login", { username, password });

      // 4️⃣ Save token
      await SecureStore.setItemAsync("access_token", login.access_token);

      console.log("✅ REGISTER + LOGIN SUCCESS");

      // 5️⃣ Go to home
      router.replace("/");
    } catch (e: any) {
      console.error("❌ Registration error:", e);
      setError(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Register</ThemedText>

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
        onPress={handleRegister}
        disabled={loading}
      >
        <ThemedText style={styles.buttonText}>
          {loading ? "Creating Account..." : "Create Account"}
        </ThemedText>
      </Pressable>

      <Link href="/login">
        <ThemedText style={{ marginTop: 16, textAlign: "center" }}>
          Already have an account? Login
        </ThemedText>
      </Link>
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

// import { ThemedText } from "@/components/themed-text";
// import { ThemedView } from "@/components/themed-view";
// import { Link } from "expo-router";
// import { apiPost } from "../src/api";

// export default function RegisterScreen() {
//   const router = useRouter();

//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");

//   async function handleRegister() {
//     setError("");

//     try {
//       // 1️⃣ Register
//       await apiPost("/register", {
//         username,
//         password,
//         identity_public_key: "mobile_identity_key_placeholder",
//         prekey_public: "mobile_prekey_placeholder",
//       });

//       // 2️⃣ Login immediately
//       const login = await apiPost("/login", { username, password });

//       // 3️⃣ Save token
//       await SecureStore.setItemAsync("access_token", login.access_token);

//       console.log("REGISTER + LOGIN SUCCESS");

//       // 4️⃣ Go to home
//       router.replace("/");
//     } catch (e: any) {
//       setError(e.message || "Registration failed");
//     }
//   }

//   return (
//     <ThemedView style={styles.container}>
//       <ThemedText type="title">Register</ThemedText>

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

//       <Pressable style={styles.button} onPress={handleRegister}>
//         <ThemedText style={styles.buttonText}>Create Account</ThemedText>
//         <Link href="/login">
//           <ThemedText style={{ marginTop: 16, textAlign: "center" }}>
//             Already have an account? Login
//           </ThemedText>
//         </Link>
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
