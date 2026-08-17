import AnalyserClient from "@/components/AnalyserClient";
import { isSaveAvailable } from "@/lib/deployment";

export default function Home() {
  return <AnalyserClient saveAvailable={isSaveAvailable()} />;
}
