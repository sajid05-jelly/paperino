import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
      <h2 className="text-xl font-semibold text-white">Loading Challenges...</h2>
      <p className="mt-2 text-gray-400">Preparing your weekly puzzles</p>
    </div>
  );
}
