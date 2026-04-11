import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SocialService } from '../services/socialService';
import { FriendRequest, Friendship, Block } from '../types/api';

const SocialManagementScreen: React.FC = () => {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [frRes, fRes, bRes] = await Promise.all([
        SocialService.getFriendRequests({ page: 0, size: 10 }),
        SocialService.getFriendships(),
        SocialService.getBlocks({ page: 0, size: 10 })
      ]);
      setFriendRequests(frRes.content);
      setFriendships(fRes);
      setBlocks(bRes.content);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const deleteFriendRequest = async (id: string) => {
    try {
      await SocialService.deleteFriendRequest(id);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete friend request');
    }
  };

  const deleteFriendship = async (id: string) => {
    try {
      await SocialService.deleteFriendship(id);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete friendship');
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      await SocialService.deleteBlock(id);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete block');
    }
  };

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social Management</Text>
      <Text style={styles.sectionTitle}>Friend Requests</Text>
      <FlatList
        data={friendRequests}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.senderId} → {item.receiverId} ({item.status})</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFriendRequest(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <Text style={styles.sectionTitle}>Friendships</Text>
      <FlatList
        data={friendships}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.firstUserId} ↔ {item.secondUserId}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteFriendship(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <Text style={styles.sectionTitle}>Blocks</Text>
      <FlatList
        data={blocks}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.blockerId} blocked {item.blockedId}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteBlock(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  item: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8 },
  deleteButton: { padding: 10, backgroundColor: '#dc3545', borderRadius: 5 },
  deleteText: { color: '#fff' },
});

export default SocialManagementScreen;