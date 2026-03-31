import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "../lib/constants";

function toSockJsEndpoint(baseUrl) {
  if (baseUrl.startsWith("https://")) {
    return `${baseUrl}/ws`;
  }

  if (baseUrl.startsWith("http://")) {
    return `${baseUrl}/ws`;
  }

  if (baseUrl.startsWith("wss://")) {
    return `${baseUrl.replace("wss://", "https://")}/ws`;
  }

  if (baseUrl.startsWith("ws://")) {
    return `${baseUrl.replace("ws://", "http://")}/ws`;
  }

  return `${window.location.origin}/ws`;
}

export function useRealtimeChannel({ enabled, token, destination, onEvent }) {
  const [state, setState] = useState("idle");
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !token || !destination) {
      setState("idle");
      return undefined;
    }

    let active = true;
    let stompClient;

    async function connect() {
      setState("connecting");

      try {
        const [{ Client }, sockJsModule] = await Promise.all([
          import("@stomp/stompjs"),
          import("sockjs-client/dist/sockjs")
        ]);
        if (!active) {
          return;
        }

        const SockJS = sockJsModule.default;
        stompClient = new Client({
          webSocketFactory: () => new SockJS(toSockJsEndpoint(WS_BASE_URL)),
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          debug: () => {},
          reconnectDelay: 5000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          connectionTimeout: 15000,
          onConnect: () => {
            setState("connected");
            stompClient.subscribe(destination, (message) => {
              try {
                handlerRef.current?.(JSON.parse(message.body));
              } catch {
              }
            });
          },
          onStompError: () => {
            setState("error");
          },
          onWebSocketError: () => {
            setState("reconnecting");
          },
          onWebSocketClose: () => {
            setState("reconnecting");
          }
        });

        stompClient.activate();
      } catch {
        setState("error");
      }
    }

    connect();

    return () => {
      active = false;
      setState("idle");
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [destination, enabled, token]);

  return state;
}
