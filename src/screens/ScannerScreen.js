import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { getProductData } from '../services/productService';
import * as Notifications from 'expo-notifications';
import { parse, subDays } from 'date-fns';

export default function ScannerScreen({ route, navigation }) {
  const { houseId } = route.params || { houseId: 'KITO' };
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productInfo, setProductInfo] = useState(null);
  const [validade, setValidade] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [barcode, setBarcode] = useState('');

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso à câmera.</Text>
        <Button onPress={requestPermission} title="Dar Permissão" />
      </View>
    );
  }

  const handleDateChange = (text) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length < (validade.replace(/\D/g, '').length)) {
      setValidade(text);
      return;
    }
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    if (cleaned.length > 4) formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4, 8);
    setValidade(formatted);
  };

  const agendarNotificacaoVencimento = async (nome, dataValidade) => {
    try {
      const dataVenc = parse(dataValidade, 'dd/MM/yyyy', new Date());
      const dataAlerta = subDays(dataVenc, 2);
      dataAlerta.setHours(9, 0, 0);

      if (dataAlerta > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Atenção: Produto Vencendo! ⚠️",
            body: `O item "${nome}" vence em 2 dias.`,
          },
          // CORREÇÃO DO TRIGGER PARA EXPO GO
          trigger: {
            date: dataAlerta,
          },
        });
      }
    } catch (e) { console.log("Erro ao agendar notificação:", e); }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setBarcode(data);
    try {
      const info = await getProductData(data);
      setProductInfo(info);
    } catch (error) {
      setProductInfo({ nome: "Produto Novo", marca: "Manual" });
    } finally { setLoading(false); }
  };

  const salvarItem = async () => {
    if (validade.length < 10) {
      alert("Por favor, digite a data completa (DD/MM/AAAA)");
      return;
    }
    setLoading(true);
    try {
      const itensRef = collection(db, "dispensas", houseId, "itens");
      const q = query(itensRef, where("codigo", "==", barcode), where("validade", "==", validade));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const itemExistente = querySnapshot.docs[0];
        await updateDoc(doc(db, "dispensas", houseId, "itens", itemExistente.id), {
          quantidade: itemExistente.data().quantidade + quantidade,
          status: "disponivel",
          dataUltimaAtualizacao: serverTimestamp()
        });
      } else {
        await addDoc(itensRef, {
          nome: productInfo?.nome || "Produto Novo",
          marca: productInfo?.marca || "Genérico",
          codigo: barcode,
          quantidade: quantidade,
          validade: validade,
          status: "disponivel",
          dataAdicao: serverTimestamp()
        });
      }
      await agendarNotificacaoVencimento(productInfo?.nome || "Produto", validade);
      navigation.goBack();
    } catch (error) {
      alert("Erro ao salvar.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      {!scanned ? (
        <View style={styles.cameraContainer}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a"] }}
          />
          {/* O QUADRADINHO VOLTOU */}
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer} />
            <View style={styles.unfocusedContainer} />
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <>
              <Text style={styles.labelHeader}>Produto Encontrado:</Text>
              <Text style={styles.productName}>{productInfo?.nome}</Text>
              <Text style={styles.productMarca}>{productInfo?.marca}</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Validade:</Text>
                  <TextInput style={styles.input} value={validade} onChangeText={handleDateChange} keyboardType="numeric" maxLength={10} placeholder="DD/MM/AAAA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Qtd:</Text>
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity onPress={() => setQuantidade(Math.max(1, quantidade - 1))} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>-</Text></TouchableOpacity>
                    <Text style={styles.qtyText}>{quantidade}</Text>
                    <TouchableOpacity onPress={() => setQuantidade(quantidade + 1)} style={styles.qtyBtn}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity onPress={() => setScanned(false)} style={[styles.mainBtn, {backgroundColor: '#dc3545'}]}><Text style={styles.mainBtnText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity onPress={salvarItem} style={[styles.mainBtn, {backgroundColor: '#28a745'}]}><Text style={styles.mainBtnText}>Confirmar</Text></TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  unfocusedContainer: { flex: 1, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)' },
  focusedContainer: { width: 250, height: 180, borderWidth: 2, borderColor: '#00FF00', borderRadius: 10, backgroundColor: 'transparent' },
  resultContainer: { flex: 1, backgroundColor: '#fff', padding: 25, justifyContent: 'center' },
  labelHeader: { fontSize: 14, color: '#666' },
  productName: { fontSize: 22, fontWeight: 'bold' },
  productMarca: { fontSize: 16, color: '#888', marginBottom: 20 },
  row: { flexDirection: 'row', marginBottom: 30 },
  label: { fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, textAlign: 'center', fontSize: 18 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, height: 54 },
  qtyBtn: { width: 40, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  qtyBtnText: { fontSize: 20, fontWeight: 'bold' },
  qtyText: { fontSize: 18, fontWeight: 'bold' },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  mainBtn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center' },
  mainBtnText: { color: '#fff', fontWeight: 'bold' },
});