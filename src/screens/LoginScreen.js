import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';

export default function LoginScreen({ onLogin }) {
  const [sigla, setSigla] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Despensa de Casa</Text>
      <TextInput 
        style={styles.input}
        placeholder="Digite a Sigla da Casa (ex: JOAO2026)"
        value={sigla}
        onChangeText={setSigla}
        autoCapitalize="characters"
      />
      <Button title="Entrar na Instância" onPress={() => onLogin(sigla)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 20 }
});