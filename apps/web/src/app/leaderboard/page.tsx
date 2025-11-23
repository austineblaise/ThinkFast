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

        console.log("Fetched leaderboard data:", data);
        setUsers(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Updated medal logic with better styling wrappers
  const medal = (index: number) => {
    if (index === 0)
      return (
        <div className="flex justify-center">
          <FaTrophy className="text-yellow-400 text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
        </div>
      );
    if (index === 1)
      return (
        <div className="flex justify-center">
           <FaMedal className="text-gray-300 text-lg" />
        </div>
      );
    if (index === 2)
      return (
        <div className="flex justify-center">
           <FaMedal className="text-amber-600 text-lg" />
        </div>
      );
    return (
      <span className="flex items-center justify-center w-6 h-6 mx-auto rounded-full bg-zinc-800 text-xs font-mono text-zinc-400">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-purple-500/30">
      
      {/* Decorative Background Blob */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 py-8 sm:py-12">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium w-fit"
            aria-label="Go back"
          >
            <div className="p-2 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
               <FaArrowLeft className="text-xs" />
            </div>
            <span>Back to Quiz</span>
          </button>

          <div className="text-right hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tight text-white">Global Leaderboard</h1>
            <p className="text-zinc-500 text-sm">Top performing players this season</p>
          </div>
        </div>

        {/* Mobile Title (Visible only on small screens) */}
        <div className="sm:hidden mb-6">
           <h1 className="text-2xl font-bold tracking-tight text-white">Global Leaderboard</h1>
           <p className="text-zinc-500 text-sm">Top performing players this season</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
             <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
             <p className="text-zinc-500 text-sm animate-pulse">Syncing data...</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="py-4 px-4 text-center w-16 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Rank
                    </th>
                    <th className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Player
                    </th>
                    <th className="py-4 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 hidden sm:table-cell">
                      Wallet
                    </th>
                    <th className="py-4 px-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Score
                    </th>
                    <th className="py-4 px-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Reward
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {users.map((user, index) => (
                    <tr
                      key={user.address + index}
                      className={`group transition-colors duration-200 hover:bg-zinc-800/40 ${index < 3 ? 'bg-purple-500/[0.02]' : ''}`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4">
                        {medal(index)}
                      </td>

                      {/* User Info */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {user.profilePic ? (
                              <img
                                src={user.profilePic}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-zinc-700"
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 ring-2 ring-zinc-800 group-hover:ring-zinc-700"
                              >
                                <FaUserCircle className="text-xl" />
                              </div>
                            )}
                            {/* Online/Status Indicator for aesthetics */}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors">
                               {user.username || "Anonymous"}
                            </span>
                            {/* Show address on mobile here instead of separate column */}
                            <span className="text-[10px] text-zinc-500 font-mono sm:hidden">
                              {truncateAddress(user.address)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Address (Desktop) */}
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className="px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 group-hover:border-zinc-700 transition-colors">
                          {truncateAddress(user.address)}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 text-right">
                        <span className="font-mono text-sm font-bold text-white">
                          {user.score}
                        </span>
                        <span className="text-xs text-zinc-500 ml-1">pts</span>
                      </td>

                      {/* Reward */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-emerald-400 font-mono">
                            +{getRewardForScore(user.score)}
                          </span>
                          <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                            CELO
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 text-sm">No records found yet.</p>
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