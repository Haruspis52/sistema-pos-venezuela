import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error: any) {
    // If offline or permission error, log gracefully
    if (error?.message?.includes("the client is offline")) {
      console.warn("[Firebase] Cliente sin conexión a internet en este momento.");
      return false;
    }
    console.warn("[Firebase] Aviso de conexión:", error?.message);
    return true;
  }
}

export default db;
