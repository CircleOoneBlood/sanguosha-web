import { useEffect } from "react";
import { useStore } from "../store";
import { connect, getSocket } from "../network/client";
import Lobby from "./Lobby";
import Room from "./Room";
import GameTable from "./GameTable";

export default function App() {
  const { page, setPage, setCurrentRoom, setGameState, setPendingRequest } = useStore();

  useEffect(() => {
    const socket = connect();

    socket.on("room:joined", ({ room }) => {
      setCurrentRoom(room);
      setPage("room");
    });

    socket.on("game:start", () => {
      setPage("game");
    });

    socket.on("game:init", ({ state }) => {
      setGameState(state);
    });

    socket.on("game:state_sync", (state) => {
      setGameState(state);
    });

    socket.on("request:response", (req) => {
      setPendingRequest(req);
    });

    return () => {
      socket.off("room:joined");
      socket.off("game:start");
      socket.off("game:init");
      socket.off("game:state_sync");
      socket.off("request:response");
    };
  }, [setPage, setCurrentRoom, setGameState, setPendingRequest]);

  return (
    <div className="min-h-screen">
      {page === "lobby" && <Lobby />}
      {page === "room" && <Room />}
      {page === "game" && <GameTable />}
    </div>
  );
}
