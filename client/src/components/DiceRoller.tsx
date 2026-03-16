import { useState } from "react";

type DiceResponse = {
  roll: number;
};

export default function DiceRoller() {
  const [roll, setRoll] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const rollDice = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dice");

      const data: DiceResponse = await res.json();

      setRoll(data.roll);
    } catch (err) {
      console.error("Failed to roll dice:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold text-gray-800">🎲 Dice Roller</h1>

      <div className="flex items-center justify-center w-32 h-32 text-5xl font-bold bg-white border rounded-xl shadow">
        {roll ?? "-"}
      </div>

      <button
        onClick={rollDice}
        disabled={loading}
        className="px-6 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Rolling..." : "Roll Dice"}
      </button>
    </div>
  );
}
