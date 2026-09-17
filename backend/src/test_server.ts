import { io as Client } from 'socket.io-client';

async function runRBACTests() {
  console.log('--- Starting RBAC Integration Tests ---');
  const roomId = 'rbac_test_room';

  // 1. Host (Alice) joins room
  const hostClient = Client('http://localhost:3001');
  await new Promise<void>((resolve) => {
    hostClient.on('connect', () => {
      hostClient.emit('join_room', { roomId, username: 'Alice (Host)' });
    });
    hostClient.on('room_joined', (data: any) => {
      console.log('[1. Host Joined]: Role =', data.participant.role);
      if (data.participant.role !== 'Host') throw new Error('Expected Host role');
      resolve();
    });
  });

  // 2. Participant (Bob) joins room
  const participantClient = Client('http://localhost:3001');
  let bobId = '';
  await new Promise<void>((resolve) => {
    participantClient.on('connect', () => {
      bobId = participantClient.id || '';
      participantClient.emit('join_room', { roomId, username: 'Bob (Viewer)' });
    });
    participantClient.on('room_joined', (data: any) => {
      console.log('[2. Participant Joined]: Role =', data.participant.role);
      if (data.participant.role !== 'Participant') throw new Error('Expected Participant role');
      resolve();
    });
  });

  // 3. Test RBAC Rejection: Bob (Participant) attempts to change video
  await new Promise<void>((resolve) => {
    participantClient.on('action_rejected', (data: any) => {
      console.log('[3. RBAC Rejection Verified]:', data.action, '->', data.message);
      if (data.action === 'change_video') {
        resolve();
      }
    });

    participantClient.emit('change_video', { roomId, videoId: 'maliciousVideo' });
  });

  // 4. Host assigns Moderator role to Bob
  await new Promise<void>((resolve) => {
    hostClient.on('role_assigned', (data: any) => {
      console.log('[4. Role Assigned Broadcast]: User', data.username, 'is now', data.role);
      if (data.userId === bobId && data.role === 'Moderator') {
        resolve();
      }
    });

    hostClient.emit('assign_role', { roomId, userId: bobId, role: 'Moderator' });
  });

  // 5. Test Bob (now Moderator) successfully controls playback
  await new Promise<void>((resolve) => {
    hostClient.on('seek', (data: any) => {
      console.log('[5. Moderator Seek Verified]: Time =', data.currentTime, 'by', data.triggeredBy.username);
      if (data.currentTime === 99) {
        resolve();
      }
    });

    participantClient.emit('seek', { roomId, currentTime: 99 });
  });

  // 6. Test User 3 (Charlie) joins and gets removed by Host
  const charlieClient = Client('http://localhost:3001');
  let charlieId = '';
  await new Promise<void>((resolve) => {
    charlieClient.on('connect', () => {
      charlieId = charlieClient.id || '';
      charlieClient.emit('join_room', { roomId, username: 'Charlie' });
    });
    charlieClient.on('room_joined', () => {
      console.log('[6. Charlie Joined]: ID =', charlieId);
      resolve();
    });
  });

  await new Promise<void>((resolve) => {
    charlieClient.on('kicked_from_room', (data: any) => {
      console.log('[7. Target received kicked_from_room]:', data.message);
      resolve();
    });

    hostClient.emit('remove_participant', { roomId, userId: charlieId });
  });

  // Clean up
  hostClient.disconnect();
  participantClient.disconnect();
  charlieClient.disconnect();

  console.log('--- ALL RBAC TESTS COMPLETED AND VERIFIED SUCCESSFULLY! ---');
  process.exit(0);
}

runRBACTests().catch((err) => {
  console.error('RBAC Test failed:', err);
  process.exit(1);
});
