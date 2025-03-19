
const { db } = require('../firebase-module');
const { collection, addDoc, query, where, getDocs } = require('firebase/firestore');

class AnalyticsService {
  async trackProxyUsage(sessionId, bytes, duration) {
    await addDoc(collection(db, 'usage_metrics'), {
      sessionId,
      bytes,
      duration,
      timestamp: serverTimestamp()
    });
  }

  async generateReport(startDate, endDate) {
    const metricsRef = collection(db, 'usage_metrics');
    const q = query(metricsRef, 
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }
}

module.exports = new AnalyticsService();
