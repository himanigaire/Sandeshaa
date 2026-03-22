// src/navigation/AppNavigator.tsx
// Sandeshaa Android – Navigation Setup
// Replaces: Expo Router → React Navigation Native Stack

import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View, StyleSheet} from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';

import {getToken} from '../storage';
import {apiGetAuth} from '../api';

// ---- Navigation Types ----
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Chats: undefined;
  Chat: {to: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }

      // Verify token is still valid
      await apiGetAuth('/me', token);
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Chats' : 'Login'}
        screenOptions={{
          headerStyle: {backgroundColor: '#667eea'},
          headerTintColor: '#fff',
          headerTitleStyle: {fontWeight: 'bold'},
          animation: 'slide_from_right',
        }}>
        {/* Auth screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{headerShown: false}}
        />

        {/* App screens */}
        <Stack.Screen
          name="Chats"
          component={ChatsScreen}
          options={{
            title: 'Sandeshaa',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({route}) => ({
            title: route.params.to,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
