"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { FaMedal, FaTrophy, FaArrowLeft, FaUserCircle } from "react-icons/fa";

type User = {
  address: string;
  username: string;
  profilePic: string;
  score: number;
};

function truncateAddress(address: string): string {
  if (!address) return "";
  return address.slice(0, 6) + "..." + address.slice(-4);
}

function getRewardForScore(score: number): number {
  return parseFloat((0.00001 * (score / 10)).toFixed(8));
}

export default function Leaderboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const leaderboardRef = collection(db, "scores");
        const q = query(leaderboardRef, orderBy("score", "desc"), limit(20));
        const querySnapshot = await getDocs(q);

        const data: User[] = querySnapshot.docs.map((doc: any) => ({
          ...(doc.data() as User),
        }));

        setUsers(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const medal = (index: number) => {
    if (index === 0)
      return <FaTrophy className="text-yellow-500 text-2xl" />;
    if (index === 1)
      return <FaMedal className="text-gray-300 text-xl" />;
    if (index === 2)
      return <FaMedal className="text-amber-600 text-xl" />;

    return (
      <span className="flex items-center justify-center w-7 h-7 mx-auto rounded-full bg-gray-200 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0C0C0F] text-gray-900 dark:text-gray-100 transition-colors">

      {/* Container */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 mt-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-green-500 transition"
          >
            <div className="p-2 rounded-full bg-gray-200 dark:bg-gray-800">
              <FaArrowLeft className="text-sm" />
            </div>
            <span className="text-sm font-medium">Back to Quiz</span>
          </button>

          <div className="text-right">
            <h1 className="text-3xl font-bold text-green-500">Leaderboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Top performing players
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl shadow-xl bg-white dark:bg-[#141418] border border-gray-200 dark:border-gray-800">
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#1A1A21] text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                    <th className="py-4 px-4 text-center w-16">Rank</th>
                    <th className="py-4 px-4">Player</th>
                    <th className="py-4 px-4 hidden sm:table-cell">Wallet</th>
                    <th className="py-4 px-4 text-right">Score</th>
                    <th className="py-4 px-4 text-right">Reward</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.address + index}
                      className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1D1D25] transition"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 text-center">
                        {medal(index)}
                      </td>

                      {/* Player info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {user.profilePic ? (
                            <img
                              src={user.profilePic}
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <FaUserCircle className="text-4xl text-gray-400" />
                          )}

                          <div>
                            <p className="font-semibold text-sm">
                              {user.username || "Anonymous"}
                            </p>

                            <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                              {truncateAddress(user.address)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Address desktop only */}
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400">
                          {truncateAddress(user.address)}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold">{user.score}</span>
                      </td>

                      {/* Reward */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono text-green-500 font-medium">
                          +{getRewardForScore(user.score)}
                        </span>
                        <span className="text-[10px] ml-1 text-gray-500 uppercase">
                          CELO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                  No records found
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { db } from "@/lib/firebase";
// import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
// import { FaMedal, FaTrophy, FaArrowLeft, FaUserCircle } from "react-icons/fa";

// type User = {
//   address: string;
//   username: string;
//   profilePic: string;
//   score: number;
// };

// function truncateAddress(address: string): string {
//   if (!address) return "";
//   return address.slice(0, 6) + "..." + address.slice(-4);
// }

// function getRewardForScore(score: number): number {
//   return parseFloat((0.00001 * (score / 10)).toFixed(8));
// }

// export default function Leaderboard() {
//   const router = useRouter();
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchLeaderboard = async () => {
//       try {
//         const leaderboardRef = collection(db, "scores");
//         const q = query(leaderboardRef, orderBy("score", "desc"), limit(20));
//         const querySnapshot = await getDocs(q);

//         const data: User[] = querySnapshot.docs.map((doc: any) => ({
//           ...(doc.data() as User),
//         }));

//         console.log("Fetched leaderboard data:", data);
//         setUsers(data);
//       } catch (error) {
//         console.error("Error fetching leaderboard:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchLeaderboard();
//   }, []);

//   const medal = (index: number) => {
//     if (index === 0)
//       return <FaTrophy className="text-yellow-400 text-xl drop-shadow-sm" />;
//     if (index === 1) return <FaMedal className="text-gray-300 text-xl" />;
//     if (index === 2) return <FaMedal className="text-orange-400 text-xl" />;
//     return (
//       <span className="text-sm font-semibold text-purple-300">{index + 1}</span>
//     );
//   };

//   return (
//     <div className="min-h-screen py-6 px-4 bg-[#17111F]">
//       {/* Go Back */}
//       <button
//         onClick={() => router.back()}
//         className="flex items-center gap-2 text-purple-300 hover:text-purple-500 mb-6"
//         aria-label="Go back"
//       >
//         <FaArrowLeft />
//         <span>Back</span>
//       </button>

//       <h2 className="text-xl sm:text-4xl font-extrabold text-center text-purple-300 mb-10 tracking-tight">
//         <span className="inline-block align-middle mr-2">🏆</span>
//         <span className="align-middle">Daily Brain Blast Rankings</span>
//       </h2>

//       {loading ? (
//         <p className="text-center text-purple-300">Loading...</p>
//       ) : (
//         <div className="overflow-x-auto max-w-4xl mx-auto rounded-xl shadow-xl bg-[#201B2C]">
//           <table className="w-full table-auto border-separate border-spacing-y-2">
//             <thead>
//               <tr className="bg-[#2A233B]">
//                 <th className="p-3 text-left text-sm font-semibold text-purple-300">
//                   #
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-purple-300">
//                   User
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-purple-300">
//                   Address
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-purple-300">
//                   Score
//                 </th>
//                 <th className="p-3 text-left text-sm font-semibold text-purple-300">
//                   CELO Won
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {users.map((user, index) => (
//                 <tr
//                   key={user.address + index}
//                   className="bg-[#241F35] hover:bg-[#30294A] transition rounded-lg"
//                 >
//                   <td className="p-3 text-purple-200 text-sm font-semibold text-center">
//                     {medal(index)}
//                   </td>
//                   <td className="p-3 flex items-center gap-3 text-purple-100 text-sm">
//                     {user.profilePic ? (
//                       <img
//                         src={user.profilePic}
//                         alt={user.username}
//                         className="w-9 h-9 rounded-full border border-purple-400 object-cover"
//                       />
//                     ) : (
//                       <div
//                         className="w-12 h-9 rounded-full border border-purple-400 bg-purple-700 flex items-center justify-center text-white font-bold uppercase text-xs"
//                         title={user.username}
//                       >
//                         {user.username?.charAt(0) || <FaUserCircle />}
//                       </div>
//                     )}
//                     <span className="font-medium truncate max-w-[120px]">
//                       {user.username}
//                     </span>
//                   </td>
//                   <td className="p-3 font-mono text-purple-300 text-sm">
//                     {truncateAddress(user.address)}
//                   </td>
//                   <td className="p-3 font-bold text-green-400 text-base">
//                     {user.score}
//                   </td>
//                   <td className="p-3 font-semibold text-yellow-300 text-sm">
//                     {getRewardForScore(user.score)} CELO
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {users.length === 0 && (
//             <p className="p-4 text-center text-purple-400">
//               No leaderboard data available.
//             </p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }