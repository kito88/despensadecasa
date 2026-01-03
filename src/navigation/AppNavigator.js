import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ScannerScreen from '../screens/ScannerScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ houseId }) {
  return (
    <Stack.Navigator 
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#27ae60' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Home" options={{ title: 'Minha Despensa' }}>
        {(props) => <HomeScreen {...props} houseId={houseId} />}
      </Stack.Screen>
      
      <Stack.Screen name="Scanner" options={{ title: 'Escanear Produto' }}>
        {(props) => <ScannerScreen {...props} houseId={houseId} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}