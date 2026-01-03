import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SectionList, TouchableOpacity, Alert, ImageBackground } from 'react-native';
import { db, auth } from '../config/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, deleteDoc, orderBy } from 'firebase/firestore';
import { subDays, isAfter, differenceInDays, parse } from 'date-fns';
import { signOut } from 'firebase/auth';
import * as Notifications from 'expo-notifications';

export default function HomeScreen({ navigation, houseId }) {
  const [disponiveis, setDisponiveis] = useState([]);
  const [esgotados, setEsgotados] = useState([]);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.log('Sem permissão de notificações');
    })();

    const q = query(collection(db, "dispensas", houseId, "itens"), orderBy("dataAdicao", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const disp = [];
      const esg = [];
      const dataLimite = subDays(new Date(), 30);

      querySnapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        if (item.quantidade > 0) {
          disp.push(item);
        } else {
          const dataEsg = item.dataEsgotado?.toDate() || new Date();
          if (isAfter(dataEsg, dataLimite)) esg.push(item);
        }
      });
      
      const ordenarPorVencimento = (a, b) => {
        if (!a.validade || !b.validade) return 0;
        try {
          return parse(a.validade, 'dd/MM/yyyy', new Date()) - parse(b.validade, 'dd/MM/yyyy', new Date());
        } catch (e) { return 0; }
      };

      setDisponiveis(disp.sort(ordenarPorVencimento));
      setEsgotados(esg);
    });
    return () => unsubscribe();
  }, [houseId]);

  const ajustarQuantidade = async (item, mudanca) => {
    const novaQtd = Math.max(0, (item.quantidade || 0) + mudanca);
    const itemRef = doc(db, "dispensas", houseId, "itens", item.id);
    await updateDoc(itemRef, {
      quantidade: novaQtd,
      dataEsgotado: novaQtd === 0 ? serverTimestamp() : null,
      status: novaQtd === 0 ? 'esgotado' : 'disponivel'
    });
  };

  const excluirItemPermanente = (item) => {
    Alert.alert("Excluir Permanente", `Remover "${item.nome}" do sistema?`, [
      { text: "Cancelar" },
      { text: "Excluir", style: "destructive", onPress: async () => await deleteDoc(doc(db, "dispensas", houseId, "itens", item.id)) }
    ]);
  };

  const renderItem = ({ item }) => {
    let textoVenc = "";
    let corVenc = "#666";
    if (item.validade && item.quantidade > 0) {
      try {
        const d = differenceInDays(parse(item.validade, 'dd/MM/yyyy', new Date()), new Date());
        if (d < 0) { textoVenc = "VENCIDO"; corVenc = "#dc3545"; }
        else if (d <= 2) { textoVenc = `Vence em ${d} dias!`; corVenc = "#ff8c00"; }
        else if (d <= 7) { textoVenc = `Vence em ${d} dias`; }
      } catch (e) {}
    }

    return (
      <TouchableOpacity activeOpacity={0.7} onLongPress={() => excluirItemPermanente(item)}>
        <View style={[styles.card, { borderLeftColor: item.quantidade > 0 ? corVenc : '#ccc' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nome, item.quantidade === 0 && styles.riscado]}>{item.nome}</Text>
            <Text style={styles.info}>{item.marca} | Val: {item.validade}</Text>
            {textoVenc !== "" && item.quantidade > 0 && <Text style={[styles.vencTexto, { color: corVenc }]}>{textoVenc}</Text>}
          </View>
          <View style={styles.controles}>
            <TouchableOpacity style={styles.btnMenos} onPress={() => ajustarQuantidade(item, -1)}><Text style={styles.btnText}>-</Text></TouchableOpacity>
            <Text style={styles.qtdVal}>{item.quantidade}</Text>
            <TouchableOpacity style={styles.btnMais} onPress={() => ajustarQuantidade(item, 1)}><Text style={styles.btnText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems: 'center'}}>
          <Text style={styles.headerTitle}>Minha Despensa</Text>
          <TouchableOpacity onPress={() => signOut(auth).then(() => navigation.replace('Login'))} style={styles.btnLogout}>
            <Text style={{color:'#fff', fontWeight: 'bold', fontSize: 12}}>SAIR</Text>
          </TouchableOpacity>
        </View>
        <Text style={{color:'#eee', marginTop: 5, fontSize: 14}}>Instância: {houseId}</Text>
      </View>

      <ImageBackground 
        source={require('../../assets/cart-watermark.png')} 
        style={{flex: 1}}
        imageStyle={{ opacity: 0.04, resizeMode: 'contain', top: 100 }}
      >
        <SectionList
          sections={[{ title: '📦 EM ESTOQUE', data: disponiveis }, { title: '🛒 LISTA DE COMPRAS (30 DIAS)', data: esgotados }]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </ImageBackground>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Scanner', { houseId })}><Text style={styles.fabText}>+</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4' },
  header: { backgroundColor: '#007bff', padding: 25, paddingTop: 50 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  btnLogout: { borderWidth: 1, borderColor: '#fff', padding: 6, borderRadius: 5 },
  sectionHeader: { backgroundColor: '#e9ecef', padding: 12, fontWeight: 'bold', color: '#555' },
  card: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 12, padding: 15, borderRadius: 10, flexDirection: 'row', borderLeftWidth: 6, elevation: 2 },
  nome: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  riscado: { textDecorationLine: 'line-through', color: '#999' },
  info: { fontSize: 13, color: '#666', marginTop: 2 },
  vencTexto: { fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtdVal: { fontWeight: 'bold', fontSize: 16, minWidth: 20, textAlign: 'center' },
  btnMenos: { backgroundColor: '#dc3545', width: 35, height: 35, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnMais: { backgroundColor: '#28a745', width: 35, height: 35, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#007bff', width: 65, height: 65, borderRadius: 33, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 35 }
});