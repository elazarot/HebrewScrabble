"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMatchUpdate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
exports.onMatchUpdate = (0, firestore_1.onDocumentUpdated)('matches/{matchId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) {
        return;
    }
    const matchId = event.params.matchId;
    // 1. Check if game transitioned from WAITING to PLAYING (Guest joined)
    const guestJoined = beforeData.status === 'WAITING' && afterData.status === 'PLAYING';
    // 2. Check if a normal turn progressed during active gameplay
    const turnProgressed = afterData.status === 'PLAYING' &&
        beforeData.status === 'PLAYING' &&
        (afterData.turnNumber > beforeData.turnNumber || afterData.currentPlayerIndex !== beforeData.currentPlayerIndex);
    if (guestJoined) {
        // Notify the host (player 0) that the guest (player 1) joined!
        const hostPlayer = afterData.players[0];
        const guestPlayer = afterData.players[1];
        const hostUid = hostPlayer?.uid || hostPlayer?.id;
        const guestName = guestPlayer?.name || 'שחקן רשת';
        if (hostUid) {
            await sendPush(hostUid, 'שבץ נא - המשחק התחיל! 🎮', `${guestName} הצטרף לחדר שלך. תורך לשחק!`, matchId);
        }
    }
    else if (turnProgressed) {
        // Notify the active player whose turn it is now
        const activePlayerIndex = afterData.currentPlayerIndex;
        const targetPlayer = afterData.players[activePlayerIndex];
        const targetUid = targetPlayer?.uid || targetPlayer?.id;
        const opponentPlayerIndex = activePlayerIndex === 0 ? 1 : 0;
        const opponentPlayer = afterData.players[opponentPlayerIndex];
        const opponentName = opponentPlayer ? opponentPlayer.name : 'שחקן רשת';
        if (targetUid) {
            const actionText = afterData.lastMove ? (afterData.lastMove.action === 'PLAY' ? `שיחק מילה: "${afterData.lastMove.word}"` :
                afterData.lastMove.action === 'PASS' ? 'עבר תור' : 'החליף אריחים') : 'שיחק מהלך';
            await sendPush(targetUid, 'שבץ נא - תורך לשחק! 🟢', `היריב ${opponentName} ${actionText}. היכנס לביצוע המהלך שלך!`, matchId);
        }
    }
});
/**
 * Fetch fcmToken from Firestore for a given uid and send a push notification
 */
async function sendPush(uid, title, body, matchId) {
    try {
        const userSnap = await admin.firestore().doc(`users/${uid}`).get();
        if (!userSnap.exists) {
            console.log(`No user document found for uid: ${uid}`);
            return;
        }
        const fcmToken = userSnap.data()?.fcmToken;
        if (!fcmToken) {
            console.log(`No fcmToken registered for user uid: ${uid}`);
            return;
        }
        const message = {
            notification: {
                title,
                body
            },
            data: {
                matchId
            },
            token: fcmToken
        };
        const response = await admin.messaging().send(message);
        console.log(`Successfully sent push notification to uid: ${uid}. Response:`, response);
    }
    catch (error) {
        console.error(`Error sending push notification to uid: ${uid}:`, error);
    }
}
//# sourceMappingURL=index.js.map