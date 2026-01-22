// app/index.tsx or screens/LoginScreen.tsx

import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { Box } from '@/components/ui/box';
import { ButtonText, Button } from '@/components/ui/button';
import { Center } from '@/components/ui/center';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in:', userCredential.user);
      router.replace('/admin');
    } catch (err: any) {
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password');
          break;
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Center style={{ flex: 1 }}>
          <Box style={{ width: '100%', maxWidth: 400, paddingHorizontal: 24 }}>
            <VStack style={{ gap: 24 }}>
              {/* Header */}
              <VStack style={{ gap: 8, alignItems: 'center', marginBottom: 24 }}>
                <Heading style={{ fontSize: 30, color: '#2563eb' }}>
                  eLabTrack
                </Heading>
                <Text style={styles.subtitle}>
                  Laboratory Equipment Borrowing System
                </Text>
              </VStack>

              {/* Error Message */}
              {error ? (
                <Box style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </Box>
              ) : null}

              {/* Login Form */}
              <VStack style={{ gap: 16 }}>
                <VStack style={{ gap: 4 }}>
                  <Text style={styles.label}>
                    Email Address
                  </Text>
                  <Input style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 }}>
                    <InputField
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </Input>
                </VStack>

                <VStack style={{ gap: 4 }}>
                  <Text style={styles.label}>
                    Password
                  </Text>
                  <Input style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 }}>
                    <InputField
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </Input>
                </VStack>

                <Button
                  onPress={handleLogin}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  <ButtonText>
                    {loading ? 'Logging in...' : 'Login'}
                  </ButtonText>
                </Button>
              </VStack>

              {/* Footer */}
              <VStack style={{ gap: 8, alignItems: 'center', marginTop: 32 }}>
                <Text style={styles.footerText}>
                  FSMO Organization
                </Text>
                <Text style={styles.versionText}>
                  v1.0.0
                </Text>
              </VStack>
            </VStack>
          </Box>
        </Center>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  versionText: {
    fontSize: 12,
    color: '#d1d5db',
  },
});