import '../global.css';
import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import UserManagementScreen from './screens/UserManagementScreen';
import ChatManagementScreen from './screens/ChatManagementScreen';
import SocialManagementScreen from './screens/SocialManagementScreen';
import MessageManagementScreen from './screens/MessageManagementScreen';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Loading app...</Text>
      </View>
    );

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="ChatManagement" component={ChatManagementScreen} />
            <Stack.Screen name="SocialManagement" component={SocialManagementScreen} />
            <Stack.Screen name="MessageManagement" component={MessageManagementScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
