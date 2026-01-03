import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, ImageBackground 
} from 'react-native';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [novaSigla, setNovaSigla] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  const handleLogin = async () => {
    if (!email || !senha) return Alert.alert("Erro", "Preencha e-mail e senha.");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const userRef = doc(db, "usuarios", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        navigation.replace('Home', { houseId: userSnap.data().houseId });
      }
    } catch (error) {
      Alert.alert("Erro", "E-mail ou senha inválidos.");
    } finally { setLoading(false); }
  };

  const handleCadastro = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, novoEmail, novaSenha);
      const siglaID = novaSigla.toUpperCase().trim();
      
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        houseId: siglaID,
        email: novoEmail
      });

      await setDoc(doc(db, "instancias", siglaID), { criadoEm: new Date() }, { merge: true });

      Alert.alert("Sucesso", "Conta criada!");
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Erro no cadastro", error.message);
    }
  };

  const resetarSenha = () => {
    if (!email) return Alert.alert("Atenção", "Digite seu e-mail no campo de login primeiro.");
    sendPasswordResetEmail(auth, email)
      .then(() => Alert.alert("Sucesso", "E-mail de redefinição enviado!"))
      .catch(() => Alert.alert("Erro", "E-mail não encontrado."));
  };

  return (
    <ImageBackground 
      source={require('../../assets/cartbg.png')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Despensas</Text>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={resetarSenha} style={{marginTop: 15}}>
            <Text style={styles.linkText}>Esqueceu a senha?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setModalVisible(true)} style={{marginTop: 10}}>
            <Text style={styles.linkText}>Criar nova conta (Nova Sigla)</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={modalVisible} animationType="slide" transparent={false}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Cadastrar</Text>
            <TextInput style={styles.input} placeholder="Sigla da Casa (ex: KITO)" value={novaSigla} onChangeText={setNovaSigla} autoCapitalize="characters" />
            <TextInput style={styles.input} placeholder="E-mail" value={novoEmail} onChangeText={setNovoEmail} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Senha" value={novaSenha} onChangeText={setNovaSenha} secureTextEntry />
            <TouchableOpacity style={styles.button} onPress={handleCadastro}><Text style={styles.buttonText}>Finalizar Cadastro</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 20}}><Text style={{textAlign: 'center', color: '#666'}}>Voltar</Text></TouchableOpacity>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  container: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', padding: 25 },
  modalContainer: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#007bff', textAlign: 'center', marginBottom: 30 },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, backgroundColor: '#fff' },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  linkText: { color: '#007bff', textAlign: 'center', fontWeight: '500' }
});