import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { UserService } from '../services/userService';
import { Account } from '../types/api';

const UserManagementScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await UserService.getAccounts({ page: 0, size: 20 });
      setAccounts(response.content);
    } catch (error) {
      Alert.alert('Error', 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await UserService.updateAccountStatus(id, !currentStatus);
      loadAccounts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const deleteAccount = async (id: string) => {
    Alert.alert('Confirm', 'Delete this account?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        try {
          await UserService.deleteAccount(id);
          loadAccounts();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete account');
        }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: Account }) => (
    <View style={styles.item}>
      <Text>{item.username} - {item.role}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => toggleStatus(item.id, item.status)}>
          <Text>{item.status ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => deleteAccount(item.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <FlatList
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8 },
  actions: { flexDirection: 'row' },
  actionButton: { padding: 10, backgroundColor: '#28a745', marginLeft: 10, borderRadius: 5 },
  deleteButton: { backgroundColor: '#dc3545' },
  deleteText: { color: '#fff' },
});

export default UserManagementScreen;