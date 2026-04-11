import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ChatService } from '../services/chatService';
import { Message } from '../types/api';

const MessageManagementScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await ChatService.getMessages({ page: 0, size: 20 });
      setMessages(response.content);
    } catch (error) {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (id: string) => {
    Alert.alert('Confirm', 'Delete this message?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: async () => {
        try {
          await ChatService.deleteMessage(id);
          loadMessages();
        } catch (error) {
          Alert.alert('Error', 'Failed to delete message');
        }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={styles.item}>
      <Text>{item.senderId}: {item.content}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMessage(item.id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Message Management</Text>
      <FlatList
        data={messages}
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
  deleteButton: { padding: 10, backgroundColor: '#dc3545', borderRadius: 5 },
  deleteText: { color: '#fff' },
});

export default MessageManagementScreen;