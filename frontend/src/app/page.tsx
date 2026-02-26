import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateTradeTab } from "@/components/trades/create-trade-tab";
import { TradesListTab } from "@/components/trades/trades-list-tab";
import { Chat } from "@/components/trades/chat";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Trade Journal</h1>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Trades</TabsTrigger>
            <TabsTrigger value="create">Create Trade</TabsTrigger>
            <TabsTrigger value="insights">Ask Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6">
            <TradesListTab />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <CreateTradeTab />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <Chat />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
