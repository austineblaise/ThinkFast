import { Suspense } from "react";
import QuizGame from "./QuizGame";

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="text-white p-10">Loading quiz...</div>}>
      <QuizGame />
    </Suspense>
  );
}
