


// lib/saveScoreToFirestore.ts
// lib/firestore.ts
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase"; // make sure this exports your initialized Firestore instance

interface ScoreData {
  username: string;
  address: string;
  score: number;
  profilePic: string;
}



export const saveScoreToFirestore = async ({
  username,
  address,
  score,
  profilePic,
}: ScoreData) => {
  console.log("Inside saveScoreToFirestore with:", { username, address, score, profilePic });
  try {
    const userRef = doc(db, "scores", address);
    await setDoc(userRef, {
      username,
      address,
      score,
      profilePic,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("Error saving score to Firestore:", err);
  }
};


// export const saveScoreToFirestore = async ({
//   username,
//   address,
//   score,
//   profilePic,
// }: ScoreData) => {
//   try {
//     const userRef = doc(db, "scores", address);
//     const docSnap = await getDoc(userRef);

//     if (docSnap.exists()) {
//       const existingScore = docSnap.data()?.score || 0;

//       // ✅ only update if new score is higher
//       if (score > existingScore) {
//         await setDoc(userRef, {
//           username,
//           address,
//           score,
//           profilePic,
//           updatedAt: new Date(),
//         });
//       }
//     } else {
//       // New user, just create
//       await setDoc(userRef, {
//         username,
//         address,
//         score,
//         profilePic,
//         updatedAt: new Date(),
//       });
//     }
//   } catch (err) {
//     console.error("Error saving score to Firestore:", err);
//   }
// };

