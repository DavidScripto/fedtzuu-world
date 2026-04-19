import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import UnderConstruction from "@/pages/under-construction";
import AdminConsole from "@/pages/admin-console";
import Register from "@/pages/register";
import Login from "@/pages/login";
import World from "@/pages/world";
import { HumanAuthProvider } from "@/hooks/use-human-auth";
function Router() {
  return (
    <Switch>
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/world" component={World} />
      <Route path="/zkr-admin/agents"><Redirect to="/zkr-admin" /></Route>
      <Route path="/zkr-admin/dialogues"><Redirect to="/zkr-admin" /></Route>
      <Route path="/zkr-admin/proposals"><Redirect to="/zkr-admin" /></Route>
      <Route path="/zkr-admin/words"><Redirect to="/zkr-admin" /></Route>
      <Route path="/zkr-admin" component={AdminConsole} />
      <Route component={UnderConstruction} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HumanAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </HumanAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
