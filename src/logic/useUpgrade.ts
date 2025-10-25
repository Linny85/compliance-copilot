import { DemoAdapter } from "../data/adapters/DemoAdapter";
import { ProdAdapter } from "../data/adapters/ProdAdapter";
import { useAppMode } from "../state/AppModeProvider";

export function useUpgrade() {
  const { switchTo } = useAppMode();
  
  return async (sessionToken: string, userId: string) => {
    const demo = new DemoAdapter();
    const prod = new ProdAdapter(sessionToken);
    const snapshot = await demo.getSnapshot();
    await prod.bulkImport(snapshot, userId);
    
    // Optional: local backup
    localStorage.setItem("norrland_demo_backup", JSON.stringify(snapshot));
    
    switchTo("prod");
  };
}
