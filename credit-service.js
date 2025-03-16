import { getFirestore, doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { app } from './firebase-config.js';

const db = getFirestore(app);

/**
 * Safely deduct credits from a user using Firestore transactions
 * 
 * @param {string} userId User ID
 * @param {number} amount Credits to deduct
 * @param {string} reason Reason for deduction
 * @returns {Promise<Object>} Result of the transaction
 */
export async function deductCredits(userId, amount, reason) {
  if (!userId || amount <= 0) {
    return { success: false, message: "Invalid parameters" };
  }
  
  try {
    // Use a transaction for reliability
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      const currentCredits = userData.credits || 0;
      
      if (currentCredits < amount) {
        throw new Error("Insufficient credits");
      }
      
      // Update the balance
      transaction.update(userRef, {
        credits: currentCredits - amount,
        lastCreditUpdate: new Date().toISOString()
      });
      
      // Add transaction record
      const transactionRef = doc(db, "creditTransactions", Date.now().toString());
      transaction.set(transactionRef, {
        userId: userId,
        type: "deduct",
        amount: amount,
        reason: reason,
        timestamp: new Date().toISOString(),
        previousBalance: currentCredits,
        newBalance: currentCredits - amount
      });
      
      return {
        success: true,
        previousCredits: currentCredits,
        newCredits: currentCredits - amount
      };
    });
    
    return result;
  } catch (error) {
    console.error("Error deducting credits:", error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Safely add credits to a user using Firestore transactions
 */
export async function addCredits(userId, amount, reason) {
  if (!userId || amount <= 0) {
    return { success: false, message: "Invalid parameters" };
  }
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const userRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      const currentCredits = userData.credits || 0;
      
      // Update the balance
      transaction.update(userRef, {
        credits: currentCredits + amount,
        lastCreditUpdate: new Date().toISOString()
      });
      
      // Add transaction record
      const transactionRef = doc(db, "creditTransactions", Date.now().toString());
      transaction.set(transactionRef, {
        userId: userId,
        type: "add",
        amount: amount,
        reason: reason,
        timestamp: new Date().toISOString(),
        previousBalance: currentCredits,
        newBalance: currentCredits + amount
      });
      
      return {
        success: true,
        previousCredits: currentCredits,
        newCredits: currentCredits + amount
      };
    });
    
    return result;
  } catch (error) {
    console.error("Error adding credits:", error);
    return {
      success: false,
      message: error.message
    };
  }
} 