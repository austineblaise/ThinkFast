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

  const medal = (index: number) => {
    if (index === 0)
      return <FaTrophy className="text-yellow-400 text-xl drop-shadow-sm" />;
    if (index === 1) return <FaMedal className="text-gray-300 text-xl" />;
    if (index === 2) return <FaMedal className="text-orange-400 text-xl" />;
    return (
      <span className="text-sm font-semibold text-purple-300">{index + 1}</span>
    );
  };

  return (
    <div className="min-h-screen py-6 px-4 bg-[#17111F]">
      {/* Go Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-purple-300 hover:text-purple-500 mb-6"
        aria-label="Go back"
      >
        <FaArrowLeft />
        <span>Back</span>
      </button>

      <h2 className="text-xl sm:text-4xl font-extrabold text-center text-purple-300 mb-10 tracking-tight">
        <span className="inline-block align-middle mr-2">🏆</span>
        <span className="align-middle">Daily Brain Blast Rankings</span>
      </h2>

      {loading ? (
        <p className="text-center text-purple-300">Loading...</p>
      ) : (
        <div className="overflow-x-auto max-w-4xl mx-auto rounded-xl shadow-xl bg-[#201B2C]">
          <table className="w-full table-auto border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-[#2A233B]">
                <th className="p-3 text-left text-sm font-semibold text-purple-300">
                  #
                </th>
                <th className="p-3 text-left text-sm font-semibold text-purple-300">
                  User
                </th>
                <th className="p-3 text-left text-sm font-semibold text-purple-300">
                  Address
                </th>
                <th className="p-3 text-left text-sm font-semibold text-purple-300">
                  Score
                </th>
                <th className="p-3 text-left text-sm font-semibold text-purple-300">
                  CELO Won
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr
                  key={user.address + index}
                  className="bg-[#241F35] hover:bg-[#30294A] transition rounded-lg"
                >
                  <td className="p-3 text-purple-200 text-sm font-semibold text-center">
                    {medal(index)}
                  </td>
                  <td className="p-3 flex items-center gap-3 text-purple-100 text-sm">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.username}
                        className="w-9 h-9 rounded-full border border-purple-400 object-cover"
                      />
                    ) : (
                      <div
                        className="w-12 h-9 rounded-full border border-purple-400 bg-purple-700 flex items-center justify-center text-white font-bold uppercase text-xs"
                        title={user.username}
                      >
                        {user.username?.charAt(0) || <FaUserCircle />}
                      </div>
                    )}
                    <span className="font-medium truncate max-w-[120px]">
                      {user.username}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-purple-300 text-sm">
                    {truncateAddress(user.address)}
                  </td>
                  <td className="p-3 font-bold text-green-400 text-base">
                    {user.score}
                  </td>
                  <td className="p-3 font-semibold text-yellow-300 text-sm">
                    {getRewardForScore(user.score)} CELO
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <p className="p-4 text-center text-purple-400">
              No leaderboard data available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}