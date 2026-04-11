import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChatService } from '../services/chatService';
import { Chat } from '../types/api';

const ChatManagementScreen: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await ChatService.getChats({ page: 0, size: 20 });
      setChats(response.content);
    } catch (error) {
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await ChatService.toggleChatStatus(id, !currentStatus);
      loadChats();
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const deleteChat = async (id: string) => {
    Alert.alert('Confirm', 'Delete this chat?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        try {
          await ChatService.deleteChat(id);
          loadChats();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete chat');
        }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: Chat }) => (
    <View style={styles.item}>
      <Text>{item.name} - {item.type}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => toggleStatus(item.id, item.status)}>
          <Text>{item.status ? 'Disable' : 'Enable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => deleteChat(item.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat Management</Text>
      <FlatList
        data={chats}
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

export default ChatManagementScreen;