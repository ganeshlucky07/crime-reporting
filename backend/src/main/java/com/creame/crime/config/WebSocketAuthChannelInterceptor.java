package com.creame.crime.config;

import com.creame.crime.security.CustomUserDetailsService;
import com.creame.crime.security.JwtService;
import com.creame.crime.security.UserPrincipal;
import java.util.List;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    public WebSocketAuthChannelInterceptor(
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService
    ) {
        this.jwtService = jwtService;
        this.customUserDetailsService = customUserDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String token = extractToken(accessor);
        if (token == null || token.isBlank()) {
            return message;
        }

        String username = jwtService.extractUsername(token);
        UserPrincipal principal = (UserPrincipal) customUserDetailsService.loadUserByUsername(username);
        if (!jwtService.isTokenValid(token, principal)) {
            throw new IllegalArgumentException("Invalid WebSocket token");
        }

        accessor.setUser(principal);
        return message;
    }

    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authorizationHeaders = accessor.getNativeHeader("Authorization");
        if (authorizationHeaders == null || authorizationHeaders.isEmpty()) {
            return null;
        }

        String header = authorizationHeaders.get(0);
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }

        return header.substring(7);
    }
}
